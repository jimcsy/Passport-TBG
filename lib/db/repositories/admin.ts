import { prisma } from "../prisma";
import { MilestoneStatus, DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

export interface ReviewQueueItem {
  id: string;
  traineeId: string;
  milestoneId: string;
  status: MilestoneStatus;
  traineeNote: string | null;
  requestedAt: Date | null;
  trainee: {
    id: string;
    traineeCode: string;
    fullName: string;
    email: string;
    restaurantBrand: string;
    branchLocation: string;
    cohortBatch: string;
  };
  milestone: {
    id: string;
    code: string;
    title: string;
    description: string;
    path: DevelopmentPath;
    orderIndex: number;
  };
}

export async function getReviewQueueItems(): Promise<ReviewQueueItem[]> {
  const items = await prisma.traineeProgress.findMany({
    where: {
      status: MilestoneStatus.READY_FOR_REVIEW,
    },
    include: {
      trainee: {
        select: {
          id: true,
          traineeCode: true,
          fullName: true,
          email: true,
          restaurantBrand: true,
          branchLocation: true,
          cohortBatch: true,
        },
      },
      milestone: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          path: true,
          orderIndex: true,
        },
      },
    },
    orderBy: {
      requestedAt: "asc",
    },
  });

  return items.map((item) => ({
    id: item.id,
    traineeId: item.traineeId,
    milestoneId: item.milestoneId,
    status: item.status as MilestoneStatus,
    traineeNote: item.traineeNote,
    requestedAt: item.requestedAt,
    trainee: item.trainee,
    milestone: {
      ...item.milestone,
      path: item.milestone.path as DevelopmentPath,
    },
  }));
}

export interface TraineeDirectoryItem {
  id: string;
  traineeCode: string;
  fullName: string;
  email: string;
  restaurantBrand: string;
  branchLocation: string;
  cohortBatch: string;
  hireDate: Date;
  verifiedCount: number;
  readyForReviewCount: number;
  totalMilestones: number;
  progressPercent: number;
}

export async function getTraineeDirectory(filters?: {
  brand?: string;
  branch?: string;
  cohort?: string;
  query?: string;
}): Promise<TraineeDirectoryItem[]> {
  const whereClause: Record<string, unknown> = {};

  if (filters?.brand && filters.brand !== "ALL") {
    whereClause.restaurantBrand = filters.brand;
  }
  if (filters?.branch && filters.branch !== "ALL") {
    whereClause.branchLocation = filters.branch;
  }
  if (filters?.cohort && filters.cohort !== "ALL") {
    whereClause.cohortBatch = filters.cohort;
  }
  if (filters?.query) {
    whereClause.OR = [
      { fullName: { contains: filters.query } },
      { traineeCode: { contains: filters.query } },
      { email: { contains: filters.query } },
    ];
  }

  const [trainees, totalMilestoneCount] = await Promise.all([
    prisma.trainee.findMany({
      where: whereClause,
      include: {
        progressRecords: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.milestoneDefinition.count(),
  ]);

  return trainees.map((t) => {
    const verifiedCount = t.progressRecords.filter(
      (p) => p.status === MilestoneStatus.VERIFIED
    ).length;
    const readyForReviewCount = t.progressRecords.filter(
      (p) => p.status === MilestoneStatus.READY_FOR_REVIEW
    ).length;
    const progressPercent =
      totalMilestoneCount > 0
        ? Math.round((verifiedCount / totalMilestoneCount) * 100)
        : 0;

    return {
      id: t.id,
      traineeCode: t.traineeCode,
      fullName: t.fullName,
      email: t.email,
      restaurantBrand: t.restaurantBrand,
      branchLocation: t.branchLocation,
      cohortBatch: t.cohortBatch,
      hireDate: t.hireDate,
      verifiedCount,
      readyForReviewCount,
      totalMilestones: totalMilestoneCount,
      progressPercent,
    };
  });
}
