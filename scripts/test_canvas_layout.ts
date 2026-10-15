import assert from "node:assert/strict";
import type { Node, Edge } from "@xyflow/react";
import { DEVELOPMENT_PATHS } from "../lib/types/models";
import { getLayoutedElements } from "../lib/canvas/layout";

const paths = Object.keys(DEVELOPMENT_PATHS);
const nodes: Node[] = [{ id: "plan-overview", type: "planOverview", position: { x: 0, y: 0 }, data: {}, measured: { width: 288, height: 112 } }];
const edges: Edge[] = [];
paths.forEach((path, track) => {
  nodes.push({ id: `root-${path}`, type: "pathRoot", position: { x: 0, y: 0 }, data: { path }, measured: { width: 288, height: 180 } });
  for (let index = 0; index < [0, 1, 4, 8, 17][track]; index++) {
    const id = `${path}-${index}`;
    nodes.push({ id, type: "milestone", position: { x: 0, y: 0 }, data: { path, orderIndex: index + 1 }, measured: { width: 240, height: index % 3 ? 140 : 200 } });
    edges.push({ id: `edge-${id}`, source: `root-${path}`, target: id });
  }
});
const original = JSON.stringify({ nodes, edges });
const tree = getLayoutedElements(nodes, edges);
assert.equal(JSON.stringify({ nodes, edges }), original, "Layout must not mutate input graph");
assert.equal(tree.nodes.length, nodes.length);
assert.equal(tree.edges.length, edges.length);
const hubs = paths.map(path => tree.nodes.find(node => node.id === `root-${path}`)!);
for (let index = 1; index < hubs.length; index++) {
  assert.equal(hubs[index].position.x, hubs[0].position.x, "Path hubs must form a vertical spine");
  assert.ok(hubs[index].position.y > hubs[index - 1].position.y, "Paths must follow top-to-bottom order");
}
for (let index = 0; index < tree.nodes.length; index++) {
  const a = tree.nodes[index];
  for (const b of tree.nodes.slice(index + 1)) {
    const overlap = a.position.x < b.position.x + b.measured!.width! && a.position.x + a.measured!.width! > b.position.x && a.position.y < b.position.y + b.measured!.height! && a.position.y + a.measured!.height! > b.position.y;
    assert.equal(overlap, false, `Nodes ${a.id} and ${b.id} overlap`);
  }
}
for (const path of paths.slice(2)) {
  const children = tree.nodes.filter(node => node.type === "milestone" && node.data.path === path);
  const hub = hubs.find(node => node.data.path === path)!;
  assert.ok(children.some(node => node.position.x < hub.position.x));
  assert.ok(children.some(node => node.position.x > hub.position.x));
  assert.ok(new Set(children.map(node => node.position.y)).size > 1, "Milestones must not share one horizontal rank");
}
for (const edge of tree.edges) {
  assert.equal(edge.data?.branch, true);
  assert.notEqual(edge.sourceHandle, edge.targetHandle, "Each branch must attach to facing parent/child sides");
}
assert.deepEqual(getLayoutedElements(nodes, edges), tree, "Layout must be deterministic");
console.log("Canvas layout checks passed: vertical path order, staggered branches, facing connectors, and no node overlaps across uneven track sizes.");
