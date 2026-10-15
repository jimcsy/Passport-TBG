import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import { DEVELOPMENT_PATHS } from "@/lib/types/models";

export interface LayoutOptions {
  direction?: "TB" | "LR";
  nodeSpacing?: number;
  rankSpacing?: number;
}

/**
 * Stack development paths vertically, with staggered left/right milestone branches.
 * Dagre remains the fallback for other graphs and horizontal layouts.
 */
export function getLayoutedElements<T extends Node, E extends Edge>(
  nodes: T[],
  edges: E[],
  options: LayoutOptions = {}
): { nodes: T[]; edges: E[] } {
  const { direction = "TB", nodeSpacing = 50, rankSpacing = 90 } = options;

  // A vertical spine of path hubs, each with its own staggered side branches.
  // Rank-based layouts put all five hubs and all their children in wide rows.
  if (direction === "TB" && nodes.some(node => node.type === "pathRoot")) {
    const positions = new Map<string, { x: number; y: number }>();
    const overview = nodes.find(node => node.type === "planOverview");
    const centerX = 520;
    const width = (node: Node) => node.measured?.width ?? (node.type === "milestone" ? 240 : 288);
    const height = (node: Node) => node.measured?.height ?? (node.type === "milestone" ? 140 : node.type === "planOverview" ? 112 : 180);
    let bandTop = overview ? height(overview) + rankSpacing : 0;
    if (overview) positions.set(overview.id, { x: centerX - width(overview) / 2, y: 0 });
    const branchSides = new Map<string, "left" | "right">();
    for (const path of Object.keys(DEVELOPMENT_PATHS)) {
      const hub = nodes.find(node => node.type === "pathRoot" && node.data.path === path);
      if (!hub) continue;
      const children = nodes.filter(node => node.type === "milestone" && node.data.path === path)
        .sort((a, b) => Number(a.data.orderIndex) - Number(b.data.orderIndex) || a.id.localeCompare(b.id));
      const leafHeight = Math.max(140, ...children.map(height));
      const rows = Math.ceil(children.length / 2);
      const stagger = 48;
      const bandHeight = Math.max(height(hub), rows ? rows * leafHeight + (rows - 1) * nodeSpacing + (children.length > 1 ? stagger : 0) : 0);
      const hubPosition = { x: centerX - width(hub) / 2, y: bandTop + (bandHeight - height(hub)) / 2 };
      positions.set(hub.id, hubPosition);
      children.forEach((child, index) => {
        const side = index % 2 === 0 ? "left" : "right";
        branchSides.set(child.id, side);
        positions.set(child.id, {
          x: side === "left" ? hubPosition.x - rankSpacing - width(child) : hubPosition.x + width(hub) + rankSpacing,
          y: bandTop + Math.floor(index / 2) * (leafHeight + nodeSpacing) + (side === "right" ? stagger : 0),
        });
      });
      bandTop += bandHeight + rankSpacing;
    }
    return {
      nodes: nodes.map(node => ({ ...node, position: positions.get(node.id) ?? node.position })),
      edges: edges.map(edge => {
        const source = nodes.find(node => node.id === edge.source);
        const side = branchSides.get(edge.target);
        if (source?.type !== "pathRoot" || !side) return edge;
        return { ...edge, sourceHandle: `branch-${side}`, targetHandle: side === "left" ? "branch-right" : "branch-left", data: { ...edge.data, branch: true } };
      }),
    };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
  });

  const dimensions = (node: Node) => {
    const isRoot = node.type === "pathRoot" || node.id.startsWith("root-");
    return {
      width: node.measured?.width ?? (isRoot || node.type === "planOverview" ? 288 : 240),
      height: node.measured?.height ?? (isRoot ? 180 : node.type === "planOverview" ? 112 : 140),
    };
  };

  nodes.forEach((node) => {
    const { width, height } = dimensions(node);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodePos = dagreGraph.node(node.id);
    if (!nodePos) return node;

    const { width, height } = dimensions(node);

    return {
      ...node,
      position: {
        x: Math.round(nodePos.x - width / 2),
        y: Math.round(nodePos.y - height / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
