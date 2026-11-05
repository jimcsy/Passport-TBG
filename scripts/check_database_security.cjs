// Read-only checks; run: node --env-file=.env scripts/check_database_security.cjs
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: [] });
const quote = value => '"' + value.replaceAll('"', '""') + '"';

async function main() {
  const tables = await db.$queryRaw`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' ORDER BY tablename
  `;
  assert.ok(tables.length > 0, 'No public tables found');
  for (const table of tables) {
    assert.equal(table.rowsecurity, true, `${table.tablename}: RLS disabled`);
    // Check backend access without retrieving any application data.
    await db.$queryRawUnsafe(`SELECT 1 FROM public.${quote(table.tablename)} LIMIT 0`);
  }
  const grants = await db.$queryRaw`
    SELECT r.rolname, t.tablename, p.privilege
    FROM pg_roles r CROSS JOIN pg_tables t
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                       ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(privilege)
    WHERE r.rolname IN ('anon', 'authenticated') AND t.schemaname = 'public'
      AND has_table_privilege(r.oid,
            format('%I.%I', t.schemaname, t.tablename), p.privilege)
  `;
  assert.deepEqual(grants, [], 'API roles still have effective table privileges');

  for (const role of ['anon', 'authenticated']) {
    let denied = false;
    try {
      await db.$transaction(async tx => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${quote(role)}`);
        await tx.$queryRawUnsafe('SELECT 1 FROM public."AdminUser" LIMIT 0');
      });
    } catch (error) {
      // PostgreSQL insufficient_privilege, rather than a connection/query error.
      if (error.meta?.code !== '42501') throw error;
      denied = true;
    }
    assert.ok(denied, `${role} unexpectedly accessed AdminUser`);
    console.log(`${role}: direct table read denied`);
  }
  console.log(`${tables.length} tables: RLS enabled, API privileges absent, backend reads working`);
}

main().catch(error => {
  // Do not include connection strings or application records in output.
  console.error('Database security check failed:', error.code || error.message);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
