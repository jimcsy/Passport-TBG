import { matchPlanNodes } from "@/lib/canvas/diff";
import type { PlanNodeInput, PlanEdgeInput } from "@/lib/validations/plans";
import { pathTitle, type PathTitles } from "./paths";
import { DevelopmentPath } from "@/lib/types/models";

export interface EditableGraph { nodes: PlanNodeInput[]; edges: PlanEdgeInput[]; pathTitles?: PathTitles }
const fields = ["code", "title", "description", "path", "orderIndex", "stampDesign", "isCustom", "libraryMilestoneId"] as const;
const equal = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
const sameNode = (a: PlanNodeInput, b: PlanNodeInput) => fields.every(field => equal(a[field], b[field]));

export function pathEdgeKeys(graph: EditableGraph) {
    const byId = new Map(graph.nodes.flatMap(node => [[node.id || node.code, node.code], [node.code, node.code]]));
    return new Set(graph.edges.flatMap(edge => {
      const source = byId.get(edge.sourceNodeId), target = byId.get(edge.targetNodeId);
      return source && target ? [JSON.stringify([source, target, edge.edgeType])] : [];
    }));
  }

/** Three-way merge: shared changes apply only where the recipient has not customized that value. */
export function mergePathGraph(base: EditableGraph, proposed: EditableGraph, current: EditableGraph) {
  const conflicts: string[] = [];
  const desired = matchPlanNodes(base.nodes, proposed.nodes);
  const local = matchPlanNodes(base.nodes, current.nodes);
  const customizedOrder = new Set<string>();
  const inherited = new Set(local.values());
  for (const node of current.nodes) if (!inherited.has(node)) customizedOrder.add(node.path);
  for (const [old, existing] of Array.from(local)) if (old.orderIndex !== existing.orderIndex || old.path !== existing.path) customizedOrder.add(existing.path);
  const output = current.nodes.map(node => ({ ...node }));
  const replacements = new Map<PlanNodeInput, PlanNodeInput>();
  const baseEdges = pathEdgeKeys(base), currentEdges = pathEdgeKeys(current);
  for (const original of base.nodes) {
    const next = desired.get(original), existing = local.get(original);
    if (!existing) {
      if (next && !sameNode(original, next)) conflicts.push(`${original.code}: individual removal retained`);
      continue;
    }
    const index = current.nodes.indexOf(existing);
    if (!next) {
      const customConnection = Array.from(currentEdges).some(key => !baseEdges.has(key) && (JSON.parse(key) as string[]).slice(0, 2).includes(existing.code));
      if (sameNode(original, existing) && !customConnection) output[index] = null as unknown as PlanNodeInput;
      else conflicts.push(`${existing.code}: customized milestone retained instead of removing it`);
      continue;
    }
    const updated = output[index];
    for (const field of fields) {
      if (equal(original[field], next[field])) continue;
      if (field === "orderIndex" && customizedOrder.has(existing.path) && existing.orderIndex !== next.orderIndex) {
        conflicts.push(`${existing.code}: individual milestone order retained`); continue;
      }
      if (equal(existing[field], original[field]) || equal(existing[field], next[field])) {
        Object.assign(updated, { [field]: next[field] });
      } else conflicts.push(`${existing.code}: individual ${field} retained`);
    }
    replacements.set(existing, updated);
  }
  const retained = new Set(desired.values());
  for (const addition of proposed.nodes.filter(node => !retained.has(node))) {
    const duplicate = output.filter(Boolean).find(node => node.code.toUpperCase() === addition.code.toUpperCase() || (addition.libraryMilestoneId && node.libraryMilestoneId === addition.libraryMilestoneId));
    if (duplicate) { if (!sameNode(duplicate, addition)) conflicts.push(`${addition.code}: existing individual milestone retained`); continue; }
    const orderIndex = customizedOrder.has(addition.path) ? Math.max(0, ...output.filter(Boolean).filter(node => node.path === addition.path).map(node => node.orderIndex)) + 1 : addition.orderIndex;
    if (orderIndex !== addition.orderIndex) conflicts.push(`${addition.code}: shared milestone appended to preserve the individual sequence`);
    output.push({ ...addition, orderIndex, id: `shared-${addition.code}` });
  }
  const nodes = output.filter(Boolean);
  // Keep current edges unless removed in the shared definition; express endpoints by final node code.
  const oldEdges = pathEdgeKeys(base), nextEdges = pathEdgeKeys(proposed), edges = pathEdgeKeys(current);
  for (const edge of Array.from(oldEdges)) if (!nextEdges.has(edge)) edges.delete(edge);
  for (const edge of Array.from(nextEdges)) if (!oldEdges.has(edge)) edges.add(edge);
  // Translate renamed identities into final codes before filtering removed nodes.
  const codeMap = new Map<string, string>();
  for (const [original, existing] of Array.from(local)) { const final = replacements.get(existing) || existing; codeMap.set(original.code, final.code); codeMap.set(existing.code, final.code); const next = desired.get(original); if (next) codeMap.set(next.code, final.code); }
  const codes = new Set(nodes.map(node => node.code));
  const finalEdges: PlanEdgeInput[] = [];
  const seen = new Set<string>();
  for (const key of Array.from(edges)) {
    const [source, target, edgeType] = JSON.parse(key) as [string, string, PlanEdgeInput["edgeType"]];
    const sourceCode = codeMap.get(source) || source, targetCode = codeMap.get(target) || target;
    const normalized = JSON.stringify([sourceCode, targetCode, edgeType]);
    if (codes.has(sourceCode) && codes.has(targetCode) && !seen.has(normalized)) { finalEdges.push({ sourceNodeId: sourceCode, targetNodeId: targetCode, edgeType }); seen.add(normalized); }
  }
  const pathTitles = { ...current.pathTitles };
  for (const path of Object.values(DevelopmentPath)) {
    const oldTitle = pathTitle(path, base.pathTitles), nextTitle = pathTitle(path, proposed.pathTitles), currentTitle = pathTitle(path, current.pathTitles);
    if (oldTitle === nextTitle) continue;
    if (currentTitle === oldTitle || currentTitle === nextTitle) pathTitles[path] = nextTitle;
    else conflicts.push(`${currentTitle}: individual path name retained`);
  }
  return { graph: { nodes, edges: finalEdges, pathTitles }, conflicts };
}
