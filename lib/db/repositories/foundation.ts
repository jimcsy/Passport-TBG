import { ensureMasterPath } from "../services/learning-paths";
import type { PrismaClient } from "@prisma/client";
import { FOUNDATION_MILESTONES, FOUNDATION_PILLARS, FOUNDATION_PLAN_ID, FOUNDATION_PLAN_TITLE, FOUNDATION_ROLE } from "@/lib/constants/foundation";
import { resolveStampDesign } from "@/lib/stamps/catalog";

/** Seed only missing records. Never rewrite published snapshots, custom drafts, assignments or stamps. */
export async function seedFoundationPlan(db: PrismaClient, trainerId: string) {
  return db.$transaction(async tx => {
    const existing = await tx.trainingPlan.findUnique({ where: { id: FOUNDATION_PLAN_ID } });
    if (existing) { await ensureMasterPath(tx); return existing; }
    const nodes = [];
    for (const module of FOUNDATION_MILESTONES) {
      const definition = await tx.milestoneDefinition.upsert({
        where: { code: module.code }, update: {}, create: { ...module, isStandard: true },
      });
      nodes.push({ ...module, libraryMilestoneId: definition.id, stampDesign: resolveStampDesign(undefined, module.path), posX: 0, posY: 0, isCustom: false });
    }
    await tx.trainingPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    const plan = await tx.trainingPlan.create({ data: {
      id: FOUNDATION_PLAN_ID, title: FOUNDATION_PLAN_TITLE, roleIdentifier: FOUNDATION_ROLE,
      description: "Universal five-pillar foundation for every TBG department and position. Trainers may append role-specific modules through versioned drafts.",
      isDefault: true, status: "PUBLISHED", createdById: trainerId,
      versions: { create: { versionNumber: 1, status: "PUBLISHED", publishedById: trainerId,
        pathTitles: Object.fromEntries(FOUNDATION_PILLARS.map(pillar => [pillar.path, pillar.title])),
        changelog: "Initial universal foundation: five pillars with four modules each.", nodes: { create: nodes },
      } },
    } });
    await ensureMasterPath(tx);
    return plan;
  }, { timeout: 60_000 });
}
