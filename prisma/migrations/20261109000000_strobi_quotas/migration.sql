CREATE TABLE "StrobiDailyQuota" (
  "scope" TEXT NOT NULL CHECK ("scope" IN ('TRAINER', 'PROJECT')),
  "subjectId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  CONSTRAINT "StrobiDailyQuota_pkey" PRIMARY KEY ("scope", "subjectId", "day")
);
CREATE INDEX "StrobiDailyQuota_day_idx" ON "StrobiDailyQuota"("day");
CREATE TABLE "StrobiRequestLease" (
  "trainerId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrobiRequestLease_pkey" PRIMARY KEY ("trainerId")
);
CREATE UNIQUE INDEX "StrobiRequestLease_token_key" ON "StrobiRequestLease"("token");
CREATE INDEX "StrobiRequestLease_expiresAt_idx" ON "StrobiRequestLease"("expiresAt");
ALTER TABLE "StrobiDailyQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StrobiRequestLease" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "StrobiDailyQuota", "StrobiRequestLease" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."StrobiDailyQuota", public."StrobiRequestLease" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
