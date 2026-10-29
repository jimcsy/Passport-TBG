CREATE TYPE "LearningPathType" AS ENUM ('MASTER', 'VARIANT', 'INSTANCE');
CREATE TABLE "LearningPath" (
  "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "type" "LearningPathType" NOT NULL,
  "isTemplate" BOOLEAN NOT NULL DEFAULT false, "title" TEXT NOT NULL,
  "parentId" TEXT, "targetDepartment" TEXT, "targetPosition" TEXT, "traineeId" TEXT,
  "sourceVersionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningPath_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearningPath_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningPath_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LearningPath_planId_key" ON "LearningPath"("planId");
CREATE INDEX "LearningPath_parentId_type_idx" ON "LearningPath"("parentId", "type");
CREATE INDEX "LearningPath_traineeId_idx" ON "LearningPath"("traineeId");
CREATE UNIQUE INDEX "LearningPath_single_master" ON "LearningPath"("type") WHERE "type" = 'MASTER';
-- Preserve every legacy plan/version/progress ID. Catalog metadata is additive.
INSERT INTO "LearningPath" ("id", "planId", "type", "isTemplate", "title")
SELECT "id", "id", 'MASTER', true, "title" FROM "TrainingPlan" WHERE "id" = 'plan-tbg-corporate-foundation-l1';
INSERT INTO "LearningPath" ("id", "planId", "type", "title", "parentId")
SELECT "id", "id", 'VARIANT', "title", (SELECT "id" FROM "LearningPath" WHERE "type" = 'MASTER')
FROM "TrainingPlan" WHERE "id" <> 'plan-tbg-corporate-foundation-l1';
