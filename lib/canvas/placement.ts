import type { Node } from "@xyflow/react";
import type { DevelopmentPath } from "@/lib/types/models";

/** Append to the matching path without moving any trainer-positioned nodes. */
export function getMilestonePlacement(nodes: Node[], path: DevelopmentPath) {
  const hub = nodes.find(node => node.id === `root-${path}`);
  if (!hub) return null;
  const children = nodes.filter(node => node.type === "milestone" && node.data.path === path);
  return {
    position: {
      x: hub.position.x + 24,
      y: Math.max(hub.position.y + (hub.measured?.height ?? 180) + 60,
        ...children.map(node => node.position.y + (node.measured?.height ?? 140) + 48)),
    },
    orderIndex: Math.max(0, ...children.map(node => Number(node.data.orderIndex) || 0)) + 1,
  };
}
