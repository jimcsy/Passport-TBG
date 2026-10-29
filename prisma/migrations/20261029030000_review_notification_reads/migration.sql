CREATE TABLE "ReviewNotificationRead" (
  "trainerId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewNotificationRead_pkey" PRIMARY KEY ("trainerId", "requestKey"),
  CONSTRAINT "ReviewNotificationRead_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
