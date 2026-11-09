BEGIN;

-- Extend accounting without rewriting trainer/project rows or in-flight leases.
ALTER TABLE "StrobiDailyQuota" DROP CONSTRAINT "StrobiDailyQuota_scope_check";
ALTER TABLE "StrobiDailyQuota" ADD CONSTRAINT "StrobiDailyQuota_scope_check"
  CHECK ("scope" IN ('TRAINER', 'PROJECT', 'TRAINEE', 'TRAINEE_PROJECT'));

CREATE TABLE "StrobiActorRequestLease" (
  "scope" TEXT NOT NULL CHECK ("scope" = 'TRAINEE'),
  "subjectId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL CHECK ("cacheKey" ~ '^[a-f0-9]{64}$'),
  "day" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrobiActorRequestLease_pkey" PRIMARY KEY ("scope", "subjectId")
);
CREATE UNIQUE INDEX "StrobiActorRequestLease_token_key" ON "StrobiActorRequestLease"("token");
CREATE INDEX "StrobiActorRequestLease_expiresAt_idx" ON "StrobiActorRequestLease"("expiresAt");

CREATE TABLE "StrobiTipCache" (
  "key" TEXT NOT NULL CHECK ("key" ~ '^[a-f0-9]{64}$'),
  "tip" JSONB NOT NULL CHECK (jsonb_typeof("tip") = 'object'),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrobiTipCache_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "StrobiTipCache_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "StrobiTipCache_expiresAt_idx" ON "StrobiTipCache"("expiresAt");

CREATE TABLE "StrobiTipCacheLease" (
  "key" TEXT NOT NULL CHECK ("key" ~ '^[a-f0-9]{64}$'),
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrobiTipCacheLease_pkey" PRIMARY KEY ("key")
);
CREATE UNIQUE INDEX "StrobiTipCacheLease_token_key" ON "StrobiTipCacheLease"("token");
CREATE INDEX "StrobiTipCacheLease_expiresAt_idx" ON "StrobiTipCacheLease"("expiresAt");

ALTER TABLE "StrobiActorRequestLease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StrobiTipCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StrobiTipCacheLease" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "StrobiActorRequestLease", "StrobiTipCache", "StrobiTipCacheLease" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."StrobiActorRequestLease", public."StrobiTipCache", public."StrobiTipCacheLease" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

COMMIT;
