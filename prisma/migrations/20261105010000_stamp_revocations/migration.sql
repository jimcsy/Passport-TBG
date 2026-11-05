CREATE TABLE "StampRevocation" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "awardKey" TEXT NOT NULL,
    "verificationHash" TEXT,
    "planNodeId" TEXT NOT NULL,
    "milestoneCode" TEXT NOT NULL,
    "milestoneTitle" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "originalTrainerNote" TEXT,
    "originalRequestedAt" TIMESTAMP(3),
    "revokedById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    CONSTRAINT "StampRevocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StampRevocation_traineeId_awardKey_key" ON "StampRevocation"("traineeId", "awardKey");
CREATE INDEX "StampRevocation_traineeId_revokedAt_idx" ON "StampRevocation"("traineeId", "revokedAt");
ALTER TABLE "StampRevocation" ADD CONSTRAINT "StampRevocation_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StampRevocation" ADD CONSTRAINT "StampRevocation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match the application's server-only access policy for training records.
ALTER TABLE "StampRevocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "StampRevocation" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."StampRevocation" FROM %I', api_role);
        END IF;
    END LOOP;
END
$$;
