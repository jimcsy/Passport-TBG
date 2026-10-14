import { prisma } from "../prisma";
import { DevelopmentPath, MilestoneStatus, DEVELOPMENT_PATHS } from "@/lib/types/models";

export interface EnrichedMilestone {
  id: string;
  code: string;
  title: string;
  description: string;
  path: DevelopmentPath;
  orderIndex: number;
  status: MilestoneStatus;
  progressId?: string;
  traineeNote?: string | null;
  requestedAt?: Date | null;
  verifiedAt?: Date | null;
  trainerName?: string | null;
  trainerEmployeeId?: string | null;
  trainerNote?: string | null;
}

export interface PathProgressSummary {
  path: DevelopmentPath;
  title: string;
  description: string;
  color: string;
  total: number;
  verified: number;
  percent: number;
  milestones: EnrichedMilestone[];
}

export interface TraineePassportViewData {
  trainee: {
    id: string;
    traineeCode: string;
    fullName: string;
    email: string;
    restaurantBrand: string;
    branchLocation: string;
    cohortBatch: string;
    hireDate: Date;
  };
  stats: {
    totalMilestones: number;
    verifiedCount: number;
    readyForReviewCount: number;
    overallPercent: number;
  };
  paths: PathProgressSummary[];
}

export async function getTraineePassportData(
  traineeId: string
): Promise<TraineePassportViewData | null> {
  const trainee = await prisma.trainee.findUnique({
    where: { id: traineeId },
    include: {
      progressRecords: {
        include: {
          planNode: true,
          verifier: {
            select: {
              fullName: true,
              employeeId: true,
            },
          },
        },
      },
    },
  });

  if (!trainee) return null;

  const milestoneDefs = await prisma.milestoneDefinition.findMany({
    orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
  });

  const progressMap = new Map(
    trainee.progressRecords.map((p) => [
      p.planNode?.libraryMilestoneId || p.planNodeId,
      p,
    ])
  );

  const pathKeys = [
    DevelopmentPath.ONBOARDING,
    DevelopmentPath.COMMUNICATION,
    DevelopmentPath.TECHNICAL,
    DevelopmentPath.CULTURE,
    DevelopmentPath.LEADERSHIP,
  ];

  let totalVerified = 0;
  let totalReadyForReview = 0;

  const paths: PathProgressSummary[] = pathKeys.map((pathKey) => {
    const meta = DEVELOPMENT_PATHS[pathKey];
    const pathMilestones = milestoneDefs
      .filter((m) => m.path === pathKey)
      .map((m): EnrichedMilestone => {
        const prog = progressMap.get(m.id);
        const status = (prog?.status as MilestoneStatus) || MilestoneStatus.IN_PROGRESS;

        if (status === MilestoneStatus.VERIFIED) totalVerified++;
        if (status === MilestoneStatus.READY_FOR_REVIEW) totalReadyForReview++;

        return {
          id: m.id,
          code: m.code,
          title: m.title,
          description: m.description,
          path: pathKey,
          orderIndex: m.orderIndex,
          status,
          progressId: prog?.id,
          traineeNote: prog?.traineeNote,
          requestedAt: prog?.requestedAt,
          verifiedAt: prog?.verifiedAt,
          trainerName: prog?.verifier?.fullName,
          trainerEmployeeId: prog?.verifier?.employeeId,
          trainerNote: prog?.trainerNote,
        };
      });

    const verifiedInPath = pathMilestones.filter(
      (m) => m.status === MilestoneStatus.VERIFIED
    ).length;
    const totalInPath = pathMilestones.length;
    const percent = totalInPath > 0 ? Math.round((verifiedInPath / totalInPath) * 100) : 0;

    return {
      path: pathKey,
      title: meta.title,
      description: meta.description,
      color: meta.color,
      total: totalInPath,
      verified: verifiedInPath,
      percent,
      milestones: pathMilestones,
    };
  });

  const totalMilestones = milestoneDefs.length;
  const overallPercent =
    totalMilestones > 0 ? Math.round((totalVerified / totalMilestones) * 100) : 0;

  return {
    trainee: {
      id: trainee.id,
      traineeCode: trainee.traineeCode,
      fullName: trainee.fullName,
      email: trainee.email,
      restaurantBrand: trainee.restaurantBrand,
      branchLocation: trainee.branchLocation,
      cohortBatch: trainee.cohortBatch,
      hireDate: trainee.hireDate,
    },
    stats: {
      totalMilestones,
      verifiedCount: totalVerified,
      readyForReviewCount: totalReadyForReview,
      overallPercent,
    },
    paths,
  };
}
