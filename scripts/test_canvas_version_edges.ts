import assert from "node:assert/strict";
import { prisma } from "../lib/db/prisma";
import { savePlanVersion } from "../lib/db/repositories/plans";
async function main() {
  const trainer = await prisma.adminUser.findFirstOrThrow();
  const plan = await prisma.trainingPlan.create({ data: { title: "Isolated canvas edge regression", roleIdentifier: "EDGE_TEST", createdById: trainer.id } });
  try {
    const nodes = [{ id: "local-a", code: "EDGE-A", title: "First node", description: "Canvas edge regression", path: "ONBOARDING" as const, orderIndex: 1, posX: 0, posY: 0, isCustom: false }, { id: "local-b", code: "EDGE-B", title: "Second node", description: "Canvas edge regression", path: "ONBOARDING" as const, orderIndex: 2, posX: 0, posY: 200, isCustom: false }];
    const base = { planId: plan.id, publishedById: trainer.id, nodes, edges: [] };
    const first = await savePlanVersion({ ...base, status: "PUBLISHED" });
    const second = await savePlanVersion({ ...base, status: "DRAFT", edges: [
      { sourceNodeId: "local-a", targetNodeId: "local-b", edgeType: "SEQUENCE_HINT" },
      { sourceNodeId: "root-ONBOARDING", targetNodeId: "local-a", edgeType: "PARENT_CHILD" },
      { sourceNodeId: first.nodes[0].id, targetNodeId: "local-b", edgeType: "PARENT_CHILD" },
    ] });
    assert.equal(second.edges.length, 1);
    assert.ok(second.nodes.some(node => node.id === second.edges[0].sourceNodeId));
    assert.ok(second.nodes.some(node => node.id === second.edges[0].targetNodeId));
    assert.equal(second.edges[0].edgeType, "SEQUENCE_HINT");
    assert.equal((await prisma.planVersion.findUniqueOrThrow({ where: { id: first.id }, include: { nodes: true, edges: true } })).nodes.length, 2);
    console.log("Canvas save checks passed: local edge remapping, virtual hub filtering, cross-version edge rejection, and published snapshot preservation.");
  } finally { await prisma.trainingPlan.delete({ where: { id: plan.id } }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
