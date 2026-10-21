# Supabase setup (Prisma 5)

Prisma remains the application ORM. The database provider is now PostgreSQL.

1. Replace `[YOUR-PASSWORD]` in both URLs in the root `.env` with the
   URL-encoded Supabase database password. Keep credentials out of Git.
   Prisma CLI loads `.env`; use it rather than relying on `.env.local`.
2. Use the transaction pooler on port 6543 for `DATABASE_URL` and the
   session pooler on port 5432 for `DIRECT_URL`. The latter is used for migrations.
3. Back up the original SQLite database, including any journal/WAL files, before
   transferring data. `prisma/dev.db` has been left in place.
4. For a new, empty Supabase database, apply the PostgreSQL migration:

   ```sh
   npx prisma migrate deploy
   npx prisma generate
   ```

   For a populated target, reconcile its schema and migration history first.
   Do not reset a populated database to make the migration apply.
5. To preserve existing records, transfer SQLite data separately, preserving IDs,
   relationships, timestamps, and password hashes. Applying schema migrations does
   not copy records. Validate row counts and relationships before switching users.
   Keep writes paused during the final transfer and validation.
6. Only for a fresh demo database, review `prisma/seed.ts` before optionally running
   `npm run db:seed`. Do not run `npm run db:reset` on data you need to preserve.
7. Verify trainer login, trainee lookup/registration, plan publishing, assignments,
   progress review, and reconciliation against a disposable test database first.
   Existing test scripts can modify records; do not point them at production.
8. Set both database URLs and the existing session secret in the deployment
   environment before deploying the application.

The old SQLite migration history is preserved in `migrations-sqlite/` for
reference. Only `migrations/` is applied to PostgreSQL. The new initial migration
was generated from the existing Prisma models; it does not migrate SQLite data.

Keep database credentials server-side. Configure Supabase Data API access before
exposing these tables: existing application sessions do not establish Supabase
Auth identities or RLS policies. If the Data API is unused, disable it in Supabase.
