-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TRAINER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainee" (
    "id" TEXT NOT NULL,
    "traineeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "restaurantBrand" TEXT NOT NULL,
    "branchLocation" TEXT NOT NULL,
    "cohortBatch" TEXT NOT NULL,
    "jobRole" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneDefinition" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleIdentifier" TEXT NOT NULL,
    "restaurantBrand" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "changelog" TEXT,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanNode" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "libraryMilestoneId" TEXT,
    "path" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEdge" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL DEFAULT 'PARENT_CHILD',

    CONSTRAINT "PlanEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraineePlanAssignment" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "TraineePlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraineeProgress" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "planNodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "traineeNote" TEXT,
    "requestedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "trainerNote" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraineeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_employeeId_key" ON "AdminUser"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_traineeCode_key" ON "Trainee"("traineeCode");

-- CreateIndex
CREATE INDEX "Trainee_traineeCode_email_idx" ON "Trainee"("traineeCode", "email");

-- CreateIndex
CREATE INDEX "Trainee_restaurantBrand_branchLocation_cohortBatch_idx" ON "Trainee"("restaurantBrand", "branchLocation", "cohortBatch");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneDefinition_code_key" ON "MilestoneDefinition"("code");

-- CreateIndex
CREATE INDEX "TrainingPlan_roleIdentifier_idx" ON "TrainingPlan"("roleIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_versionNumber_key" ON "PlanVersion"("planId", "versionNumber");

-- CreateIndex
CREATE INDEX "PlanNode_planVersionId_path_idx" ON "PlanNode"("planVersionId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEdge_planVersionId_sourceNodeId_targetNodeId_key" ON "PlanEdge"("planVersionId", "sourceNodeId", "targetNodeId");

-- CreateIndex
CREATE INDEX "TraineePlanAssignment_traineeId_status_idx" ON "TraineePlanAssignment"("traineeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TraineePlanAssignment_traineeId_planVersionId_key" ON "TraineePlanAssignment"("traineeId", "planVersionId");

-- CreateIndex
CREATE INDEX "TraineeProgress_status_idx" ON "TraineeProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeProgress_traineeId_planNodeId_key" ON "TraineeProgress"("traineeId", "planNodeId");

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanNode" ADD CONSTRAINT "PlanNode_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanNode" ADD CONSTRAINT "PlanNode_libraryMilestoneId_fkey" FOREIGN KEY ("libraryMilestoneId") REFERENCES "MilestoneDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEdge" ADD CONSTRAINT "PlanEdge_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEdge" ADD CONSTRAINT "PlanEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "PlanNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEdge" ADD CONSTRAINT "PlanEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "PlanNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineePlanAssignment" ADD CONSTRAINT "TraineePlanAssignment_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineePlanAssignment" ADD CONSTRAINT "TraineePlanAssignment_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineePlanAssignment" ADD CONSTRAINT "TraineePlanAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_planNodeId_fkey" FOREIGN KEY ("planNodeId") REFERENCES "PlanNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeProgress" ADD CONSTRAINT "TraineeProgress_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
