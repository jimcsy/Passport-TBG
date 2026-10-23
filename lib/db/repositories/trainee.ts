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
  verificationHash?: string | null;
  stampDesign?: string;
  trainerName?: string | null;
  trainerEmployeeId?: string | null;
  trainerNote?: string | null;
  isArchived?: boolean;
  libraryMilestoneId?: string | null;
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

export type DynamicPathProgressSummary = PathProgressSummary;

export interface PlanMetadata {
  id: string;
  title: string;
  versionNumber: number;
  roleIdentifier: string;
  restaurantBrand: string | null;
  assignedAt: Date;
}

export interface TraineePassportViewData {
  trainee: {
    id: string;
    traineeCode: string;
    fullName: string;
    email: string;
    jobRole: string | null;
    restaurantBrand: string;
    branchLocation: string;
    cohortBatch: string;
    hireDate: Date;
  };
  plan: PlanMetadata | null;
  stats: {
    totalMilestones: number;
    verifiedCount: number;
    readyForReviewCount: number;
    overallPercent: number;
  };
  paths: PathProgressSummary[];
  archivedMilestones: EnrichedMilestone[];
}

export async function getTraineePassportData(
  traineeId: string
): Promise<TraineePassportViewData | null> {
  const trainee = await prisma.trainee.findUnique({
    where: { id: traineeId },
    include: {
      planAssignments: {
        where: { status: "ACTIVE" },
        orderBy: { assignedAt: "desc" },
        take: 1,
        include: {
          planVersion: {
            include: {
              plan: true,
              nodes: {
                orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
              },
            },
          },
        },
      },
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

  type ActiveAssignmentWithPlan = NonNullable<typeof trainee>["planAssignments"][number];
  let activeAssignment: ActiveAssignmentWithPlan | null = trainee.planAssignments[0] || null;

  // Fallback resilience: If no active assignment, auto-link to published default or role-matched plan
  if (!activeAssignment) {
    const fallbackPlan = await prisma.trainingPlan.findFirst({
      where: {
        OR: [
          trainee.jobRole
            ? { roleIdentifier: trainee.jobRole.toUpperCase(), status: "PUBLISHED" }
            : {},
          { isDefault: true, status: "PUBLISHED" },
          { status: "PUBLISHED" },
        ],
      },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            plan: true,
            nodes: {
              orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
            },
          },
        },
      },
    });

    if (fallbackPlan?.versions[0]) {
      const assignedById =
        fallbackPlan.versions[0].publishedById || fallbackPlan.createdById;

      activeAssignment = await prisma.traineePlanAssignment.create({
        data: {
          traineeId: trainee.id,
          planVersionId: fallbackPlan.versions[0].id,
          assignedById,
          status: "ACTIVE",
        },
        include: {
          planVersion: {
            include: {
              plan: true,
              nodes: {
                orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
              },
            },
          },
        },
      });
    }
  }

  // Separate active progress from archived progress
  const activeRecords = trainee.progressRecords.filter((p) => !p.isArchived);
  const archivedRecords = trainee.progressRecords.filter((p) => p.isArchived);

  // Fast lookups for active trainee progress
  const activeProgressByNodeId = new Map(activeRecords.map((p) => [p.planNodeId, p]));
  const activeProgressByLibId = new Map(
    activeRecords
      .filter((p) => p.planNode?.libraryMilestoneId)
      .map((p) => [p.planNode.libraryMilestoneId!, p])
  );
  const activeProgressByCode = new Map(
    activeRecords
      .filter((p) => p.planNode?.code)
      .map((p) => [p.planNode.code, p])
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

  const activeNodes = activeAssignment?.planVersion?.nodes || [];

  const paths: PathProgressSummary[] = pathKeys.map((pathKey) => {
    const meta = DEVELOPMENT_PATHS[pathKey];
    const pathNodes = activeNodes.filter((node) => node.path === pathKey);

    const pathMilestones: EnrichedMilestone[] = pathNodes.map((node) => {
      const prog =
        activeProgressByNodeId.get(node.id) ||
        (node.libraryMilestoneId ? activeProgressByLibId.get(node.libraryMilestoneId) : undefined) ||
        activeProgressByCode.get(node.code);

      const status = (prog?.status as MilestoneStatus) || MilestoneStatus.IN_PROGRESS;

      if (status === MilestoneStatus.VERIFIED) totalVerified++;
      if (status === MilestoneStatus.READY_FOR_REVIEW) totalReadyForReview++;

      return {
        id: node.id,
        code: node.code,
        title: node.title,
        description: node.description,
        path: pathKey,
        orderIndex: node.orderIndex,
        status,
        progressId: prog?.id,
        traineeNote: prog?.traineeNote,
        requestedAt: prog?.requestedAt,
        verifiedAt: prog?.verifiedAt,
        verificationHash: prog?.verificationHash,
        stampDesign: node.stampDesign,
        trainerName: prog?.verifier?.fullName,
        trainerEmployeeId: prog?.verifier?.employeeId,
        trainerNote: prog?.trainerNote,
        isArchived: false,
        libraryMilestoneId: node.libraryMilestoneId,
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

  // Map archived competencies
  const archivedMilestones: EnrichedMilestone[] = archivedRecords.map((prog) => ({
    id: prog.planNode.id,
    code: prog.planNode.code,
    title: prog.planNode.title,
    description: prog.planNode.description,
    path: prog.planNode.path as DevelopmentPath,
    orderIndex: prog.planNode.orderIndex,
    status: prog.status as MilestoneStatus,
    progressId: prog.id,
    traineeNote: prog.traineeNote,
    requestedAt: prog.requestedAt,
    verifiedAt: prog.verifiedAt,
    verificationHash: prog.verificationHash,
    stampDesign: prog.planNode.stampDesign,
    trainerName: prog.verifier?.fullName,
    trainerEmployeeId: prog.verifier?.employeeId,
    trainerNote: prog.trainerNote,
    isArchived: true,
    libraryMilestoneId: prog.planNode.libraryMilestoneId,
  }));

  const totalMilestones = activeNodes.length;
  const overallPercent =
    totalMilestones > 0 ? Math.round((totalVerified / totalMilestones) * 100) : 0;

  const planMetadata: PlanMetadata | null = activeAssignment
    ? {
        id: activeAssignment.planVersion.plan.id,
        title: activeAssignment.planVersion.plan.title,
        versionNumber: activeAssignment.planVersion.versionNumber,
        roleIdentifier: activeAssignment.planVersion.plan.roleIdentifier,
        restaurantBrand: activeAssignment.planVersion.plan.restaurantBrand,
        assignedAt: activeAssignment.assignedAt,
      }
    : null;

  return {
    trainee: {
      id: trainee.id,
      traineeCode: trainee.traineeCode,
      fullName: trainee.fullName,
      email: trainee.email,
      jobRole: trainee.jobRole,
      restaurantBrand: trainee.restaurantBrand,
      branchLocation: trainee.branchLocation,
      cohortBatch: trainee.cohortBatch,
      hireDate: trainee.hireDate,
    },
    plan: planMetadata,
    stats: {
      totalMilestones,
      verifiedCount: totalVerified,
      readyForReviewCount: totalReadyForReview,
      overallPercent,
    },
    paths,
    archivedMilestones,
  };
}

export const getTraineePassportViewData = getTraineePassportData;

