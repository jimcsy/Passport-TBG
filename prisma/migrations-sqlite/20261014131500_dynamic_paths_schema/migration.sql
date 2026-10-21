-- AlterTable
ALTER TABLE "Trainee" ADD COLUMN "jobRole" TEXT;

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "roleIdentifier" TEXT NOT NULL,
    "restaurantBrand" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "changelog" TEXT,
    "publishedById" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planVersionId" TEXT NOT NULL,
    "libraryMilestoneId" TEXT,
    "path" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanNode_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanNode_libraryMilestoneId_fkey" FOREIGN KEY ("libraryMilestoneId") REFERENCES "MilestoneDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planVersionId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL DEFAULT 'PARENT_CHILD',
    CONSTRAINT "PlanEdge_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "PlanNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "PlanNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraineePlanAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traineeId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "TraineePlanAssignment_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraineePlanAssignment_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TraineePlanAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MilestoneDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MilestoneDefinition" ("code", "createdAt", "description", "id", "orderIndex", "path", "title") SELECT "code", "createdAt", "description", "id", "orderIndex", "path", "title" FROM "MilestoneDefinition";
DROP TABLE "MilestoneDefinition";
ALTER TABLE "new_MilestoneDefinition" RENAME TO "MilestoneDefinition";
CREATE UNIQUE INDEX "MilestoneDefinition_code_key" ON "MilestoneDefinition"("code");

-- Baseline Data Migration: Populate baseline Universal Plan and nodes from existing MilestoneDefinitions if AdminUser exists
INSERT INTO "TrainingPlan" ("id", "title", "roleIdentifier", "isDefault", "status", "createdById", "createdAt", "updatedAt")
SELECT 'universal-default-plan', 'Universal BEAT Development Track', 'UNIVERSAL_DEFAULT', 1, 'PUBLISHED', id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "AdminUser" LIMIT 1;

INSERT INTO "PlanVersion" ("id", "planId", "versionNumber", "status", "changelog", "publishedById", "publishedAt")
SELECT 'universal-default-plan-v1', 'universal-default-plan', 1, 'PUBLISHED', 'Baseline migration from canonical 20 milestones', id, CURRENT_TIMESTAMP
FROM "AdminUser" LIMIT 1;

INSERT INTO "PlanNode" ("id", "planVersionId", "libraryMilestoneId", "path", "code", "title", "description", "orderIndex", "posX", "posY", "isCustom", "createdAt")
SELECT 'node_' || id, 'universal-default-plan-v1', id, path, code, title, description, orderIndex, 0, 0, 0, CURRENT_TIMESTAMP
FROM "MilestoneDefinition";

INSERT INTO "TraineePlanAssignment" ("id", "traineeId", "planVersionId", "assignedById", "assignedAt", "status")
SELECT 'assign_' || t.id, t.id, 'universal-default-plan-v1', a.id, CURRENT_TIMESTAMP, 'ACTIVE'
FROM "Trainee" t CROSS JOIN (SELECT id FROM "AdminUser" LIMIT 1) a;

CREATE TABLE "new_TraineeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traineeId" TEXT NOT NULL,
    "planNodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "traineeNote" TEXT,
    "requestedAt" DATETIME,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "trainerNote" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraineeProgress_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraineeProgress_planNodeId_fkey" FOREIGN KEY ("planNodeId") REFERENCES "PlanNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TraineeProgress_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_TraineeProgress" ("id", "traineeId", "planNodeId", "status", "traineeNote", "requestedAt", "verifiedBy", "verifiedAt", "trainerNote", "isArchived", "createdAt", "updatedAt")
SELECT "id", "traineeId", 'node_' || "milestoneId", "status", "traineeNote", "requestedAt", "verifiedBy", "verifiedAt", "trainerNote", 0, "createdAt", "updatedAt"
FROM "TraineeProgress";

DROP TABLE "TraineeProgress";
ALTER TABLE "new_TraineeProgress" RENAME TO "TraineeProgress";
CREATE INDEX "TraineeProgress_status_idx" ON "TraineeProgress"("status");
CREATE UNIQUE INDEX "TraineeProgress_traineeId_planNodeId_key" ON "TraineeProgress"("traineeId", "planNodeId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrainingPlan_roleIdentifier_idx" ON "TrainingPlan"("roleIdentifier");
CREATE UNIQUE INDEX "PlanVersion_planId_versionNumber_key" ON "PlanVersion"("planId", "versionNumber");
CREATE INDEX "PlanNode_planVersionId_path_idx" ON "PlanNode"("planVersionId", "path");
CREATE UNIQUE INDEX "PlanEdge_planVersionId_sourceNodeId_targetNodeId_key" ON "PlanEdge"("planVersionId", "sourceNodeId", "targetNodeId");
CREATE INDEX "TraineePlanAssignment_traineeId_status_idx" ON "TraineePlanAssignment"("traineeId", "status");
CREATE UNIQUE INDEX "TraineePlanAssignment_traineeId_planVersionId_key" ON "TraineePlanAssignment"("traineeId", "planVersionId");
