// Live Supabase check. Never prints credentials, signed URLs, or authorization tickets.
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const sessions = require('../lib/auth/session.ts');
let admin = null;
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/auth/session') return { ...sessions, getAdminSession: async () => admin, getTraineeSession: async () => null };
  if (request === 'next/cache') return { revalidatePath: () => {} };
  return originalLoad.call(this, request, parent, main);
};
const { getSupabaseAdmin, MATERIAL_BUCKET } = require('../lib/supabase/server.ts');
const actions = require('../lib/actions/materials.ts');
const { MATERIAL_LIMITS } = require('../lib/validations/materials.ts');
let milestone, stage = 'environment configuration';
const objectPaths = [];
(async () => {
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
  const storage = getSupabaseAdmin().storage;
  stage = 'private bucket configuration';
  const bucket = await storage.getBucket(MATERIAL_BUCKET);
  assert.equal(bucket.error, null, 'course-materials bucket must exist');
  assert.equal(bucket.data.public, false);
  assert.equal(Number(bucket.data.file_size_limit), 50 * 1024 * 1024, 'bucket limit must match the approved 50 MB free-tier limit');
  admin = await prisma.adminUser.findFirstOrThrow();
  milestone = await prisma.milestoneDefinition.create({ data: { code: `MATLIVE-${Date.now()}`, title: 'Live materials test', description: 'Isolated upload integration fixture', path: 'TECHNICAL', isStandard: false } });
  for (const [type, rule] of Object.entries(MATERIAL_LIMITS)) {
    stage = `${type} signed upload and confirmation`;
    const bytes = type === 'PDF' ? Buffer.from('%PDF-1.4\n%%EOF\n') : type === 'VIDEO' ? Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex') : Buffer.from('504b0506000000000000000000000000000000000000', 'hex');
    const requested = await actions.requestUploadUrlAction({ milestoneId: milestone.id, fileName: `fixture${rule.extension}`, mimeType: rule.mimeTypes[0], fileSizeBytes: bytes.length });
    assert.equal(requested.success, true);
    objectPaths.push(requested.data.storagePath);
    const uploaded = await fetch(requested.data.signedUrl, { method: 'PUT', headers: { 'Content-Type': rule.mimeTypes[0] }, body: bytes });
    assert.ok(uploaded.ok, 'direct signed upload must succeed');
    assert.equal((await actions.confirmUploadAction(requested.data.ticket)).success, true);
    const record = await prisma.courseMaterial.findUniqueOrThrow({ where: { id: requested.data.materialId } });
    assert.equal(record.fileType, type);
    stage = `${type} signed viewing and download`;
    const signed = await actions.getMaterialSignedUrlAction(record.id);
    assert.equal(signed.success, true);
    const url = new URL(signed.data.signedUrl);
    const claims = JSON.parse(Buffer.from(url.searchParams.get('token').split('.')[1], 'base64url').toString());
    assert.equal(claims.exp - claims.iat, 3600);
    const viewed = await fetch(signed.data.signedUrl);
    assert.ok(viewed.ok);
    assert.deepEqual(Buffer.from(await viewed.arrayBuffer()), bytes);
    const download = await actions.getMaterialSignedUrlAction(record.id, true);
    assert.equal(download.success, true);
    assert.ok(new URL(download.data.signedUrl).searchParams.has('download'));
    stage = `${type} dual deletion`;
    assert.equal((await actions.deleteMaterialAction(record.id)).success, true);
    assert.equal(await prisma.courseMaterial.count({ where: { id: record.id } }), 0);
    assert.ok((await storage.from(MATERIAL_BUCKET).info(record.storagePath)).error);
    console.log(`${type}: real signed upload, object confirmation, metadata, one-hour URL, download, and dual deletion passed.`);
  }
})().catch(() => { console.error(`Live material check did not pass at: ${stage}. Credentials and signed URLs are redacted.`); process.exitCode = 1; }).finally(async () => {
  try {
    if (objectPaths.length) {
      const cleanup = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).remove(objectPaths);
      if (cleanup.error) { console.error('Temporary Storage cleanup needs retry.'); process.exitCode = 1; }
    }
    if (milestone) await prisma.milestoneDefinition.delete({ where: { id: milestone.id } });
  } finally { Module._load = originalLoad; await prisma.$disconnect(); }
});
