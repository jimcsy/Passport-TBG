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

## Course material storage (issue #32)

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` in `.env` and the deployment environment. Copy keys
from the same Supabase project as the database. Never expose the service role key
in browser code or give it a `NEXT_PUBLIC_` prefix. Restart/rebuild after setting
public environment variables.

Apply the additive CourseMaterial migration using `npx prisma migrate deploy`.
In Supabase Storage create a **private** bucket named `course-materials`, with
allowed MIME types `video/mp4`, `application/pdf`, and
`application/vnd.openxmlformats-officedocument.presentationml.presentation`.
Set its file limit to 52428800 bytes (50 MiB), matching the project's global
Storage limit on Supabase Free. The user-approved 2026-10-25 amendment caps MP4,
PDF, and PPTX files at 50 MB each in both client and server validation.

Do not add public read/write policies for the bucket. Application sessions are
not Supabase Auth sessions: trainer actions create signed upload URLs, and
server actions authorize active trainee assignments before issuing signed
one-hour viewing/download URLs. Browser uploads use the signed URL directly.
Files are stored under `{milestoneCode}/{materialId}/{sanitizedFilename}`.

Upload confirmation checks the object exists and its size/content type match the
trainer-bound signed upload ticket. Cancelled/failed uploads attempt object
cleanup; a network failure during cleanup can leave an unlisted object. Periodic
maintenance can remove objects with no matching CourseMaterial record after
allowing at least the two-hour upload authorization window. Deletion removes the
object first and retains metadata on Storage failure to allow retry.

Materials belong to the shared milestone catalog and become available to all
active plans referencing that milestone immediately. Deleting a library milestone through the application removes its Storage objects
first, then its material metadata. Direct database deletion cascades only metadata;
remove Storage objects first when maintaining the catalog outside the application.

Validation before closing #32: run the file validation/repository scripts, then
exercise actual signed upload → confirmation → preview/download → deletion for
MP4/PDF/PPTX, sequential uploads, upload cancellation, progress, and denied access
for trainees without an active assignment. Do not close on mocked Storage tests
alone.
