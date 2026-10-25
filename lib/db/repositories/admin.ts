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
      isArchived: false,
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
      planNode: {
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
    milestoneId: item.planNode.id,
    status: item.status as MilestoneStatus,
    traineeNote: item.traineeNote,
    requestedAt: item.requestedAt,
    trainee: item.trainee,
    milestone: {
      ...item.planNode,
      path: item.planNode.path as DevelopmentPath,
    },
  }));
}

export interface TraineeDirectoryItem {
  id: string;
  traineeCode: string;
  fullName: string;
  email: string;
  jobRole: string | null;
  restaurantBrand: string;
  branchLocation: string;
  cohortBatch: string;
  hireDate: Date;
  verifiedCount: number;
  readyForReviewCount: number;
  totalMilestones: number;
  progressPercent: number;
  planTitle: string | null;
  planVersionNumber: number | null;
  planVersionId: string | null;
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

  const trainees = await prisma.trainee.findMany({
    where: whereClause,
    include: {
      progressRecords: {
        where: { isArchived: false },
        select: {
          status: true,
        },
      },
      planAssignments: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          planVersion: {
            include: { plan: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return trainees.map((t) => {
    const verifiedCount = t.progressRecords.filter(
      (p) => p.status === MilestoneStatus.VERIFIED
    ).length;
    const readyForReviewCount = t.progressRecords.filter(
      (p) => p.status === MilestoneStatus.READY_FOR_REVIEW
    ).length;
    const totalMilestones = t.progressRecords.length;
    const progressPercent =
      totalMilestones > 0
        ? Math.round((verifiedCount / totalMilestones) * 100)
        : 0;

    const activeAssignment = t.planAssignments[0];

    return {
      id: t.id,
      traineeCode: t.traineeCode,
      fullName: t.fullName,
      email: t.email,
      jobRole: t.jobRole,
      restaurantBrand: t.restaurantBrand,
      branchLocation: t.branchLocation,
      cohortBatch: t.cohortBatch,
      hireDate: t.hireDate,
      verifiedCount,
      readyForReviewCount,
      totalMilestones,
      progressPercent,
      planTitle: activeAssignment?.planVersion.plan.title || null,
      planVersionNumber: activeAssignment?.planVersion.versionNumber || null,
      planVersionId: activeAssignment?.planVersionId || null,
    };
  });
}

export interface BatchToolData {
  trainees: {
    id: string;
    traineeCode: string;
    fullName: string;
    restaurantBrand: string;
    branchLocation: string;
    cohortBatch: string;
  }[];
  milestones: {
    id: string;
    code: string;
    title: string;
    path: string;
    orderIndex: number;
  }[];
}

export async function getBatchToolData(): Promise<BatchToolData> {
  const [trainees, milestones] = await Promise.all([
    prisma.trainee.findMany({
      select: {
        id: true,
        traineeCode: true,
        fullName: true,
        restaurantBrand: true,
        branchLocation: true,
        cohortBatch: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.milestoneDefinition.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        path: true,
        orderIndex: true,
      },
      orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
    }),
  ]);

  return { trainees, milestones };
}
