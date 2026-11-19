import type { EnrichedMilestone, PathProgressSummary } from "@/lib/db/repositories/trainee";
import type { MilestoneStatus } from "@/lib/types/models";

export const STATUS_LABEL: Record<MilestoneStatus, string> = {
  VERIFIED: "Verified",
  READY_FOR_REVIEW: "In review",
  IN_PROGRESS: "In progress",
  LOCKED: "Not started",
};

export const shortDate = (value?: Date | string | null) => value
  ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(value))
  : "";

export const pathNumber = (index: number) => String(index + 1).padStart(2, "0");

export const moduleHref = (id: string) => `/trainee/dashboard/modules/${id}`;

export const ordered = (milestones: EnrichedMilestone[]) => [...milestones].sort((a, b) => a.orderIndex - b.orderIndex);

export interface LocatedMilestone {
  milestone: EnrichedMilestone;
  path: PathProgressSummary;
  pathIndex: number;
}

/** Flattens milestones in curriculum order (path order, then module order). */
export function locate(paths: PathProgressSummary[]): LocatedMilestone[] {
  return paths.flatMap((path, pathIndex) => ordered(path.milestones).map(milestone => ({ milestone, path, pathIndex })));
}

export function countStatuses(paths: PathProgressSummary[]) {
  const counts: Record<MilestoneStatus, number> = { VERIFIED: 0, READY_FOR_REVIEW: 0, IN_PROGRESS: 0, LOCKED: 0 };
  paths.forEach(path => path.milestones.forEach(milestone => { counts[milestone.status]++; }));
  return counts;
}

/** The module the trainee should resume: in progress first, then not started, then awaiting review. */
export function pickUp(all: LocatedMilestone[]) {
  return all.find(item => item.milestone.status === "IN_PROGRESS")
    ?? all.find(item => item.milestone.status === "LOCKED")
    ?? all.find(item => item.milestone.status === "READY_FOR_REVIEW");
}
