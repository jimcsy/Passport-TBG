-- CreateTable
CREATE TABLE "CourseMaterial" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseMaterial_storagePath_key" ON "CourseMaterial"("storagePath");

-- CreateIndex
CREATE INDEX "CourseMaterial_milestoneId_idx" ON "CourseMaterial"("milestoneId");

-- AddForeignKey
ALTER TABLE "CourseMaterial" ADD CONSTRAINT "CourseMaterial_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseMaterial" ADD CONSTRAINT "CourseMaterial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
