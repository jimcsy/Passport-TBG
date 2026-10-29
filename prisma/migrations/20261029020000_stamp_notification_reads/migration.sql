CREATE TABLE "StampNotificationRead" (
  "traineeId" TEXT NOT NULL,
  "verificationHash" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StampNotificationRead_pkey" PRIMARY KEY ("traineeId", "verificationHash"),
  CONSTRAINT "StampNotificationRead_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
