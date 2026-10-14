import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

export interface LayoutOptions {
  direction?: "TB" | "LR";
  nodeSpacing?: number;
  rankSpacing?: number;
}

/**
 * Calculates a hierarchical DAG/tree layout using Dagre.
 * Aligns the 5 Development Path Hubs and connects child milestone nodes neatly.
 */
export function getLayoutedElements<T extends Node, E extends Edge>(
  nodes: T[],
  edges: E[],
  options: LayoutOptions = {}
): { nodes: T[]; edges: E[] } {
  const { direction = "TB", nodeSpacing = 50, rankSpacing = 90 } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    align: "UL",
  });

  nodes.forEach((node) => {
    const isRoot = node.type === "pathRoot" || node.id.startsWith("root-");
    const width = isRoot ? 260 : 230;
    const height = isRoot ? 80 : 100;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodePos = dagreGraph.node(node.id);
    if (!nodePos) return node;

    const isRoot = node.type === "pathRoot" || node.id.startsWith("root-");
    const width = isRoot ? 260 : 230;
    const height = isRoot ? 80 : 100;

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
