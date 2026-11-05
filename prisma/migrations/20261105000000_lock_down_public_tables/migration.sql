-- Application data is accessed through server-side Prisma with an owner/BYPASSRLS
-- role. App sessions are not Supabase Auth sessions, so no Data API policies
-- should grant anon/authenticated access. Storage uses its separate schema.
DO $$
DECLARE
    table_name text;
    api_role text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'AdminUser', 'Trainee', 'MilestoneDefinition', 'TrainingPlan',
        'PlanVersion', 'PlanNode', 'PlanEdge', 'TraineePlanAssignment',
        'TraineeProgress', 'CourseMaterial', 'LearningPath',
        'StampNotificationRead', 'ReviewNotificationRead', '_prisma_migrations'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        -- RLS does not cover TRUNCATE or REFERENCES; remove API privileges too.
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
        FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            -- Keep this migration usable in PostgreSQL without Supabase roles.
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
            END IF;
        END LOOP;
    END LOOP;
END
$$;
