import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MATERIAL_LIMITS, uploadRequestSchema, validateFile } from "../lib/validations/materials";
import { prisma } from "../lib/db/prisma";
import { createCourseMaterial, deleteCourseMaterial, getMaterialsForMilestone, reorderMaterials } from "../lib/db/repositories/materials";
async function main() {
  for (const type of Object.keys(MATERIAL_LIMITS) as (keyof typeof MATERIAL_LIMITS)[]) {
    const rule = MATERIAL_LIMITS[type];
    assert.equal(rule.maxBytes, 50 * 1024 * 1024);
    const file = { name: `example${rule.extension}`, type: rule.mimeTypes[0], size: rule.maxBytes };
    assert.equal(validateFile(file).valid, true);
    assert.equal(validateFile({ ...file, size: file.size + 1 }).valid, false);
    assert.equal(validateFile({ ...file, size: 0 }).valid, false);
    assert.equal(validateFile({ ...file, size: -1 }).valid, false);
    assert.equal(validateFile({ ...file, name: "wrong.exe" }).valid, false);
    assert.equal(uploadRequestSchema.safeParse({ milestoneId: "test", fileName: file.name, mimeType: file.type, fileSizeBytes: file.size }).success, true);
    assert.equal(uploadRequestSchema.safeParse({ milestoneId: "test", fileName: file.name, mimeType: file.type, fileSizeBytes: file.size + 1 }).success, false);
  }
  assert.equal(validateFile({ name: "test.exe", type: "application/octet-stream", size: 10 }).valid, false);
  assert.equal(uploadRequestSchema.safeParse({ milestoneId: "test", fileName: "../test.pdf", mimeType: "application/pdf", fileSizeBytes: 10 }).success, false);
  console.log("File validation passed: all type/size boundaries, empty files, extension mismatches, and path traversal.");
  if (!process.argv.includes("--database")) return;
  const trainer = await prisma.adminUser.findFirstOrThrow();
  const milestone = await prisma.milestoneDefinition.create({ data: { code: `MAT-${Date.now()}`, title: "Material integration fixture", description: "Temporary test fixture", path: "TECHNICAL", isStandard: false } });
  try {
    const created = [];
    for (const type of Object.keys(MATERIAL_LIMITS) as (keyof typeof MATERIAL_LIMITS)[]) {
      const id = randomUUID(); const rule = MATERIAL_LIMITS[type];
      created.push(await createCourseMaterial({ id, milestoneId: milestone.id, fileName: `example${rule.extension}`, fileType: type, mimeType: rule.mimeTypes[0], fileSizeBytes: 10, storagePath: `test/${milestone.id}/${id}`, uploadedById: trainer.id }));
    }
    const initial = await getMaterialsForMilestone(milestone.id);
    assert.deepEqual(initial.map(item => item.displayOrder), [0, 1, 2]);
    assert.ok(initial.every(item => !("storagePath" in item)));
    const reversed = initial.map(item => item.id).reverse();
    await reorderMaterials(milestone.id, reversed);
    assert.deepEqual((await getMaterialsForMilestone(milestone.id)).map(item => item.id), reversed);
    await assert.rejects(reorderMaterials(milestone.id, [reversed[0], reversed[0], reversed[1]]));
    await assert.rejects(reorderMaterials(milestone.id, ["unrelated"]));
    assert.equal((await createCourseMaterial(created[0])).id, created[0].id);
    const removed = await deleteCourseMaterial(created[0].id);
    assert.equal(removed.storagePath, created[0].storagePath);
    assert.equal((await getMaterialsForMilestone(milestone.id)).length, 2);
    console.log("Database material checks passed: CRUD, idempotent confirmation, safe summaries, ordering, and invalid reorder rejection.");
  } finally { await prisma.milestoneDefinition.delete({ where: { id: milestone.id } }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
