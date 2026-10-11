-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TRAINER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trainee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traineeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "restaurantBrand" TEXT NOT NULL,
    "branchLocation" TEXT NOT NULL,
    "cohortBatch" TEXT NOT NULL,
    "hireDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MilestoneDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TraineeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traineeId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "traineeNote" TEXT,
    "requestedAt" DATETIME,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "trainerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TraineeProgress_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraineeProgress_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraineeProgress_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "TraineeProgress_status_idx" ON "TraineeProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeProgress_traineeId_milestoneId_key" ON "TraineeProgress"("traineeId", "milestoneId");
