"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useNodesInitialized,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  LayoutGrid,
  Save,
  RotateCcw,
  Maximize2,
  GitBranch,
  ShieldCheck,
  PanelRightOpen,
  Award,
  AlertTriangle,
  Network,
  ListTree,
  Send,
  History,
  CheckCircle2,
} from "lucide-react";
import { getLayoutedElements } from "@/lib/canvas/layout";
import { getMilestonePlacement } from "@/lib/canvas/placement";
import { DevelopmentPath } from "@/lib/types/models";
import { savePlanVersionAction, publishPlanCanvasAction } from "@/lib/actions/plans";
import { PathRootNode, type PathRootNodeData } from "./nodes/PathRootNode";
import { PlanOverviewNode } from "./nodes/PlanOverviewNode";
import { MilestoneNode, type MilestoneNodeData } from "./nodes/MilestoneNode";
import { BeatEdge, type BeatEdgeData } from "./edges/BeatEdge";
import { MilestoneLibraryDrawer, type LibraryMilestone } from "./MilestoneLibraryDrawer";
import { CreateMilestoneModal, type CreateCustomMilestoneForm } from "./CreateMilestoneModal";
import { PlanTreeView } from "./PlanTreeView";
import { PublishPlanModal } from "./PublishPlanModal";
import { PlanVersionHistoryModal, type PlanVersionSummary } from "./PlanVersionHistoryModal";

// Initial 5 Development Path Hubs definition
const PLAN_OVERVIEW_ID = "plan-overview";
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
  activeTraineeCount?: number;
  versions?: PlanVersionSummary[];
}

export function PlanCanvasBuilder(props: PlanCanvasBuilderProps) {
  return (
    <ReactFlowProvider key={props.plan.id}>
      <PlanCanvasBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function PlanCanvasBuilderInner({
  plan,
  initialVersion,
  libraryMilestones = [],
  activeTraineeCount = 0,
  versions = [],
}: PlanCanvasBuilderProps) {
  const [currentVersion, setCurrentVersion] = useState({
    id: initialVersion.id,
    versionNumber: initialVersion.versionNumber,
    status: initialVersion.status,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const libraryReopenButton = useRef<HTMLButtonElement>(null);
  const libraryFocusRequested = useRef(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [addingToPath, setAddingToPath] = useState<DevelopmentPath | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "tree">("canvas");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ ids: string[]; detail: boolean } | null>(null);
  const [focusedPath, setFocusedPath] = useState<DevelopmentPath | null>(DevelopmentPath.ONBOARDING);

  // Auto-detect mobile screen (< 768px) and default to structured outline view
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setViewMode("tree");
      }
    }
  }, []);

  useEffect(() => {
    if (!libraryFocusRequested.current) return;
    libraryFocusRequested.current = false;
    if (isLibraryOpen) document.getElementById("plan-milestone-search")?.focus();
    else libraryReopenButton.current?.focus();
  }, [isLibraryOpen]);

  function setLibraryVisible(visible: boolean) {
    libraryFocusRequested.current = true;
    setIsLibraryOpen(visible);
  }

  function openCanvas() {
    if (viewMode !== "canvas") setIsLibraryOpen(true);
    setViewMode("canvas");
  }

  const { fitView, getNode, viewportInitialized } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  // Wait for React Flow's node measurements instead of racing a timeout after drop.
  useEffect(() => {
    if (!focusRequest || !viewportInitialized || !nodesInitialized || viewMode !== "canvas") return;
    if (focusRequest.ids.some(id => !getNode(id)?.measured?.width)) return;
    void fitView({
      nodes: focusRequest.ids.map(id => ({ id })),
      padding: focusRequest.detail ? 0.6 : 0.25,
      minZoom: focusRequest.detail ? 0.85 : 0.2,
      maxZoom: focusRequest.detail ? 1.05 : 0.95,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
    });
    setFocusRequest(null);
  }, [focusRequest, viewportInitialized, nodesInitialized, viewMode, fitView, getNode]);

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
      position: { x: n.posX ?? 0, y: n.posY ?? 180 },
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

    const overview: Node = {
      id: PLAN_OVERVIEW_ID, type: "planOverview", position: { x: 0, y: 0 },
      data: { title: plan.title, role: plan.roleIdentifier },
      deletable: false, draggable: false, connectable: false,
    };
    return [overview, ...rootNodes, ...milestoneNodes];
  }, [initialVersion.nodes, initialCounts, plan.title, plan.roleIdentifier]);

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

    const overviewEdges: Edge[] = INITIAL_PATH_ROOTS.map((root, index) => ({
      id: `overview-${root.id}`, source: index === 0 ? PLAN_OVERVIEW_ID : INITIAL_PATH_ROOTS[index - 1].id, target: root.id,
      sourceHandle: "spine", targetHandle: "spine-in",
      type: "beatEdge", deletable: false, selectable: false,
    }));
    return [...overviewEdges, ...dbEdges, ...autoEdges];
  }, [initialVersion.edges, initialVersion.nodes]);

  const initialTree = useMemo(() => getLayoutedElements(initialNodes, initialEdges, { direction: "TB" }), [initialNodes, initialEdges]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialTree.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialTree.edges);

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

  const addLibraryMilestone = useCallback(
    (milestone: LibraryMilestone) => {
      // Check if duplicate
      if (placedCodes.has(milestone.code)) {
        showWarning(`${milestone.code} is already in this plan.`);
        return;
      }

      const placement = getMilestonePlacement(nodes, milestone.path as DevelopmentPath);
      if (!placement) { showWarning("This milestone does not have a matching development path."); return; }

      const newNodeId = `node-lib-${milestone.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: "milestone",
        position: placement.position,
        selected: true,
        data: {
          code: milestone.code,
          title: milestone.title,
          description: milestone.description,
          path: milestone.path as DevelopmentPath,
          orderIndex: placement.orderIndex,
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

      const tree = getLayoutedElements([...nodes.map(node => ({ ...node, selected: false })), newNode], [...edges, newEdge], { direction: "TB" });
      setNodes(tree.nodes);
      setEdges(tree.edges);
      setHasUnsavedChanges(true);
      setFocusedPath(milestone.path as DevelopmentPath);
      setFocusRequest({ ids: [newNodeId], detail: true });
    },
    [placedCodes, nodes, edges, setNodes, setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData("application/reactflow");
      if (!rawData) return;
      try {
        const payload = JSON.parse(rawData);
        const milestone = libraryMilestones.find(item => item.id === payload.id);
        if (milestone) addLibraryMilestone(milestone);
      } catch (err) {
        console.error("Failed to parse dropped milestone:", err);
      }
    },
    [libraryMilestones, addLibraryMilestone]
  );

  // Callbacks for node/edge actions
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setHasUnsavedChanges(true);
    },
    [setNodes, setEdges]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
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
      planOverview: PlanOverviewNode,
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
      if (source === PLAN_OVERVIEW_ID || target === PLAN_OVERVIEW_ID) return false;

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
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "beatEdge",
          },
          eds
        )
      );
      setHasUnsavedChanges(true);
    },
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
      setHasUnsavedChanges(true);

      setSaveMessage(`Custom milestone "${form.code}" added and canvas layout balanced.`);
      setFocusedPath(form.path);
      setFocusRequest({ ids: [newNodeId], detail: true });
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
          onDeleteEdge: edge.id.startsWith("overview-") ? undefined : handleDeleteEdge,
      },
    }));
  }, [edges, handleDeleteEdge]);

  // Auto-layout action using Dagre
  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(augmentedNodes, augmentedEdges, { direction: "TB" });
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    setHasUnsavedChanges(true);
    setFocusedPath(null);
    setFocusRequest({ ids: layouted.nodes.map(node => node.id), detail: false });
  }, [augmentedNodes, augmentedEdges, setNodes, setEdges]);

  // Save current canvas state as a draft version
  const onSaveDraft = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const persistentNodes = nodes
      .filter((n) => n.type === "milestone")
      .map((n, index) => ({
        id: n.id.startsWith("temp-") || n.id.startsWith("node-") ? undefined : n.id,
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

    const persistentEdges = edges.filter(edge => !edge.id.startsWith("overview-")).map((e) => ({
      sourceNodeId: e.source,
      targetNodeId: e.target,
      edgeType: "PARENT_CHILD" as const,
    }));

    const res = await savePlanVersionAction({
      planId: plan.id,
      publishedById: "",
      status: "DRAFT",
      changelog: `Saved canvas draft for version ${currentVersion.versionNumber}`,
      nodes: persistentNodes,
      edges: persistentEdges,
    });

    setIsSaving(false);
    if (res.success) {
      setHasUnsavedChanges(false);
      setSaveMessage("Draft saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage(res.error || "Failed to save draft.");
    }
  };

  // Publish current canvas state as immutable version with safe trainee reconcile
  const handleConfirmPublish = async ({
    syncTrainees,
    changelog,
  }: {
    syncTrainees: boolean;
    changelog: string;
  }) => {
    setIsPublishing(true);

    const persistentNodes = nodes
      .filter((n) => n.type === "milestone")
      .map((n, index) => ({
        id: n.id.startsWith("temp-") || n.id.startsWith("node-") ? undefined : n.id,
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

    const persistentEdges = edges.filter(edge => !edge.id.startsWith("overview-")).map((e) => ({
      sourceNodeId: e.source,
      targetNodeId: e.target,
      edgeType: "PARENT_CHILD" as const,
    }));

    const res = await publishPlanCanvasAction({
      planId: plan.id,
      syncTrainees,
      changelog,
      nodes: persistentNodes,
      edges: persistentEdges,
    });

    setIsPublishing(false);

    if (res.success) {
      setIsPublishModalOpen(false);
      setHasUnsavedChanges(false);
      setCurrentVersion((v) => ({
        ...v,
        status: "PUBLISHED",
      }));

      const resData = res.data as {
        reconcileResult?: {
          migratedTraineesCount: number;
          preservedCount: number;
          archivedCount: number;
          injectedCount: number;
        } | null;
      };

      const syncResult = resData?.reconcileResult;
      const syncInfo = syncResult
        ? ` (${syncResult.migratedTraineesCount} trainees migrated: ${syncResult.preservedCount} preserved, ${syncResult.injectedCount} added)`
        : "";

      setSaveMessage(`Version ${currentVersion.versionNumber} published!${syncInfo}`);
      setTimeout(() => setSaveMessage(null), 4500);
    } else {
      showWarning(res.error || "Failed to publish plan version.");
    }
  };

  return (
    <div className="relative flex h-[max(640px,calc(100dvh-12rem))] flex-col overflow-hidden rounded-lg border border-beat-gold/30 bg-white shadow-sm xl:h-[max(640px,calc(100dvh-9rem))]">
      {/* Canvas Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-b border-beat-border z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/trainer/plans"
            aria-label="Back to training plans"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-beat-border hover:bg-beat-canvas text-beat-maroon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-beat-maroon leading-tight">
                {plan.title}
              </h2>
                <span className="text-xs capitalize text-beat-maroon/60">
                  {plan.roleIdentifier.replace(/_/g, " ").toLowerCase()}
              </span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon"
                title="View Version History"
              >
                <History className="h-3 w-3 text-beat-maroon" />
                <span>v{currentVersion.versionNumber}</span>
                <span>·</span>
                <span
                  className={
                    currentVersion.status === "PUBLISHED"
                      ? "text-beat-maroon font-semibold"
                      : "text-beat-maroon font-semibold"
                  }
                >
                  {currentVersion.status}
                </span>
              </button>
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1.5 text-xs text-beat-maroon/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-beat-gold/10" />
                  Unsaved edits
                </span>
              )}
            </div>
            <p className="text-[11px] text-beat-muted">
              Add milestones from the library. Drag cards to adjust their position.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {saveMessage && (
            <span className="text-xs font-semibold text-beat-maroon bg-beat-gold/10 px-3 py-1 rounded-xl border border-beat-gold/30 animate-in fade-in">
              {saveMessage}
            </span>
          )}

          {/* View Mode Toggle (Canvas vs Outline) */}
          <div className="flex items-center rounded-xl border border-beat-border bg-beat-canvas p-0.5">
            <button
              type="button"
              onClick={openCanvas}
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

          {viewMode === "canvas" && (
            <button
              type="button"
              onClick={onLayout}
              className="flex items-center gap-1.5 rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-gold/20 transition-colors shadow-2xs cursor-pointer"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Arrange</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-1.5 rounded-xl border border-beat-border bg-white px-3.5 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-canvas transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Save className="h-3.5 w-3.5 text-beat-gold" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-4 py-2 text-xs font-bold text-beat-gold shadow-sm hover:bg-beat-maroon-dark hover:text-white transition-all disabled:opacity-50 cursor-pointer border border-beat-gold/40"
          >
            <Send className="h-3.5 w-3.5 text-beat-gold" />
            <span>Publish</span>
          </button>
        </div>
      </header>

      <nav aria-label="Focus development path" className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-beat-gold/20 bg-beat-canvas px-4 py-3">
        <button type="button" aria-pressed={focusedPath === null} onClick={() => { openCanvas(); setFocusedPath(null); setFocusRequest({ ids: nodes.map(node => node.id), detail: false }); }} className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${focusedPath === null ? "border-beat-maroon bg-beat-maroon text-white" : "border-beat-gold/20 bg-white text-beat-maroon"}`}><Maximize2 className="h-3.5 w-3.5" />Whole plan</button>
        {INITIAL_PATH_ROOTS.map(root => <button key={root.id} type="button" aria-pressed={focusedPath === root.path} onClick={() => { openCanvas(); setFocusedPath(root.path); setFocusRequest({ ids: nodes.filter(node => node.data.path === root.path).map(node => node.id), detail: false }); }} className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${focusedPath === root.path ? "border-beat-maroon bg-beat-maroon text-white" : "border-beat-gold/20 bg-white text-beat-maroon hover:border-beat-gold"}`}><span>{root.title}</span><span className="text-[10px] text-beat-gold">{nodeCountMap[root.path] || 0}</span></button>)}
      </nav>

      {/* Main Viewport: Canvas vs Tree View */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {viewMode === "tree" ? (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-beat-canvas/30">
          <PlanTreeView
            nodes={nodes}
            onDeleteNode={handleDeleteNode}
            onAddMilestone={(p) => setAddingToPath(p)}
            onReorderMilestones={handleReorderMilestones}
          />
        </div>
      ) : (
        <div
          className="beat-canvas relative min-h-0 min-w-0 flex-1"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Warning Toast */}
          {warningToast && (
            <div role="alert" className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-beat-gold/30 bg-white px-4 py-2.5 text-xs text-beat-maroon shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-beat-maroon" />
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
            fitViewOptions={{ padding: 0.25, maxZoom: 0.95, nodes: focusedPath ? augmentedNodes.filter(node => node.data.path === focusedPath || (focusedPath === DevelopmentPath.ONBOARDING && node.type === "planOverview")).map(node => ({ id: node.id })) : undefined }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(92,29,36,0.14)" />
            <Controls position="bottom-right" showInteractive={false} className="!m-4" />
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              ariaLabel="Training plan overview"
              style={{ width: 160, height: 100 }}
              className="!m-4"
              nodeColor={(n) => (n.type === "pathRoot" ? "#5C1D24" : "#C29B38")}
              maskColor="rgba(250, 248, 244, 0.7)"
            />
            <Panel position="top-left" className="rounded-lg border border-beat-gold/20 bg-white px-3 py-2 text-[11px] text-beat-maroon/70">
              Drop a milestone to add it to its path and focus it.
            </Panel>
          </ReactFlow>
        </div>
      )}

      {/* Docked milestone library */}
      <MilestoneLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setLibraryVisible(false)}
        milestones={libraryMilestones}
        placedCodes={placedCodes}
        onAddMilestone={addLibraryMilestone}
        className="flex min-h-0 max-h-[45%] w-full shrink-0 flex-col border-t border-beat-gold/25 bg-white text-beat-maroon md:max-h-none md:w-72 md:border-l md:border-t-0 lg:w-80"
      />
      {!isLibraryOpen && (
        <aside aria-label="Milestone library controls" className="flex shrink-0 justify-end border-t border-beat-border bg-white p-2 md:w-12 md:flex-col md:justify-start md:border-l md:border-t-0 md:px-1 md:py-3">
          <button ref={libraryReopenButton} type="button" onClick={() => setLibraryVisible(true)} aria-label="Open milestone library" aria-controls="plan-milestone-library" aria-expanded={false} title="Open milestone library" className="flex h-10 w-10 items-center justify-center rounded-md text-beat-maroon/70 hover:bg-beat-canvas hover:text-beat-maroon">
            <PanelRightOpen aria-hidden="true" className="h-5 w-5" />
          </button>
        </aside>
      )}
      </div>

      {/* Custom Milestone Creation Modal */}
      <CreateMilestoneModal
        isOpen={addingToPath !== null}
        onClose={() => setAddingToPath(null)}
        path={addingToPath}
        roleIdentifier={plan.roleIdentifier}
        existingCodes={placedCodes}
        onSubmit={handleCreateCustomMilestone}
      />

      {/* Publish Plan Modal */}
      <PublishPlanModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        planTitle={plan.title}
        roleIdentifier={plan.roleIdentifier}
        restaurantBrand={plan.restaurantBrand}
        versionNumber={currentVersion.versionNumber}
        nodeCounts={nodeCountMap}
        totalMilestones={nodes.filter((n) => n.type === "milestone").length}
        activeTraineeCount={activeTraineeCount}
        isPublishing={isPublishing}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* Plan Version History Modal */}
      <PlanVersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        planTitle={plan.title}
        currentVersionNumber={currentVersion.versionNumber}
        versions={versions}
      />
    </div>
  );
}
