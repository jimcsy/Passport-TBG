"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Sparkles,
  Save,
  RotateCcw,
  Maximize2,
  GitBranch,
  ShieldCheck,
  BookOpen,
  Award,
  AlertTriangle,
  Network,
  ListTree,
} from "lucide-react";
import { getLayoutedElements } from "@/lib/canvas/layout";
import { DevelopmentPath } from "@/lib/types/models";
import { savePlanVersionAction } from "@/lib/actions/plans";
import { PathRootNode, type PathRootNodeData } from "./nodes/PathRootNode";
import { MilestoneNode, type MilestoneNodeData } from "./nodes/MilestoneNode";
import { BeatEdge, type BeatEdgeData } from "./edges/BeatEdge";
import { MilestoneLibraryDrawer, type LibraryMilestone } from "./MilestoneLibraryDrawer";
import { CreateMilestoneModal, type CreateCustomMilestoneForm } from "./CreateMilestoneModal";
import { PlanTreeView } from "./PlanTreeView";

// Initial 5 Development Path Hubs definition
const INITIAL_PATH_ROOTS: { id: string; path: DevelopmentPath; title: string; x: number; y: number }[] = [
  { id: "root-ONBOARDING", path: DevelopmentPath.ONBOARDING, title: "Onboarding", x: 0, y: 0 },
  { id: "root-COMMUNICATION", path: DevelopmentPath.COMMUNICATION, title: "Communication Skills", x: 320, y: 0 },
  { id: "root-TECHNICAL", path: DevelopmentPath.TECHNICAL, title: "Technical Skills", x: 640, y: 0 },
  { id: "root-CULTURE", path: DevelopmentPath.CULTURE, title: "Personal Effectiveness", x: 960, y: 0 },
  { id: "root-LEADERSHIP", path: DevelopmentPath.LEADERSHIP, title: "Leadership Skills", x: 1280, y: 0 },
];

export interface PlanCanvasBuilderProps {
  plan: {
    id: string;
    title: string;
    roleIdentifier: string;
    restaurantBrand: string | null;
    status: string;
  };
  initialVersion: {
    id: string;
    versionNumber: number;
    status: string;
    nodes: Array<{
      id: string;
      code: string;
      title: string;
      description: string;
      path: string;
      orderIndex: number;
      posX: number;
      posY: number;
      isCustom: boolean;
      libraryMilestoneId: string | null;
    }>;
    edges: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      edgeType: string;
    }>;
  };
  libraryMilestones?: LibraryMilestone[];
}

export function PlanCanvasBuilder(props: PlanCanvasBuilderProps) {
  return (
    <ReactFlowProvider>
      <PlanCanvasBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function PlanCanvasBuilderInner({ plan, initialVersion, libraryMilestones = [] }: PlanCanvasBuilderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [addingToPath, setAddingToPath] = useState<DevelopmentPath | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "tree">("canvas");

  // Auto-detect mobile screen (< 768px) and default to structured outline view
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setViewMode("tree");
      }
    }
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  const showWarning = (msg: string) => {
    setWarningToast(msg);
    setTimeout(() => setWarningToast(null), 3500);
  };

  // Compute counts per path for initial display
  const initialCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialVersion.nodes.forEach((n) => {
      counts[n.path] = (counts[n.path] || 0) + 1;
    });
    return counts;
  }, [initialVersion.nodes]);

  // Build initial React Flow nodes from existing nodes or default path hubs
  const initialNodes: Node[] = useMemo(() => {
    // 1. Path root hubs
    const rootNodes: Node[] = INITIAL_PATH_ROOTS.map((root) => ({
      id: root.id,
      type: "pathRoot",
      position: { x: root.x, y: root.y },
      data: {
        title: root.title,
        path: root.path,
        childCount: initialCounts[root.path] || 0,
      },
      deletable: false,
    }));

    // 2. Child milestone nodes
    const milestoneNodes: Node[] = initialVersion.nodes.map((n) => ({
      id: n.id,
      type: "milestone",
      position: { x: n.posX || 0, y: n.posY || 180 },
      data: {
        code: n.code,
        title: n.title,
        description: n.description,
        path: n.path as DevelopmentPath,
        orderIndex: n.orderIndex,
        isCustom: n.isCustom,
        libraryMilestoneId: n.libraryMilestoneId,
      },
    }));

    return [...rootNodes, ...milestoneNodes];
  }, [initialVersion.nodes, initialCounts]);

  // Build initial edges
  const initialEdges: Edge[] = useMemo(() => {
    const dbEdges: Edge[] = initialVersion.edges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: "beatEdge",
    }));

    const connectedTargets = new Set(initialVersion.edges.map((e) => e.targetNodeId));
    const autoEdges: Edge[] = [];

    initialVersion.nodes.forEach((n) => {
      if (!connectedTargets.has(n.id)) {
        autoEdges.push({
          id: `edge-root-${n.id}`,
          source: `root-${n.path}`,
          target: n.id,
          type: "beatEdge",
        });
      }
    });

    return [...dbEdges, ...autoEdges];
  }, [initialVersion.edges, initialVersion.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Placed competency codes to disable re-adding duplicates
  const placedCodes = useMemo(() => {
    const codes = new Set<string>();
    nodes.forEach((n) => {
      if (n.type === "milestone" && n.data?.code) {
        codes.add(n.data.code as string);
      }
    });
    return codes;
  }, [nodes]);

  // Drag and drop handlers from Milestone Library Drawer
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData("application/reactflow");
      if (!rawData) return;

      try {
        const milestone: LibraryMilestone = JSON.parse(rawData);

        // Check if duplicate
        if (placedCodes.has(milestone.code)) {
          showWarning(`Competency "${milestone.code}" is already placed on the canvas.`);
          return;
        }

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNodeId = `node-lib-${milestone.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
        const newNode: Node = {
          id: newNodeId,
          type: "milestone",
          position,
          data: {
            code: milestone.code,
            title: milestone.title,
            description: milestone.description,
            path: milestone.path as DevelopmentPath,
            orderIndex: milestone.orderIndex || nodes.length + 1,
            isCustom: false,
            libraryMilestoneId: milestone.id,
          },
        };

        const newEdge: Edge = {
          id: `edge-${Date.now()}`,
          source: `root-${milestone.path}`,
          target: newNodeId,
          type: "beatEdge",
        };

        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => [...eds, newEdge]);
      } catch (err) {
        console.error("Failed to parse dropped milestone:", err);
      }
    },
    [screenToFlowPosition, placedCodes, nodes.length, setNodes, setEdges]
  );

  // Callbacks for node/edge actions
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  // Reorder milestones within a development path in Outline View
  const handleReorderMilestones = useCallback(
    (path: DevelopmentPath, sourceIndex: number, targetIndex: number) => {
      const pathMilestones = nodes
        .filter((n) => n.type === "milestone" && n.data?.path === path)
        .sort((a, b) => ((a.data.orderIndex as number) || 0) - ((b.data.orderIndex as number) || 0));

      if (
        sourceIndex < 0 ||
        sourceIndex >= pathMilestones.length ||
        targetIndex < 0 ||
        targetIndex >= pathMilestones.length
      ) {
        return;
      }

      const reordered = [...pathMilestones];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((node, index) => {
        orderMap.set(node.id, index + 1);
      });

      setNodes((nds) =>
        nds.map((n) => {
          if (orderMap.has(n.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                orderIndex: orderMap.get(n.id),
              },
            };
          }
          return n;
        })
      );
    },
    [nodes, setNodes]
  );

  // Recalculate child milestone counts on path hubs
  const nodeCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((n) => {
      if (n.type === "milestone" && n.data?.path) {
        const path = n.data.path as string;
        counts[path] = (counts[path] || 0) + 1;
      }
    });
    return counts;
  }, [nodes]);

  // Custom Node and Edge Types
  const nodeTypes = useMemo(
    () => ({
      pathRoot: PathRootNode,
      milestone: MilestoneNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      beatEdge: BeatEdge,
    }),
    []
  );

  // Two-tier connection validation rules:
  // 1. Hubs cannot be targets (incoming connections forbidden on hubs)
  // 2. Hub can only connect to milestones of the SAME path category
  // 3. Milestones cannot connect across different paths
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target) return false;
      if (source === target) return false;

      // Hubs cannot be target of any edge
      if (target.startsWith("root-")) return false;

      // If source is a root hub, check path matching
      if (source.startsWith("root-")) {
        const targetNode = nodes.find((n) => n.id === target);
        if (!targetNode) return false;
        const hubPath = source.replace("root-", "");
        return targetNode.data.path === hubPath;
      }

      // If milestone to milestone connection, ensure same path
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        return sourceNode.data.path === targetNode.data.path;
      }

      return false;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "beatEdge",
          },
          eds
        )
      ),
    [setEdges]
  );

  // Handle custom milestone creation from modal
  const handleCreateCustomMilestone = useCallback(
    (form: CreateCustomMilestoneForm) => {
      const parentHub = nodes.find((n) => n.id === `root-${form.path}`);
      const newNodeId = `node-custom-${form.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

      const newNode: Node = {
        id: newNodeId,
        type: "milestone",
        position: parentHub
          ? { x: parentHub.position.x, y: parentHub.position.y + 180 }
          : { x: 0, y: 180 },
        data: {
          code: form.code,
          title: form.title,
          description: form.description,
          path: form.path,
          orderIndex: (nodeCountMap[form.path] || 0) + 1,
          isCustom: true,
          libraryMilestoneId: null,
        },
      };

      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: `root-${form.path}`,
        target: newNodeId,
        type: "beatEdge",
      };

      const nextNodes = [...nodes, newNode];
      const nextEdges = [...edges, newEdge];

      // Auto-layout with Dagre to rebalance positions cleanly
      const layouted = getLayoutedElements(nextNodes, nextEdges, { direction: "TB" });
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      setSaveMessage(`Custom milestone "${form.code}" added and canvas layout balanced.`);
      setTimeout(() => setSaveMessage(null), 3500);
    },
    [nodes, edges, nodeCountMap, setNodes, setEdges]
  );

  // Inject action callbacks into nodes data
  const augmentedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === "pathRoot") {
        const pathKey = node.data.path as DevelopmentPath;
        return {
          ...node,
          data: {
            ...node.data,
            childCount: nodeCountMap[pathKey] || 0,
            onAddMilestone: (targetPath: DevelopmentPath) => {
              setAddingToPath(targetPath);
            },
          },
        };
      }
      if (node.type === "milestone") {
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: handleDeleteNode,
            onEdit: (id: string) => {
              console.log(`Edit milestone: ${id}`);
            },
          },
        };
      }
      return node;
    });
  }, [nodes, nodeCountMap, handleDeleteNode, setAddingToPath]);

  // Inject delete callback into edges
  const augmentedEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onDeleteEdge: handleDeleteEdge,
      },
    }));
  }, [edges, handleDeleteEdge]);

  // Auto-layout action using Dagre
  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(augmentedNodes, augmentedEdges, { direction: "TB" });
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
  }, [augmentedNodes, augmentedEdges, setNodes, setEdges]);

  // Save current canvas state as a draft version
  const onSaveDraft = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const persistentNodes = nodes
      .filter((n) => n.type === "milestone")
      .map((n, index) => ({
        id: n.id.startsWith("temp-") ? undefined : n.id,
        libraryMilestoneId: (n.data.libraryMilestoneId as string) || null,
        path: n.data.path as DevelopmentPath,
        code: n.data.code as string,
        title: n.data.title as string,
        description: n.data.description as string,
        orderIndex: (n.data.orderIndex as number) || index + 1,
        posX: Math.round(n.position.x),
        posY: Math.round(n.position.y),
        isCustom: (n.data.isCustom as boolean) ?? true,
      }));

    const persistentEdges = edges.map((e) => ({
      sourceNodeId: e.source,
      targetNodeId: e.target,
      edgeType: "PARENT_CHILD" as const,
    }));

    const res = await savePlanVersionAction({
      planId: plan.id,
      publishedById: "",
      status: "DRAFT",
      changelog: `Saved canvas draft for version ${initialVersion.versionNumber}`,
      nodes: persistentNodes,
      edges: persistentEdges,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveMessage("Draft saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage(res.error || "Failed to save draft.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] rounded-3xl overflow-hidden border border-beat-gold/30 bg-white shadow-xl relative">
      {/* Canvas Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-b border-beat-border z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/trainer/plans"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-beat-border hover:bg-beat-canvas text-beat-maroon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-beat-maroon leading-tight">
                {plan.title}
              </h2>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
                {plan.roleIdentifier}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-gold/20 text-beat-maroon border border-beat-gold/30">
                v{initialVersion.versionNumber} · {initialVersion.status}
              </span>
            </div>
            <p className="text-[11px] text-beat-muted">
              Interactive two-tier path tree. Hover over nodes to edit or delete; hover over connectors to disconnect.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 animate-in fade-in">
              {saveMessage}
            </span>
          )}

          {/* View Mode Toggle (Canvas vs Outline) */}
          <div className="flex items-center rounded-xl border border-beat-border bg-beat-canvas p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "canvas"
                  ? "bg-beat-maroon text-white shadow-xs"
                  : "text-beat-maroon hover:text-beat-gold"
              }`}
              title="Interactive Canvas View"
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "tree"
                  ? "bg-beat-maroon text-white shadow-xs"
                  : "text-beat-maroon hover:text-beat-gold"
              }`}
              title="Structured Outline View"
            >
              <ListTree className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outline</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLibraryOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              isLibraryOpen
                ? "bg-beat-gold text-white border-beat-gold shadow-sm"
                : "bg-beat-canvas border-beat-border text-beat-maroon hover:bg-beat-gold/20"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-beat-gold" />
            <span>Milestone Library</span>
            {libraryMilestones.length > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                  isLibraryOpen ? "bg-white/20 text-white" : "bg-beat-maroon/10 text-beat-maroon"
                }`}
              >
                {libraryMilestones.length}
              </span>
            )}
          </button>

          {viewMode === "canvas" && (
            <button
              type="button"
              onClick={onLayout}
              className="flex items-center gap-1.5 rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-gold/20 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-beat-gold" />
              <span>Auto Layout</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-beat-maroon-dark transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-beat-gold" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>
        </div>
      </header>

      {/* Main Viewport: Canvas vs Tree View */}
      {viewMode === "tree" ? (
        <div className="flex-1 w-full h-full bg-beat-canvas/30 relative overflow-y-auto">
          <PlanTreeView
            nodes={nodes}
            onDeleteNode={handleDeleteNode}
            onAddMilestone={(p) => setAddingToPath(p)}
            onReorderMilestones={handleReorderMilestones}
          />
        </div>
      ) : (
        <div
          className="flex-1 w-full h-full beat-canvas relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Warning Toast */}
          {warningToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-amber-500 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
              <span>{warningToast}</span>
            </div>
          )}

          <ReactFlow
            nodes={augmentedNodes}
            edges={augmentedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#C29B38" />
            <Controls showInteractive={false} className="!m-4" />
            <MiniMap
              className="!m-4"
              nodeColor={(n) => (n.type === "pathRoot" ? "#5C1D24" : "#C29B38")}
              maskColor="rgba(250, 248, 244, 0.7)"
            />
            <Panel position="bottom-center" className="bg-white/90 backdrop-blur-xs px-4 py-1.5 rounded-full border border-beat-gold/30 text-[11px] font-semibold text-beat-maroon shadow-xs">
              💡 Two-tier hierarchy: connect Path Root Hubs to child milestones in the same category
            </Panel>
          </ReactFlow>
        </div>
      )}

      {/* Milestone Library Slide-Over Drawer */}
      <MilestoneLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        milestones={libraryMilestones}
        placedCodes={placedCodes}
      />

      {/* Custom Milestone Creation Modal */}
      <CreateMilestoneModal
        isOpen={addingToPath !== null}
        onClose={() => setAddingToPath(null)}
        path={addingToPath}
        roleIdentifier={plan.roleIdentifier}
        existingCodes={placedCodes}
        onSubmit={handleCreateCustomMilestone}
      />
    </div>
  );
}
