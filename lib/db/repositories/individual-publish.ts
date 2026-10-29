import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { IndividualPublishSchema, type IndividualPublishInput, type IndividualPublishPreview, type PublishImpact } from "@/lib/validations/individual-publish";
import { VariantMetadataSchema } from "@/lib/validations/learning-paths";
import { mergePathGraph, pathEdgeKeys, type EditableGraph } from "@/lib/plans/merge";
import { readPathTitles } from "@/lib/plans/paths";
import { computePlanVersionDiff, matchPlanNodes } from "@/lib/canvas/diff";
import { SavePlanVersionSchema, type PlanNodeInput, type PlanEdgeInput } from "@/lib/validations/plans";
import { savePlanVersion, publishPlanVersion } from "./plans";
import { createInstanceForVersion, ensureMasterPath } from "../services/learning-paths";

export class IndividualPublishError extends Error {}
const graphInclude = { nodes: { orderBy: { id: "asc" as const } }, edges: { orderBy: { id: "asc" as const } } };
type VersionGraph = Prisma.PlanVersionGetPayload<{ include: typeof graphInclude }>;
function toGraph(version: VersionGraph): EditableGraph {
  return { pathTitles: readPathTitles(version.pathTitles), nodes: version.nodes.map(node => ({
    id: node.id, code: node.code, title: node.title, description: node.description, path: node.path as PlanNodeInput["path"], orderIndex: node.orderIndex,
    stampDesign: node.stampDesign, isCustom: node.isCustom, libraryMilestoneId: node.libraryMilestoneId, posX: node.posX, posY: node.posY,
  })), edges: version.edges.map(edge => ({ sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, edgeType: edge.edgeType as PlanEdgeInput["edgeType"] })) };
}
async function sourceContext(planId: string, db: Prisma.TransactionClient) {
  const path = await db.learningPath.findUnique({ where: { planId }, include: { parent: { include: { plan: true } }, trainee: true, plan: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1, include: graphInclude } } } } });
  if (!path || path.type !== "INSTANCE" || !path.trainee || path.plan.status === "ARCHIVED") throw new IndividualPublishError("Open the trainee's active individual path to publish these changes.");
  const assignment = await db.traineePlanAssignment.findFirst({ where: { traineeId: path.trainee.id, status: "ACTIVE", planVersion: { planId } }, include: { planVersion: { include: graphInclude } } });
  if (!assignment) throw new IndividualPublishError("This instance is no longer the trainee's active path. Reload their profile.");
  return { path, assignment };
}
async function enrollments(variantId: string, db: Prisma.TransactionClient) {
  return db.traineePlanAssignment.findMany({ where: { status: "ACTIVE", planVersion: { plan: { learningPath: { OR: [{ id: variantId, type: "VARIANT" }, { parentId: variantId, type: "INSTANCE" }] } } } },
    orderBy: [{ traineeId: "asc" }, { assignedAt: "desc" }], include: { trainee: true, planVersion: { include: { ...graphInclude, plan: { include: { learningPath: true, versions: { orderBy: { versionNumber: "desc" }, take: 1, include: graphInclude } } } } } },
  });
}
export async function getIndividualPublishContext(planId: string, db: PrismaClient = prisma) {
  const { path } = await sourceContext(planId, db);
  const shared = path.parent?.type === "VARIANT" && path.parent.plan.status !== "ARCHIVED" ? path.parent : null;
  const rows = shared ? await enrollments(shared.id, db) : [];
  const unique = new Map(rows.filter(row => row.planVersion.plan.learningPath?.type !== "INSTANCE" || row.planVersion.plan.learningPath.traineeId === row.traineeId).map(row => [row.traineeId, { id: row.traineeId, name: row.trainee.fullName }]));
  return { traineeId: path.trainee!.id, traineeName: path.trainee!.fullName, department: path.trainee!.department || "", position: path.trainee!.position || "", variantTitle: shared?.title || path.title,
    sharedAvailable: !!shared, enrolledTrainees: Array.from(unique.values()), enrolledCount: unique.size };
}
function changes(oldGraph: EditableGraph, nextGraph: EditableGraph) {
  const diff = computePlanVersionDiff(oldGraph.nodes, nextGraph.nodes, oldGraph.pathTitles, nextGraph.pathTitles);
  const matches = matchPlanNodes(oldGraph.nodes, nextGraph.nodes);
  const updated = Array.from(matches).filter(([old, next]) => ["code", "title", "description", "path", "stampDesign"].some(field => (old as unknown as Record<string, unknown>)[field] !== (next as unknown as Record<string, unknown>)[field])).map(([, next]) => `${next.code}: ${next.title}`);
  const oldEdges = pathEdgeKeys(oldGraph), newEdges = pathEdgeKeys(nextGraph);
  return { added: diff.addedMilestones.map(node => `${node.code}: ${node.title}`), removed: diff.removedMilestones.map(node => `${node.code}: ${node.title}`), updated, reordered: diff.reorderedMilestones.map(node => node.code),
    renamedPaths: diff.renamedPaths.map(path => `${path.oldPath} → ${path.newPath}`),
    edgesAdded: Array.from(newEdges).filter(edge => !oldEdges.has(edge)).length, edgesRemoved: Array.from(oldEdges).filter(edge => !newEdges.has(edge)).length };

}
async function prepare(raw: IndividualPublishInput, db: Prisma.TransactionClient) {
  const input = IndividualPublishSchema.parse(raw);
  const source = await sourceContext(input.planId, db);
  const owner = source.path.trainee!;
  let metadata: ReturnType<typeof VariantMetadataSchema.parse> | undefined;
  if (input.scope === "new_variant") metadata = VariantMetadataSchema.parse({ title: input.variantTitle, targetDepartment: input.department, targetPosition: input.position });
  const targets: { traineeId: string; name: string; planId: string; graph: EditableGraph; assignmentId: string; currentVersionId: string; conflicts: string[]; legacy: boolean }[] = [{
    traineeId: owner.id, name: owner.fullName, planId: input.planId, graph: input.graph, assignmentId: source.assignment.id, currentVersionId: source.assignment.planVersionId, conflicts: [], legacy: false,
  }];
  const fingerprint: unknown[] = [input, source.path, source.assignment];
  let variant: { id: string; planId: string; graph: EditableGraph; conflicts: string[]; current: VersionGraph } | undefined;
  if (input.scope === "shared_variant") {
    const parent = source.path.parent;
    if (!parent || parent.type !== "VARIANT" || parent.plan.status === "ARCHIVED") throw new IndividualPublishError("This instance has no available shared role variant. Choose individual changes or create a new variant.");
    const selected = new Set(input.selectedTraineeIds);
    if (!selected.has(owner.id)) throw new IndividualPublishError("Include the trainee whose individual path you are editing.");
    const sharedVersions = await db.planVersion.findMany({ where: { planId: parent.planId }, orderBy: { versionNumber: "desc" }, include: graphInclude });
    const current = sharedVersions.find(version => version.status === "PUBLISHED");
    if (!current || sharedVersions.some(version => version.status === "DRAFT")) throw new IndividualPublishError("The shared variant must be published with no unfinished draft before distributing changes.");
    const baseline = source.path.sourceVersionId ? await db.planVersion.findUnique({ where: { id: source.path.sourceVersionId }, include: graphInclude }) : null;
    if (!baseline || baseline.planId !== parent.planId) throw new IndividualPublishError("The source variant snapshot is unavailable. Create a new reusable variant instead.");
    const merged = mergePathGraph(toGraph(baseline), input.graph, toGraph(current));
    variant = { id: parent.id, planId: parent.planId, graph: merged.graph, conflicts: merged.conflicts, current };
    // The editing trainee also receives newer shared additions they have not seen yet,
    // while their submitted individual edits remain the local side of the merge.
    const sourceMerged = mergePathGraph(toGraph(baseline), variant.graph, input.graph);
    targets[0].graph = sourceMerged.graph; targets[0].conflicts = sourceMerged.conflicts;
    const rows = await enrollments(parent.id, db);
    const seen = new Set<string>();
    for (const row of rows.filter(row => selected.has(row.traineeId))) {
      if (seen.has(row.traineeId)) throw new IndividualPublishError("A selected trainee has multiple active assignments. Resolve these before publishing.");
      seen.add(row.traineeId); fingerprint.push(row);
      if (row.traineeId === owner.id) continue;
      const targetPath = row.planVersion.plan.learningPath;
      if (!targetPath || (targetPath.type === "INSTANCE" && targetPath.traineeId !== row.traineeId)) throw new IndividualPublishError("A selected instance has changed owners. Refresh the preview.");
      if (targetPath.type === "INSTANCE" && row.planVersion.plan.versions.some(version => version.status === "DRAFT")) throw new IndividualPublishError(`${row.trainee.fullName} has an unfinished individual draft. Publish it first or deselect this trainee.`);
      const base = targetPath.type === "VARIANT" ? row.planVersion : targetPath.sourceVersionId ? await db.planVersion.findUnique({ where: { id: targetPath.sourceVersionId }, include: graphInclude }) : null;
      if (!base || base.planId !== parent.planId) throw new IndividualPublishError(`${row.trainee.fullName}'s original variant snapshot is unavailable. Deselect this trainee.`);
      const result = mergePathGraph(toGraph(base), variant.graph, toGraph(row.planVersion));
      targets.push({ traineeId: row.traineeId, name: row.trainee.fullName, planId: row.planVersion.planId, assignmentId: row.id, currentVersionId: row.planVersionId, graph: result.graph, conflicts: result.conflicts, legacy: targetPath.type !== "INSTANCE" });
    }
    if (seen.size !== selected.size) throw new IndividualPublishError("A selected trainee is no longer enrolled in this variant. Refresh the preview.");
    fingerprint.push(sharedVersions, baseline, rows.map(row => [row.id, row.traineeId]));
  }
  if (variant) SavePlanVersionSchema.parse({ ...variant.graph, planId: variant.planId, publishedById: "preview", status: "DRAFT" });
  for (const target of targets) SavePlanVersionSchema.parse({ ...target.graph, planId: target.planId, publishedById: "preview", status: "DRAFT" });
  const impacts: PublishImpact[] = [];
  for (const target of targets) {
    const version = await db.planVersion.findUniqueOrThrow({ where: { id: target.currentVersionId }, include: graphInclude });
    const progress = await db.traineeProgress.findMany({ where: { traineeId: target.traineeId }, orderBy: { id: "asc" } });
    fingerprint.push(version, progress);
    const summary = changes(toGraph(version), target.graph);
    const matches = matchPlanNodes(toGraph(version).nodes, target.graph.nodes);
    const removedIds = version.nodes.filter(node => !Array.from(matches.keys()).some(old => old.id === node.id)).map(node => node.id);
    impacts.push({ ...summary, traineeId: target.traineeId, name: target.name, archivedProgress: progress.filter(record => !record.isArchived && removedIds.includes(record.planNodeId)).length, conflicts: target.conflicts });
  }
  const token = createHash("sha256").update(JSON.stringify(fingerprint)).digest("hex");
  const preview: IndividualPublishPreview = { token, scope: input.scope, impacts, variantConflicts: variant?.conflicts || [], variantSummary: variant ? changes(toGraph(variant.current), variant.graph) : undefined };
  return { input, source, targets, variant, metadata, preview };
}
export async function previewIndividualPublish(input: IndividualPublishInput, db: PrismaClient = prisma) {
  return db.$transaction(async tx => (await prepare(input, tx)).preview, { timeout: 60_000 });
}

/** Commit only the exact reviewed scope; publication, snapshots and reconciliation roll back together. */
export async function commitIndividualPublish(input: IndividualPublishInput, previewToken: string, authorId: string, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const initial = await prepare(input, tx);
    const traineeIds = initial.targets.map(target => target.traineeId).sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Trainee" WHERE "id" IN (${Prisma.join(traineeIds)}) ORDER BY "id" FOR UPDATE`);
    const planIds = Array.from(new Set([input.planId, ...initial.targets.map(target => target.planId), ...(initial.variant ? [initial.variant.planId] : [])])).sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "TrainingPlan" WHERE "id" IN (${Prisma.join(planIds)}) ORDER BY "id" FOR UPDATE`);
    const state = await prepare(input, tx);
    if (state.preview.token !== previewToken) throw new IndividualPublishError("The plan, enrollment or progress changed after your preview. Review a fresh preview before publishing.");
    const publishGraph = async (planId: string, graph: EditableGraph) => {
      const saved = await savePlanVersion({ ...graph, planId, publishedById: authorId, status: "DRAFT", changelog: state.input.changelog || "Published after scope and impact review" }, tx);
      await publishPlanVersion({ versionId: saved.id, syncTrainees: false }, authorId, tx);
      return saved;
    };
    let catalogVersion: Awaited<ReturnType<typeof publishGraph>> | undefined;
    let newVariantId: string | undefined;
    if (state.variant) catalogVersion = await publishGraph(state.variant.planId, state.variant.graph);
    if (state.input.scope === "new_variant") {
      const master = await ensureMasterPath(tx);
      const metadata = state.metadata!;
      const plan = await tx.trainingPlan.create({ data: { title: metadata.title, roleIdentifier: "ROLE_VARIANT", createdById: authorId, status: "DRAFT" } });
      await tx.learningPath.create({ data: { id: plan.id, planId: plan.id, type: "VARIANT", parentId: master.id, ...metadata } });
      catalogVersion = await publishGraph(plan.id, state.input.graph); newVariantId = plan.id;
    }
    // Source trainee is mandatory; other trainees are always explicitly selected and previewed.
    for (const target of state.targets) {
      let planId = target.planId;
      if (target.legacy) planId = (await createInstanceForVersion(tx, target.traineeId, target.currentVersionId, authorId, true)).planId;
      const version = await publishGraph(planId, target.graph);
      const { reconcileTraineeToPlanVersion } = await import("../services/reconcile");
      await reconcileTraineeToPlanVersion(target.traineeId, version.id, authorId, tx);
      if (newVariantId) await tx.trainingPlan.update({ where: { id: planId }, data: { title: state.metadata!.title } });
      if (catalogVersion) await tx.learningPath.update({ where: { planId }, data: { sourceVersionId: catalogVersion.id, ...(newVariantId ? { parentId: newVariantId, title: state.metadata!.title } : {}) } });
    }
    return { updatedTraineeCount: state.targets.length, newVariantId, variantUpdated: !!state.variant };
  }, { timeout: 120_000 });
}
