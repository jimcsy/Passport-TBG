import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { milestoneLibraryFiltersSchema, type MilestoneLibraryFilters } from "@/lib/validations/milestones";

/** Counts are distinct within each bucket; buckets may overlap (e.g. a plan has draft and history). */
export async function listMilestoneLibrary(filters: MilestoneLibraryFilters = {}, db: PrismaClient = prisma) {
  const parsed = milestoneLibraryFiltersSchema.parse(filters);
  return db.$transaction(async tx => {
    const definitions = await tx.milestoneDefinition.findMany({
      where: {
        ...(parsed.path ? { path: parsed.path } : {}),
        ...(parsed.origin === "ALL" ? {} : { isStandard: parsed.origin === "STANDARD" }),
        ...(parsed.search ? { OR: ["code", "title"].map(field => ({ [field]: { contains: parsed.search, mode: "insensitive" } })) } : {}),
      },
      select: { id: true, code: true, title: true, description: true, path: true, isStandard: true, orderIndex: true,
        _count: { select: { materials: true } } },
      orderBy: [{ isStandard: "desc" }, { path: "asc" }, { orderIndex: "asc" }, { code: "asc" }],
    });
    if (!definitions.length) return [];
    // Include the legacy code match even when a custom draft node points elsewhere:
    // this is precisely the OR predicate used by shared metadata updates.
    const nodes = await tx.planNode.findMany({
      where: { OR: [{ libraryMilestoneId: { in: definitions.map(d => d.id) } }, { code: { in: definitions.map(d => d.code) }, isCustom: true }] },
      select: { id: true, code: true, isCustom: true, libraryMilestoneId: true, planVersionId: true },
    });
    const versions = await tx.planVersion.findMany({
      where: { plan: { versions: { some: { id: { in: nodes.map(n => n.planVersionId) } } } } },
      select: { id: true, versionNumber: true, status: true, planId: true,
        assignments: { where: { status: "ACTIVE" }, select: { traineeId: true } },
        plan: { select: { title: true, status: true, learningPath: { select: { type: true } } } } },
    });
    const byVersion = new Map(versions.map(v => [v.id, v]));
    const latest = new Map<string, number>();
    for (const v of versions) if (v.status === "PUBLISHED") latest.set(v.planId, Math.max(latest.get(v.planId) || 0, v.versionNumber));
    return definitions.map(({ _count, ...definition }) => {
      const current = new Map<string, { planId: string; title: string; type: string; draft: boolean; published: boolean }>();
      const historical = new Set<string>(), privateInstances = new Set<string>(), legacyPlans = new Set<string>();
      const historicalVersions = new Set<string>(), trainees = new Set<string>();
      let affectedDraftNodes = 0, codeFallbackDraftNodes = 0;
      const affectedDraftPlans = new Set<string>();
      for (const node of nodes) {
        const linked = node.libraryMilestoneId === definition.id;
        const fallback = node.isCustom && node.code === definition.code;
        if (!linked && !fallback) continue;
        const version = byVersion.get(node.planVersionId)!;
        if (!definition.isStandard && version.status === "DRAFT") {
          affectedDraftNodes++; affectedDraftPlans.add(version.planId);
          if (!linked && fallback) codeFallbackDraftNodes++;
        }
        // A code fallback predicts metadata synchronization, not shared-material access.
        if (!linked) continue;
        for (const assignment of version.assignments) trainees.add(assignment.traineeId);
        const type = version.plan.learningPath?.type;
        if (type === "INSTANCE") { privateInstances.add(version.planId); continue; }
        if (!type) { legacyPlans.add(version.planId); continue; }
        const isDraft = version.status === "DRAFT" && version.plan.status !== "ARCHIVED";
        const isPublished = version.status === "PUBLISHED" && version.versionNumber === latest.get(version.planId) && version.plan.status !== "ARCHIVED";
        if (isDraft || isPublished) {
          const reference = current.get(version.planId) || { planId: version.planId, title: version.plan.title, type, draft: false, published: false };
          reference.draft ||= isDraft; reference.published ||= isPublished; current.set(version.planId, reference);
        } else { historical.add(version.planId); historicalVersions.add(version.id); }
      }
      return { ...definition, materialCount: _count.materials, usage: {
        reusablePlanCount: current.size, reusablePlans: Array.from(current.values()).sort((a, b) => a.planId.localeCompare(b.planId)),
        historicalReusablePlanCount: historical.size, historicalVersionCount: historicalVersions.size,
        privateInstanceCount: privateInstances.size, unclassifiedPlanCount: legacyPlans.size,
        activeTraineeCount: trainees.size, materialAffectedActiveTraineeCount: trainees.size,
        metadataAffectedDraftNodeCount: affectedDraftNodes, metadataAffectedDraftPlanCount: affectedDraftPlans.size,
        metadataCodeFallbackDraftNodeCount: codeFallbackDraftNodes,
      } };
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export type MilestoneLibraryRow = Awaited<ReturnType<typeof listMilestoneLibrary>>[number];
