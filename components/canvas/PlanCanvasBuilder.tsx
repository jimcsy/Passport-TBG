"use client";

import { useCallback, useMemo, useState } from "react";
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
  Handle,
  Position,
  Panel,
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
} from "lucide-react";
import { getLayoutedElements } from "@/lib/canvas/layout";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";
import { savePlanVersionAction } from "@/lib/actions/plans";

// Initial 5 Development Path Hubs definition
const INITIAL_PATH_ROOTS: { id: string; path: DevelopmentPath; title: string; x: number; y: number }[] = [
  { id: "root-ONBOARDING", path: DevelopmentPath.ONBOARDING, title: "1. Onboarding", x: 0, y: 0 },
  { id: "root-COMMUNICATION", path: DevelopmentPath.COMMUNICATION, title: "2. Communication", x: 280, y: 0 },
  { id: "root-TECHNICAL", path: DevelopmentPath.TECHNICAL, title: "3. Technical Skills", x: 560, y: 0 },
  { id: "root-CULTURE", path: DevelopmentPath.CULTURE, title: "4. Culture & Values", x: 840, y: 0 },
  { id: "root-LEADERSHIP", path: DevelopmentPath.LEADERSHIP, title: "5. Leadership Skills", x: 1120, y: 0 },
];

// Custom Path Root Node Component
function PathRootNode({ data }: { data: { title: string; path: DevelopmentPath } }) {
  return (
    <div className="w-64 rounded-2xl bg-beat-maroon text-beat-gold p-4 shadow-lg border-2 border-beat-gold select-none">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-beat-gold/20 text-beat-gold">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-beat-gold/80 font-bold">
            Development Path
          </p>
          <h4 className="font-bold text-sm text-white truncate">{data.title}</h4>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-beat-gold !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}

// Custom Milestone Node Component
function MilestoneNode({ data }: { data: { code: string; title: string; description: string; path: DevelopmentPath } }) {
  return (
    <div className="w-56 rounded-2xl bg-white text-beat-maroon p-3.5 shadow-md border-l-4 border-l-beat-gold border border-beat-border hover:shadow-lg transition-shadow select-none">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-beat-gold !w-2.5 !h-2.5 !border-2 !border-white"
      />
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
          {data.code}
        </span>
        <span className="text-[9px] uppercase font-bold text-beat-gold tracking-wider">
          {data.path.substring(0, 4)}
        </span>
      </div>
      <h5 className="font-bold text-xs leading-tight line-clamp-1">{data.title}</h5>
      <p className="text-[11px] text-beat-muted line-clamp-2 mt-1 leading-snug">
        {data.description}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-beat-maroon !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}

interface PlanCanvasBuilderProps {
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
}

export function PlanCanvasBuilder({ plan, initialVersion }: PlanCanvasBuilderProps) {
  // Build initial React Flow nodes from existing nodes or default path hubs
  const initialNodes: Node[] = useMemo(() => {
    // 1. Path root hubs
    const rootNodes: Node[] = INITIAL_PATH_ROOTS.map((root) => ({
      id: root.id,
      type: "pathRoot",
      position: { x: root.x, y: root.y },
      data: { title: root.title, path: root.path },
      deletable: false,
    }));

    // 2. Child milestone nodes
    const milestoneNodes: Node[] = initialVersion.nodes.map((n) => ({
      id: n.id,
      type: "milestone",
      position: { x: n.posX || 0, y: n.posY || 150 },
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
  }, [initialVersion.nodes]);

  // Build initial edges
  const initialEdges: Edge[] = useMemo(() => {
    // Map edges from DB
    const dbEdges: Edge[] = initialVersion.edges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      style: { stroke: "#C29B38", strokeWidth: 2.5 },
    }));

    // If milestone nodes have no edges connecting them to their path root, create default edges
    const connectedTargets = new Set(initialVersion.edges.map((e) => e.targetNodeId));
    const autoEdges: Edge[] = [];

    initialVersion.nodes.forEach((n) => {
      if (!connectedTargets.has(n.id)) {
        autoEdges.push({
          id: `edge-root-${n.id}`,
          source: `root-${n.path}`,
          target: n.id,
          style: { stroke: "#C29B38", strokeWidth: 2.5 },
        });
      }
    });

    return [...dbEdges, ...autoEdges];
  }, [initialVersion.edges, initialVersion.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const nodeTypes = useMemo(
    () => ({
      pathRoot: PathRootNode,
      milestone: MilestoneNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: "#C29B38", strokeWidth: 2.5 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Auto-layout action using Dagre
  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(nodes, edges, { direction: "TB" });
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
  }, [nodes, edges, setNodes, setEdges]);

  // Save current canvas state as a draft version
  const onSaveDraft = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Filter out root hubs when persisting nodes
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
      publishedById: "", // populated by server session
      status: "DRAFT",
      changelog: `Saved canvas draft for version ${initialVersion.versionNumber}`,
      nodes: persistentNodes,
      edges: persistentEdges,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveMessage("Canvas draft saved successfully!");
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
              Drag, connect, and position training milestones across the 5 BEAT development paths.
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

          <button
            type="button"
            onClick={onLayout}
            className="flex items-center gap-1.5 rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-gold/20 transition-colors shadow-2xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-beat-gold" />
            <span>Auto Layout</span>
          </button>

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

      {/* Main Canvas Viewport */}
      <div className="flex-1 w-full h-full beat-canvas relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
            💡 Drag connectors between hubs and milestones to configure the path hierarchy
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
