# Supabase table security

The application reads and writes PostgreSQL through server-side Prisma. Its
signed cookie sessions are separate from Supabase Auth. The browser only needs
signed Supabase Storage uploads; it does not need the database Data API.

Migration `20261105000000_lock_down_public_tables` enables RLS and revokes all
table privileges from `PUBLIC`, `anon`, and `authenticated` for the 13 app tables
and Prisma's migration table. No permissive RLS policies are created. This also
blocks operations such as TRUNCATE that RLS alone does not govern. Storage's
schema, bucket configuration, and signed URLs are unaffected.

## Deploy

Confirm the deployed Prisma connection uses the table owner or a role with
`BYPASSRLS`, and has its own table privileges. The configured project's
`postgres` role meets this requirement. A restricted role that relies on grants
to `PUBLIC` will need explicit grants before applying this migration.

Apply tracked migrations with the production connection configured:

```sh
npx prisma migrate status
npx prisma migrate deploy
```

Do not use `db push`, reset, or seed to apply this security change. For urgent
containment, Supabase also recommends disabling the Data API when using only
Prisma: Dashboard → Integrations → Data API (the exact navigation can change).
Keep Supabase Storage enabled for course materials.

## Verify

Run the read-only verification against the configured database:

```sh
node --env-file=.env scripts/check_database_security.cjs
```

It checks RLS, effective API privileges, backend reads without fetching records,
and actual read denial while assuming each API role in a transaction.

In the Supabase SQL Editor, this should show RLS enabled on every listed table:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Check effective API privileges, including inherited grants. This should return
no rows for the application tables and `_prisma_migrations`:

```sql
SELECT r.rolname, t.tablename, p.privilege
FROM pg_roles r
CROSS JOIN pg_tables t
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(privilege)
WHERE r.rolname IN ('anon', 'authenticated')
  AND t.schemaname = 'public'
  AND has_table_privilege(r.oid,
        format('%I.%I', t.schemaname, t.tablename), p.privilege);
```

Re-run Security Advisor and smoke-test trainee login, trainer login, reading
progress, requesting/verifying a milestone, and course-material upload/download.
The SQL Editor runs with elevated privileges; seeing rows there does not prove
that anonymous API access is allowed. A public-key Data API request must fail to
read these tables.

Every future migration that creates an app table must enable RLS and revoke
these same privileges on that table. Prisma does not add RLS automatically.
Never add `USING (true)` policies to make this alert disappear. If browser
database access is introduced, design policies around a verified identity first.

This fix closes direct table access; the alert alone does not establish whether
anyone accessed the data. Review available API/database logs for the exposure
period, particularly access to `AdminUser` (password hashes) and `Trainee`
(personal information), and investigate unexpected activity.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Supabase with Prisma](https://supabase.com/docs/guides/database/prisma).
