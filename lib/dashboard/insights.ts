import { FOUNDATION_PILLARS } from "@/lib/constants/foundation";
import { aggregateCohortProgress, type CohortTrainee } from "./cohorts";

export interface InsightTrainee extends CohortTrainee {
  createdAt: Date;
  contentView: { firstViewedAt: Date } | null;
  planAssignments: { planVersion: { nodes: { id: string; path: string }[] } }[];
  progressRecords: { planNodeId: string; status: string; isArchived: boolean; requestedAt: Date | null }[];
}
export interface EngagementDay { date: string; registered: number; viewed: number }
export const manilaDay = (date: Date) => new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function summarizeHub(trainees: InsightTrainee[], now = new Date()) {
  const pillars = FOUNDATION_PILLARS.map(pillar => ({ path: pillar.path, title: pillar.title, verified: 0, total: 0, learners: 0 }));
  let assigned = 0, verified = 0, total = 0;
  for (const trainee of trainees) {
    const assignment = trainee.planAssignments[0];
    if (!assignment) continue;
    assigned++;
    const completed = new Set(trainee.progressRecords.filter(row => !row.isArchived && row.status === "VERIFIED").map(row => row.planNodeId));
    for (const pillar of pillars) {
      const nodes = assignment.planVersion.nodes.filter(node => node.path === pillar.path);
      const count = nodes.filter(node => completed.has(node.id)).length;
      pillar.total += nodes.length; pillar.verified += count;
      if (count) pillar.learners++;
    }
    total += assignment.planVersion.nodes.length;
    verified += assignment.planVersion.nodes.filter(node => completed.has(node.id)).length;
  }
  // Match the existing queue's non-archived READY_FOR_REVIEW scope.
  const pending = trainees.flatMap(trainee => trainee.progressRecords.filter(row => !row.isArchived && row.status === "READY_FOR_REVIEW"));
  const requests = pending.flatMap(row => row.requestedAt ? [row.requestedAt.getTime()] : []);
  const oldestReviewDays = requests.length ? Math.max(0, Math.floor((now.getTime() - Math.min(...requests)) / 86400000)) : 0;
  const today = manilaDay(now);
  const midnight = new Date(`${today}T00:00:00+08:00`);
  const series: EngagementDay[] = Array.from({ length: 90 }, (_, index) => {
    const date = manilaDay(new Date(midnight.getTime() - (89 - index) * 86400000));
    return { date, registered: trainees.filter(trainee => manilaDay(trainee.createdAt) <= date).length,
      viewed: trainees.filter(trainee => trainee.contentView && manilaDay(trainee.contentView.firstViewedAt) <= date).length };
  });
  return { registered: trainees.length, assigned, unassigned: trainees.length - assigned,
    viewers: trainees.filter(trainee => trainee.contentView).length,
    pendingReviews: pending.length, oldestReviewDays, verified, total,
    completionPercent: total ? Math.round(verified / total * 100) : 0,
    pillars, series, cohorts: aggregateCohortProgress(trainees) };
}

export type HubInsights = ReturnType<typeof summarizeHub> & { milestones: number; materials: number };
