import { pathTitle, type PathTitles } from "@/lib/plans/paths";
import { DevelopmentPath } from "@/lib/types/models";
export interface PlanNodeData {
  code: string; title: string; path: string; orderIndex: number; libraryMilestoneId?: string | null; hasProgress?: boolean;
}
export interface PlanVersionDiff {
  renamedPaths: { oldPath: string; newPath: string; nodeCount: number }[];
  addedMilestones: { code: string; title: string; path: string }[];
  removedMilestones: { code: string; title: string; path: string; hasProgress: boolean }[];
  reorderedMilestones: { code: string; title: string; oldIndex: number; newIndex: number }[];
}
/** Shared identity rules: code first, library identity second, never path or position. */
export function matchPlanNodes<T extends PlanNodeData>(oldNodes: T[], newNodes: T[]) {
  const matches = new Map<T, T>();
  const used = new Set<T>();
  for (const old of oldNodes) {
    const match = newNodes.find(node => !used.has(node) && node.code.toUpperCase() === old.code.toUpperCase());
    if (match) { matches.set(old, match); used.add(match); }
  }
  for (const old of oldNodes) {
    if (matches.has(old) || !old.libraryMilestoneId) continue;
    const match = newNodes.find(node => !used.has(node) && node.libraryMilestoneId === old.libraryMilestoneId);
    if (match) { matches.set(old, match); used.add(match); }
  }
  return matches;
}
export function computePlanVersionDiff(oldNodes: PlanNodeData[], newNodes: PlanNodeData[], oldTitles: PathTitles = {}, newTitles: PathTitles = {}): PlanVersionDiff {
  const matches = matchPlanNodes(oldNodes, newNodes);
  const retained = new Set(matches.values());
  return {
    renamedPaths: Object.values(DevelopmentPath).filter(path => pathTitle(path, oldTitles) !== pathTitle(path, newTitles)).map(path => ({ oldPath: pathTitle(path, oldTitles), newPath: pathTitle(path, newTitles), nodeCount: newNodes.filter(node => node.path === path).length })),
    addedMilestones: newNodes.filter(node => !retained.has(node)).map(node => ({ code: node.code, title: node.title, path: node.path })),
    removedMilestones: oldNodes.filter(node => !matches.has(node)).map(node => ({ code: node.code, title: node.title, path: node.path, hasProgress: !!node.hasProgress })),
    reorderedMilestones: Array.from(matches.entries()).filter(([old, next]) => old.orderIndex !== next.orderIndex).map(([old, next]) => ({ code: next.code, title: next.title, oldIndex: old.orderIndex, newIndex: next.orderIndex })),
  };
}
