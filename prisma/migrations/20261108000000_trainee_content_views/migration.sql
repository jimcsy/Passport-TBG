CREATE TABLE "TraineeContentView" (
    "traineeId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraineeContentView_pkey" PRIMARY KEY ("traineeId"),
    CONSTRAINT "TraineeContentView_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TraineeContentView_firstViewedAt_idx" ON "TraineeContentView"("firstViewedAt");
ALTER TABLE "TraineeContentView" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "TraineeContentView" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."TraineeContentView" FROM %I', api_role);
        END IF;
    END LOOP;
END $$;
