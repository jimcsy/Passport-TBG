export interface CohortHeatmapData {
  brand: string;
  cohort: string;
  avgCompletionPct: number;
  traineeCount: number;
}

export interface CohortTrainee {
  restaurantBrand: string;
  cohortBatch: string;
  planAssignments: { planVersion: { nodes: { id: string }[] } }[];
  progressRecords: { planNodeId: string; status: string; isArchived: boolean }[];
}

export function aggregateCohortProgress(trainees: CohortTrainee[]): CohortHeatmapData[] {
  const groups = new Map<string, { brand: string; cohort: string; total: number; count: number }>();
  for (const trainee of trainees) {
    const assignment = trainee.planAssignments[0];
    if (!assignment) continue;
    const nodeIds = new Set(assignment.planVersion.nodes.map(node => node.id));
    const verified = new Set(trainee.progressRecords.filter(progress =>
      !progress.isArchived && progress.status === "VERIFIED" && nodeIds.has(progress.planNodeId)
    ).map(progress => progress.planNodeId)).size;
    const key = JSON.stringify([trainee.restaurantBrand, trainee.cohortBatch]);
    const group = groups.get(key) ?? { brand: trainee.restaurantBrand, cohort: trainee.cohortBatch, total: 0, count: 0 };
    group.total += nodeIds.size ? verified / nodeIds.size * 100 : 0;
    group.count++;
    groups.set(key, group);
  }
  return Array.from(groups.values()).map(group => ({ brand: group.brand, cohort: group.cohort,
    avgCompletionPct: Math.round(group.total / group.count), traineeCount: group.count,
  })).sort((a, b) => a.brand.localeCompare(b.brand) || a.cohort.localeCompare(b.cohort));
}

export function cohortDirectoryHref(brand: string, cohort: string) {
  return `/trainer/trainees?${new URLSearchParams({ brand, cohort })}`;
}
