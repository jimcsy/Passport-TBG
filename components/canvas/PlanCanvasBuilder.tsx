"use client";

import { computePlanVersionDiff } from "@/lib/canvas/diff";
import { pathTitle, readPathTitles, type PathTitles } from "@/lib/plans/paths";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { resolveStampDesign } from "@/lib/stamps/catalog";

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
  Maximize2,
  Network,
  ListTree,
  Send,
  History,
  Loader2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { getLayoutedElements } from "@/lib/canvas/layout";
import { getMilestonePlacement } from "@/lib/canvas/placement";
import { DevelopmentPath } from "@/lib/types/models";
import {
  savePlanVersionAction,
  publishPlanCanvasAction,
  getMilestoneProgressCountAction,
  createDraftVersionAction,
  createCustomLibraryMilestoneAction,
  updateCustomLibraryMilestoneAction,
  deleteCustomLibraryMilestoneAction,
} from "@/lib/actions/plans";
import { PathRootNode, type PathRootNodeData } from "./nodes/PathRootNode";
import { PlanOverviewNode } from "./nodes/PlanOverviewNode";
import { MilestoneNode, type MilestoneNodeData } from "./nodes/MilestoneNode";
import { BeatEdge, type BeatEdgeData } from "./edges/BeatEdge";
import { MilestoneLibraryDrawer, type LibraryMilestone } from "./MilestoneLibraryDrawer";
import { CreateMilestoneModal, type CreateCustomMilestoneForm } from "./CreateMilestoneModal";
import { EditMilestoneModal, type EditableMilestoneTarget } from "./EditMilestoneModal";
import { PlanTreeView } from "./PlanTreeView";
import { IndividualPublishModal } from "./IndividualPublishModal";
import { PublishPlanModal } from "./PublishPlanModal";
import { PlanVersionHistoryModal, type PlanVersionSummary } from "./PlanVersionHistoryModal";
import { CanvasNotification, type CanvasNotice } from "./CanvasNotification";
import { BuilderInspector } from "./BuilderInspector";

// Initial 5 Development Path Hubs definition
const PLAN_OVERVIEW_ID = "plan-overview";
const INITIAL_PATH_ROOTS: { id: string; path: DevelopmentPath; title: string; x: number; y: number }[] = [
  { id: "root-ONBOARDING", path: DevelopmentPath.ONBOARDING, title: "Onboarding", x: 0, y: 0 },
  { id: "root-COMMUNICATION", path: DevelopmentPath.COMMUNICATION, title: "Communication Skills", x: 320, y: 0 },
  { id: "root-TECHNICAL", path: DevelopmentPath.TECHNICAL, title: "Technical Skills", x: 640, y: 0 },
  { id: "root-CULTURE", path: DevelopmentPath.CULTURE, title: "Personal Effectiveness", x: 960, y: 0 },
  { id: "root-LEADERSHIP", path: DevelopmentPath.LEADERSHIP, title: "Leadership Skills", x: 1280, y: 0 },
];

function buildGraphForVersionData(
  versionNodes: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    path: string;
    orderIndex: number;
    posX?: number | null;
    posY?: number | null;
    libraryMilestone?: { _count: { materials: number } } | null;
    materialCount?: number;
    stampDesign?: string;
    isCustom?: boolean;
    libraryMilestoneId?: string | null;
  }>,
  versionEdges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: string;
  }>,
  planTitle: string,
  roleIdentifier: string,
  titles: PathTitles = {}
) {
  const counts: Record<string, number> = {};
  versionNodes.forEach((n) => {
    counts[n.path] = (counts[n.path] || 0) + 1;
  });

  const rootNodes: Node[] = INITIAL_PATH_ROOTS.map((root) => ({
    id: root.id,
    type: "pathRoot",
    position: { x: root.x, y: root.y },
    data: {
      title: pathTitle(root.path, titles),
      path: root.path,
      childCount: counts[root.path] || 0,
    },
    deletable: false,
  }));

  const milestoneNodes: Node[] = versionNodes.map((n) => ({
    id: n.id,
    type: "milestone",
    position: { x: n.posX ?? 0, y: n.posY ?? 180 },
    data: {
      code: n.code,
      title: n.title,
      description: n.description,
      path: n.path as DevelopmentPath,
      orderIndex: n.orderIndex,
      materialCount: n.materialCount ?? n.libraryMilestone?._count.materials ?? 0,
      stampDesign: resolveStampDesign(n.stampDesign, n.path),
      isCustom: n.isCustom ?? false,
      libraryMilestoneId: n.libraryMilestoneId ?? null,
    },
  }));

  const overview: Node = {
    id: PLAN_OVERVIEW_ID,
    type: "planOverview",
    position: { x: 0, y: 0 },
    data: { title: planTitle, role: roleIdentifier },
    deletable: false,
    draggable: false,
    connectable: false,
  };

  const dbEdges: Edge[] = versionEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: "beatEdge",
  }));

  const connectedTargets = new Set(versionEdges.map((e) => e.targetNodeId));
  const autoEdges: Edge[] = [];
  versionNodes.forEach((n) => {
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
    id: `overview-${root.id}`,
    source: index === 0 ? PLAN_OVERVIEW_ID : INITIAL_PATH_ROOTS[index - 1].id,
    target: root.id,
    sourceHandle: "spine",
    targetHandle: "spine-in",
    type: "beatEdge",
    deletable: false,
    selectable: false,
  }));

  const rawNodes = [overview, ...rootNodes, ...milestoneNodes];
  const rawEdges = [...overviewEdges, ...dbEdges, ...autoEdges];
  return getLayoutedElements(rawNodes, rawEdges, { direction: "TB" });
}

export interface PlanCanvasBuilderProps {
  plan: {
    id: string;
    title: string;
    roleIdentifier: string;
    restaurantBrand: string | null;
    status: string;
    isIndividualInstance?: boolean;
  };
  initialVersion: {
    pathTitles?: PathTitles;
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
      libraryMilestone?: { _count: { materials: number } } | null;
      materialCount?: number;
      stampDesign?: string;
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
  progressCounts?: Record<string, number>;
  activeTraineeCount?: number;
  publishedVersionNumber?: number | null;
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
  progressCounts = {},
  activeTraineeCount = 0,
  publishedVersionNumber = null,
  versions = [],
}: PlanCanvasBuilderProps) {
  const router = useRouter();
  const [availableMilestones, setAvailableMilestones] = useState<LibraryMilestone[]>(libraryMilestones);

  useEffect(() => {
    setAvailableMilestones(libraryMilestones);
  }, [libraryMilestones]);

  const [currentVersion, setCurrentVersion] = useState({
    id: initialVersion.id,
    versionNumber: initialVersion.versionNumber,
    status: initialVersion.status,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notice, setNotice] = useState<CanvasNotice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const setSaveMessage = useCallback((message: string | null) => setNotice(message ? { message, tone: "success" } : null), []);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPathNavigationOpen, setIsPathNavigationOpen] = useState(true);
  const libraryReopenButton = useRef<HTMLButtonElement>(null);
  const libraryFocusRequested = useRef(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [addingToPath, setAddingToPath] = useState<DevelopmentPath | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<EditableMilestoneTarget | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "tree">("canvas");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ ids: string[]; detail: boolean } | null>(null);
  const [focusedPath, setFocusedPath] = useState<DevelopmentPath | null>(DevelopmentPath.ONBOARDING);

  const desktop = useMediaQuery("(min-width: 768px)");
  const effectiveViewMode = desktop ? viewMode : "tree";

  useEffect(() => {
    setIsPathNavigationOpen(window.matchMedia("(min-width: 1280px)").matches);
  }, [desktop]);

  useEffect(() => {
    if (!libraryFocusRequested.current) return;
    libraryFocusRequested.current = false;
    if (isLibraryOpen) document.getElementById("plan-milestone-search")?.focus();
    else libraryReopenButton.current?.focus();
  }, [isLibraryOpen]);

  function setLibraryVisible(visible: boolean) {
    libraryFocusRequested.current = true;
    if (visible) setEditingMilestone(null);
    if (visible && !window.matchMedia("(min-width: 1280px)").matches) setIsPathNavigationOpen(false);
    setIsLibraryOpen(visible);
  }

  function openCanvas() {
    setViewMode("canvas");
  }

  const { fitView, getNode, viewportInitialized } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  // Wait for React Flow's node measurements instead of racing a timeout after drop.
  useEffect(() => {
    if (!focusRequest || !viewportInitialized || !nodesInitialized || effectiveViewMode !== "canvas") return;
    if (focusRequest.ids.some(id => !getNode(id)?.measured?.width)) return;
    void fitView({
      nodes: focusRequest.ids.map(id => ({ id })),
      padding: focusRequest.detail ? 0.6 : 0.25,
      minZoom: focusRequest.detail ? 0.85 : 0.2,
      maxZoom: focusRequest.detail ? 1.05 : 0.95,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
    });
    setFocusRequest(null);
  }, [focusRequest, viewportInitialized, nodesInitialized, effectiveViewMode, fitView, getNode]);

  const showWarning = useCallback((message: string) => setNotice({ message, tone: "error" }), []);

  const initialTree = useMemo(
    () =>
      buildGraphForVersionData(
        initialVersion.nodes,
        initialVersion.edges,
        plan.title,
        plan.roleIdentifier,
        readPathTitles(initialVersion.pathTitles)
      ),
    [initialVersion.nodes, initialVersion.edges, initialVersion.pathTitles, plan.title, plan.roleIdentifier]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialTree.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialTree.edges);
  const canvasElement = useRef<HTMLDivElement>(null);
  const viewportNodes = useRef(nodes);
  viewportNodes.current = nodes;

  // Panels change the available viewport, not the graph or curriculum order.
  useEffect(() => {
    const element = canvasElement.current;
    if (!element || effectiveViewMode !== "canvas") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = editingMilestone?.nodeId;
        setFocusRequest({ ids: target ? [target] : viewportNodes.current.filter(node => !focusedPath || node.data.path === focusedPath).map(node => node.id), detail: !!target });
      });
    });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [effectiveViewMode, focusedPath, editingMilestone?.nodeId, isLibraryOpen, isPathNavigationOpen]);

  // Version management: switching, peeking, and read-only published view
  const [allVersions, setAllVersions] = useState<PlanVersionSummary[]>(versions);
  useEffect(() => {
    setAllVersions(versions);
  }, [versions]);

  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(initialVersion.versionNumber);
  const [peekingVersionNumber, setPeekingVersionNumber] = useState<number | null>(null);
  const effectiveVersionNumber = peekingVersionNumber ?? selectedVersionNumber;

  useEffect(() => {
    setEditingMilestone(null);
    setIsLibraryOpen(false);
  }, [selectedVersionNumber]);

  const publishedVersion = useMemo(
    () => allVersions.find((v) => v.status === "PUBLISHED"),
    [allVersions]
  );
  const draftVersion = useMemo(
    () =>
      allVersions.find((v) => v.status === "DRAFT") ||
      (currentVersion.status === "DRAFT" ? (currentVersion as unknown as PlanVersionSummary) : null),
    [allVersions, currentVersion]
  );

  const nextDraftVersionNumber = useMemo(() => {
    const numbers = allVersions.map((v) => v.versionNumber);
    return Math.max(...numbers, publishedVersion?.versionNumber || 1) + 1;
  }, [allVersions, publishedVersion]);

  const viewedStatus = allVersions.find(version => version.versionNumber === effectiveVersionNumber)?.status
    || (effectiveVersionNumber === currentVersion.versionNumber ? currentVersion.status : "PUBLISHED");
  const isViewingReadOnly = viewedStatus !== "DRAFT" || (effectiveVersionNumber === currentVersion.versionNumber && currentVersion.status === "PUBLISHED");

  const draftGraphRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Preserve working draft edits in ref when in draft view
  useEffect(() => {
    if (
      effectiveVersionNumber === draftVersion?.versionNumber &&
      peekingVersionNumber === null
    ) {
      draftGraphRef.current = { nodes, edges };
    }
  }, [nodes, edges, effectiveVersionNumber, draftVersion?.versionNumber, peekingVersionNumber]);

  // Handler to initialize a new working draft version from the published snapshot
  const handleCreateNewDraft = async () => {
    if (isCreatingDraft) return;
    setIsCreatingDraft(true);
    setSaveMessage(null);

    try {
      const res = await createDraftVersionAction(plan.id);
      if (res.success && res.data) {
        const newDraft = res.data as PlanVersionSummary & {
          nodes: Array<{
            id: string;
            code: string;
            title: string;
            description: string;
            path: string;
            orderIndex: number;
            posX: number;
            posY: number;
            libraryMilestone?: { _count: { materials: number } } | null;
      materialCount?: number;
      stampDesign?: string;
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

        setAllVersions((prev) => {
          const exists = prev.some((v) => v.id === newDraft.id);
          if (exists) return prev.map((v) => (v.id === newDraft.id ? newDraft : v));
          return [newDraft, ...prev];
        });

        setCurrentVersion({
          id: newDraft.id,
          versionNumber: newDraft.versionNumber,
          status: newDraft.status,
        });

        if (newDraft.nodes && newDraft.edges) {
          const layouted = buildGraphForVersionData(
            newDraft.nodes,
            newDraft.edges,
            plan.title,
            plan.roleIdentifier,
            readPathTitles(newDraft.pathTitles)
          );
          setNodes(layouted.nodes);
          setEdges(layouted.edges);
          draftGraphRef.current = { nodes: layouted.nodes, edges: layouted.edges };
        }

        setSelectedVersionNumber(newDraft.versionNumber);
        setPeekingVersionNumber(null);
        setHasUnsavedChanges(false);
        setSaveMessage(`Draft v${newDraft.versionNumber} created. You can now edit this plan.`);
      } else {
        showWarning(res.error || "Failed to create new draft version.");
      }
    } catch (err) {
      console.error("Error creating draft version:", err);
      showWarning("Could not create draft version. Please try again.");
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handleSwitchVersion = useCallback(
    (targetVerNum: number) => {
      if (targetVerNum === effectiveVersionNumber && peekingVersionNumber === null) return;

      // Save draft edits before leaving draft view
      if (effectiveVersionNumber === draftVersion?.versionNumber && peekingVersionNumber === null) {
        draftGraphRef.current = { nodes, edges };
      }

      setPeekingVersionNumber(null);
      setSelectedVersionNumber(targetVerNum);

      if (targetVerNum === draftVersion?.versionNumber && draftGraphRef.current) {
        setNodes(draftGraphRef.current.nodes);
        setEdges(draftGraphRef.current.edges);
        return;
      }

      const targetVer = allVersions.find((v) => v.versionNumber === targetVerNum);
      if (targetVer?.nodes && targetVer?.edges) {
        const layouted = buildGraphForVersionData(
          targetVer.nodes,
          targetVer.edges,
          plan.title,
          plan.roleIdentifier,
          readPathTitles(targetVer.pathTitles)
        );
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    },
    [
      effectiveVersionNumber,
      peekingVersionNumber,
      draftVersion?.versionNumber,
      nodes,
      edges,
      allVersions,
      plan.title,
      plan.roleIdentifier,
      setNodes,
      setEdges,
    ]
  );

  const handleStartPeek = useCallback(
    (targetVerNum: number) => {
      if (targetVerNum === effectiveVersionNumber) return;

      if (effectiveVersionNumber === draftVersion?.versionNumber && peekingVersionNumber === null) {
        draftGraphRef.current = { nodes, edges };
      }

      setPeekingVersionNumber(targetVerNum);

      const targetVer = allVersions.find((v) => v.versionNumber === targetVerNum);
      if (targetVer?.nodes && targetVer?.edges) {
        const layouted = buildGraphForVersionData(
          targetVer.nodes,
          targetVer.edges,
          plan.title,
          plan.roleIdentifier,
          readPathTitles(targetVer.pathTitles)
        );
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    },
    [
      effectiveVersionNumber,
      peekingVersionNumber,
      draftVersion?.versionNumber,
      nodes,
      edges,
      allVersions,
      plan.title,
      plan.roleIdentifier,
      setNodes,
      setEdges,
    ]
  );

  const handleEndPeek = useCallback(() => {
    if (peekingVersionNumber === null) return;
    const targetVerNum = selectedVersionNumber;
    setPeekingVersionNumber(null);

    if (targetVerNum === draftVersion?.versionNumber && draftGraphRef.current) {
      setNodes(draftGraphRef.current.nodes);
      setEdges(draftGraphRef.current.edges);
    } else {
      const targetVer = allVersions.find((v) => v.versionNumber === targetVerNum);
      if (targetVer?.nodes && targetVer?.edges) {
        const layouted = buildGraphForVersionData(
          targetVer.nodes,
          targetVer.edges,
          plan.title,
          plan.roleIdentifier,
          readPathTitles(targetVer.pathTitles)
        );
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    }
  }, [
    peekingVersionNumber,
    selectedVersionNumber,
    draftVersion?.versionNumber,
    allVersions,
    plan.title,
    plan.roleIdentifier,
    setNodes,
    setEdges,
  ]);

  // Diff metrics between working canvas and live published version
  const publishedNodeCodes = useMemo(
    () => new Set(publishedVersion?.nodes?.map((n) => n.code) || []),
    [publishedVersion]
  );

  const draftMilestoneNodes = useMemo(
    () => nodes.filter((n) => n.type === "milestone"),
    [nodes]
  );

  const newMilestonesCount = useMemo(
    () => draftMilestoneNodes.filter((n) => !publishedNodeCodes.has(n.data.code as string)).length,
    [draftMilestoneNodes, publishedNodeCodes]
  );

  const retainedMilestonesCount = useMemo(
    () => draftMilestoneNodes.filter((n) => publishedNodeCodes.has(n.data.code as string)).length,
    [draftMilestoneNodes, publishedNodeCodes]
  );

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
      if (isViewingReadOnly) {
        showWarning("You are viewing a published version (read-only). Switch to Working Draft to add milestones.");
        return;
      }

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
    [isViewingReadOnly, placedCodes, nodes, edges, setNodes, setEdges, showWarning]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isViewingReadOnly) {
        showWarning("You are viewing a published version (read-only). Switch to Working Draft to add milestones.");
        return;
      }
      const rawData = event.dataTransfer.getData("application/reactflow");
      if (!rawData) return;
      try {
        const payload = JSON.parse(rawData);
        const milestone = availableMilestones.find(item => item.id === payload.id) || libraryMilestones.find(item => item.id === payload.id);
        if (milestone) addLibraryMilestone(milestone);
      } catch (err) {
        console.error("Failed to parse dropped milestone:", err);
      }
    },
    [isViewingReadOnly, libraryMilestones, availableMilestones, addLibraryMilestone, showWarning]
  );

  const [progressOverrides, setProgressOverrides] = useState<Record<string, number>>({});
  const deleting = useRef(new Set<string>());
  const handleRenamePath = useCallback((path: DevelopmentPath, title: string) => {
    if (isViewingReadOnly || !title.trim() || title.trim().length > 80) return;
    setNodes(previous => previous.map(node => node.type === "pathRoot" && node.data.path === path ? { ...node, data: { ...node.data, title: title.trim() } } : node));
    setHasUnsavedChanges(true);
  }, [isViewingReadOnly, setNodes]);
  const currentPathTitles = useMemo(() => readPathTitles(Object.fromEntries(nodes.filter(node => node.type === "pathRoot").map(node => [String(node.data.path), String(node.data.title)]))), [nodes]);
  const versionDiff = useMemo(() => computePlanVersionDiff(
    (publishedVersion?.nodes || []).map(node => ({ ...node, hasProgress: Math.max(progressCounts[`code:${node.code.toUpperCase()}`] || 0, progressCounts[`library:${node.libraryMilestoneId}`] || 0, progressOverrides[node.code] || 0) > 0 })),
    nodes.filter(node => node.type === "milestone").map(node => ({ code: String(node.data.code), title: String(node.data.title), path: String(node.data.path), orderIndex: Number(node.data.orderIndex), libraryMilestoneId: node.data.libraryMilestoneId as string | null })),
    publishedVersion?.pathTitles, currentPathTitles
  ), [publishedVersion, nodes, progressCounts, progressOverrides, currentPathTitles]);

  // Callbacks for node/edge actions
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (isViewingReadOnly || deleting.current.has(nodeId)) return;
    const node = nodes.find(node => node.id === nodeId && node.type === "milestone");
    if (!node) return;
    deleting.current.add(nodeId);
    try {
      const result = await getMilestoneProgressCountAction(plan.id, String(node.data.code), node.data.libraryMilestoneId as string | null);
      if (!result.success) { showWarning(result.error); return; }
      const count = result.data.traineeCount;
      setProgressOverrides(previous => ({ ...previous, [String(node.data.code)]: count }));
      if (count && !window.confirm(`${count} trainees have progress on this milestone. Their completed stamps will be preserved in archived status when this version is published. Remove this milestone?`)) return;
      setNodes(previous => previous.filter(node => node.id !== nodeId));
      setEdges(previous => previous.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
      setHasUnsavedChanges(true);
    } catch { showWarning("Could not check milestone progress. Please retry."); }
    finally { deleting.current.delete(nodeId); }
  }, [isViewingReadOnly, nodes, plan.id, setNodes, setEdges, showWarning]);

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
      if (isViewingReadOnly) return;
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
    [nodes, setNodes, isViewingReadOnly]
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
          orderIndex: Math.max(0, ...nodes.filter(node => node.type === "milestone" && node.data.path === form.path).map(node => Number(node.data.orderIndex))) + 1,
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

      // Register in shared milestone library if requested
      if (form.addToLibrary !== false) {
        const newLibraryItem: LibraryMilestone = {
          id: `custom-def-${form.code.toLowerCase()}`,
          code: form.code,
          title: form.title,
          description: form.description,
          path: form.path,
          orderIndex: Math.max(0, ...nodes.filter(node => node.type === "milestone" && node.data.path === form.path).map(node => Number(node.data.orderIndex))) + 1,
          isStandard: false,
        };
        setAvailableMilestones((prev) => {
          if (prev.some((m) => m.code === form.code)) return prev;
          return [...prev, newLibraryItem];
        });

        createCustomLibraryMilestoneAction({
          code: form.code,
          title: form.title,
          description: form.description,
          path: form.path,
        }).catch((err) => console.error("Could not persist custom milestone to library:", err));
      }

      setSaveMessage(`Custom milestone "${form.code}" added to plan and shared library.`);
      setFocusedPath(form.path);
      setFocusRequest({ ids: [newNodeId], detail: true });

    },
    [nodes, edges, nodeCountMap, setNodes, setEdges]
  );

  // Handle editing custom milestone from canvas
  const handleEditNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setIsLibraryOpen(false);
      if (!window.matchMedia("(min-width: 1280px)").matches) setIsPathNavigationOpen(false);
      setEditingMilestone({
        nodeId: node.id,
        id: (node.data.libraryMilestoneId as string) || undefined,
        code: node.data.code as string,
        title: node.data.title as string,
        description: node.data.description as string,
        path: node.data.path as DevelopmentPath,
        stampDesign: resolveStampDesign(node.data.stampDesign as string, node.data.path as string),
        designOnly: !node.data.isCustom,
      });
    },
    [nodes]
  );

  const handleMaterialCountChange = useCallback((count: number) => {
    if (!editingMilestone?.nodeId) return;
    setNodes(previous => previous.map(node => node.id === editingMilestone.nodeId ? { ...node, data: { ...node.data, materialCount: count } } : node));
  }, [editingMilestone?.nodeId, setNodes]);

  // Handle editing custom milestone from library drawer
  const handleEditLibraryMilestone = useCallback(
    (milestone: LibraryMilestone) => {
      const canvasNode = nodes.find((n) => n.data.code === milestone.code);
      setIsLibraryOpen(false);
      setEditingMilestone({
        nodeId: canvasNode?.id,
        id: milestone.id,
        libraryEdit: true,
        code: milestone.code,
        title: milestone.title,
        description: milestone.description,
        path: milestone.path as DevelopmentPath,
      });
    },
    [nodes]
  );

  // Handle saving edited custom milestone
  const handleSaveEditedMilestone = useCallback(
    async (updated: EditableMilestoneTarget) => {
      // 1. Update matching node on canvas
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const matches =
            (updated.nodeId && n.id === updated.nodeId) ||
            n.data.code === updated.code;
          if (!matches) return n;
          return {
            ...n,
            data: {
              ...n.data,
              code: updated.code,
              title: updated.title,
              description: updated.description,
              path: updated.path,
              stampDesign: updated.stampDesign,
            },
          };
        })
      );

      if (updated.designOnly || !updated.libraryEdit) { setHasUnsavedChanges(true); return; }

      // 2. Update matching item in availableMilestones list
      setAvailableMilestones((prev) =>
        prev.map((m) => {
          const matches =
            (updated.id && m.id === updated.id) || m.code === updated.code;
          if (!matches) return m;
          return {
            ...m,
            code: updated.code,
            title: updated.title,
            description: updated.description,
            path: updated.path,
          };
        })
      );

      setHasUnsavedChanges(true);

      // 3. Persist update to database
      try {
        const res = await updateCustomLibraryMilestoneAction(
          { id: updated.id, code: updated.code },
          {
            code: updated.code,
            title: updated.title,
            description: updated.description,
            path: updated.path,
          }
        );
        if (res.success) {
          setSaveMessage(`Custom milestone "${updated.code}" updated successfully.`);

        }
      } catch (err) {
        console.error("Failed to update milestone:", err);
      }
    },
    [setNodes]
  );

  // Handle deleting custom milestone from library drawer
  const handleDeleteLibraryMilestone = useCallback(
    async (milestone: LibraryMilestone) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete custom competency "${milestone.code}: ${milestone.title}" from the shared library?`
      );
      if (!confirmed) return;

      // Remove from availableMilestones in drawer
      setAvailableMilestones((prev) =>
        prev.filter((m) => m.code !== milestone.code && m.id !== milestone.id)
      );

      try {
        const res = await deleteCustomLibraryMilestoneAction({
          id: milestone.id,
          code: milestone.code,
        });
        if (res.success) {
          setSaveMessage(`Custom milestone "${milestone.code}" deleted from library.`);

        }
      } catch (err) {
        console.error("Failed to delete milestone:", err);
      }
    },
    []
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
            onRename: !isViewingReadOnly ? handleRenamePath : undefined,
            childCount: nodeCountMap[pathKey] || 0,
            onAddMilestone: !isViewingReadOnly
              ? (targetPath: DevelopmentPath) => {
                  setAddingToPath(targetPath);
                }
              : undefined,
          },
        };
      }
      if (node.type === "milestone") {
        const code = node.data.code as string;
        let versionTag: "new" | "live" | null = null;
        let versionTooltip: string | undefined = undefined;

        if (isViewingReadOnly) {
          versionTag = "live";
          versionTooltip = `Live Version ${effectiveVersionNumber} milestone (locked)`;
        } else if (publishedVersion) {
          if (!publishedNodeCodes.has(code)) {
            versionTag = "new";
            versionTooltip = `Newly added in Draft v${currentVersion.versionNumber} · Not yet in Live v${publishedVersion.versionNumber}`;
          } else {
            versionTag = "live";
            versionTooltip = `Active in Live v${publishedVersion.versionNumber} · Retained in Draft v${currentVersion.versionNumber}`;
          }
        }

        return {
          ...node,
          draggable: !isViewingReadOnly,
          data: {
            ...node.data,
            readOnly: isViewingReadOnly,
            versionTag,
            versionTooltip,
            onAttachMaterials: !isViewingReadOnly ? () => handleEditNode(node.id) : undefined,
            onEdit: !isViewingReadOnly ? () => handleEditNode(node.id) : undefined,
            onDelete: !isViewingReadOnly ? handleDeleteNode : undefined,
          },
        };
      }
      return node;
    });
  }, [
    nodes,
    nodeCountMap,
    isViewingReadOnly,
    effectiveVersionNumber,
    publishedVersion,
    publishedNodeCodes,
    currentVersion.versionNumber,
    handleDeleteNode,
    handleRenamePath,
    handleEditNode,
    setAddingToPath,
  ]);

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
    if (isSaving || isPublishing) return;
    if (isViewingReadOnly) {
      showWarning("Cannot save edits on a published version snapshot. Switch to Working Draft to edit.");
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);

    const persistentNodes = nodes
      .filter((n) => n.type === "milestone")
      .map((n, index) => ({
        id: n.id,
        libraryMilestoneId: (n.data.libraryMilestoneId as string) || null,
        path: n.data.path as DevelopmentPath,
        code: n.data.code as string,
        title: n.data.title as string,
        description: n.data.description as string,
        orderIndex: (n.data.orderIndex as number) || index + 1,
        stampDesign: resolveStampDesign(n.data.stampDesign as string, n.data.path as string),
        posX: Math.round(n.position.x),
        posY: Math.round(n.position.y),
        isCustom: (n.data.isCustom as boolean) ?? true,
      }));

    const persistentEdges = edges.filter(edge => !edge.id.startsWith("overview-")).map((e) => ({
      sourceNodeId: e.source,
      targetNodeId: e.target,
      edgeType: "PARENT_CHILD" as const,
    }));

    try {
      const res = await savePlanVersionAction({
        planId: plan.id,
        pathTitles: currentPathTitles,
        publishedById: "",
        status: "DRAFT",
        changelog: `Saved canvas draft for version ${currentVersion.versionNumber}`,
        nodes: persistentNodes,
        edges: persistentEdges,
      });

      if (res.success) {
        setHasUnsavedChanges(false);
        setSaveMessage("Draft saved.");
      } else {
        showWarning(res.error || "Failed to save draft.");
      }
    } catch {
      showWarning("Could not save the draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const individualPublishGraph = useMemo(() => {
    const persistentNodes = nodes
      .filter((n) => n.type === "milestone")
      .map((n, index) => ({
        id: n.id,
        libraryMilestoneId: (n.data.libraryMilestoneId as string) || null,
        path: n.data.path as DevelopmentPath,
        code: n.data.code as string,
        title: n.data.title as string,
        description: n.data.description as string,
        orderIndex: (n.data.orderIndex as number) || index + 1,
        stampDesign: resolveStampDesign(n.data.stampDesign as string, n.data.path as string),
        posX: Math.round(n.position.x),
        posY: Math.round(n.position.y),
        isCustom: (n.data.isCustom as boolean) ?? true,
      }));

    const persistentEdges = edges.filter(edge => !edge.id.startsWith("overview-")).map((e) => ({
      sourceNodeId: e.source,
      targetNodeId: e.target,
      edgeType: "PARENT_CHILD" as const,
    }));

    return { nodes: persistentNodes, edges: persistentEdges, pathTitles: currentPathTitles };
  }, [nodes, edges, currentPathTitles]);

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
        id: n.id,
        libraryMilestoneId: (n.data.libraryMilestoneId as string) || null,
        path: n.data.path as DevelopmentPath,
        code: n.data.code as string,
        title: n.data.title as string,
        description: n.data.description as string,
        orderIndex: (n.data.orderIndex as number) || index + 1,
        stampDesign: resolveStampDesign(n.data.stampDesign as string, n.data.path as string),
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
      pathTitles: currentPathTitles,
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
          preservedProgressCount: number;
          archivedProgressCount: number;
          injectedProgressCount: number;
        } | null;
      };

      const syncResult = resData?.reconcileResult;
      const syncInfo = syncResult
        ? ` (${syncResult.migratedTraineesCount} trainees migrated: ${syncResult.preservedProgressCount} preserved, ${syncResult.injectedProgressCount} added)`
        : "";

      setSaveMessage(`Version ${currentVersion.versionNumber} published!${syncInfo}`);
      router.refresh();

    } else {
      showWarning(res.error || "Failed to publish plan version.");
    }
  };

  function focusPath(path: DevelopmentPath | null) {
    setFocusedPath(path);
    setFocusRequest({ ids: nodes.filter(node => !path || node.data.path === path).map(node => node.id), detail: false });
    if (!window.matchMedia("(min-width: 1280px)").matches) setIsPathNavigationOpen(false);
  }

  function closeInspector() {
    setIsLibraryOpen(false);
    setEditingMilestone(null);
  }

  const versionStatus = peekingVersionNumber !== null
    ? `Previewing published v${peekingVersionNumber}. Move away to return to your draft.`
    : isViewingReadOnly
    ? `Published v${effectiveVersionNumber} · Read only · ${activeTraineeCount} enrolled ${activeTraineeCount === 1 ? "trainee" : "trainees"}`
    : publishedVersion
    ? `Draft v${currentVersion.versionNumber} · ${retainedMilestonesCount} retained · ${newMilestonesCount} new. Trainees remain on published v${publishedVersion.versionNumber}.`
    : `Draft v${currentVersion.versionNumber} · Publish to make this plan available for assignment.`;

  return (
    <div className="relative flex h-[calc(100dvh-16rem)] min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-xl border border-beat-border bg-white md:h-[calc(100dvh-9rem)] md:min-h-[32rem]">
      <CanvasNotification notice={notice} onDismiss={dismissNotice} />
      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-beat-border px-3 py-3 md:px-4">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 md:basis-0">
          <Link href="/trainer/plans" aria-label="Back to training plans" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-beat-maroon hover:bg-beat-canvas"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <h2 title={plan.title} className="truncate text-sm font-semibold text-beat-maroon md:text-base">{plan.title}</h2>
            <p className="mt-1 text-xs text-beat-maroon/75">{isViewingReadOnly ? `Published v${effectiveVersionNumber}` : `Draft v${currentVersion.versionNumber}`}<span role="status" aria-atomic="true">{hasUnsavedChanges ? " · Unsaved edits" : ""}</span></p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 md:w-auto">
          <details className="relative" onKeyDown={event => { if (event.key === "Escape") { handleEndPeek(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-xs font-medium text-beat-maroon hover:bg-beat-canvas [&::-webkit-details-marker]:hidden"><History aria-hidden="true" className="h-4 w-4 sm:hidden" /><span className="sr-only sm:not-sr-only">Versions</span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /></summary>
            <div className="absolute left-0 z-40 mt-1 w-64 rounded-lg border border-beat-border bg-white p-2 text-xs text-beat-maroon md:left-auto md:right-0">
              <p className="break-words px-2 py-2 text-beat-maroon/75">{plan.roleIdentifier.replace(/_/g, " ")}</p>
              {publishedVersion && <button type="button" className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-beat-canvas" aria-pressed={effectiveVersionNumber === publishedVersion.versionNumber} onMouseEnter={editingMilestone ? undefined : () => handleStartPeek(publishedVersion.versionNumber)} onMouseLeave={event => { if (event.currentTarget.closest("details")?.open) handleEndPeek(); }} onClick={event => { handleSwitchVersion(publishedVersion.versionNumber); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Published v{publishedVersion.versionNumber} · {activeTraineeCount} enrolled</button>}
              {draftVersion && <button type="button" className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-beat-canvas" aria-pressed={effectiveVersionNumber === draftVersion.versionNumber} onClick={event => { handleSwitchVersion(draftVersion.versionNumber); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Draft v{draftVersion.versionNumber}</button>}
              <button type="button" className="flex min-h-11 w-full items-center gap-2 border-t border-beat-border px-3 text-left hover:bg-beat-canvas" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); setIsHistoryModalOpen(true); }}><History aria-hidden="true" className="h-4 w-4" />Version history</button>
            </div>
          </details>
          {isViewingReadOnly ? draftVersion ? <button type="button" onClick={() => handleSwitchVersion(draftVersion.versionNumber)} className="beat-primary">Edit draft v{draftVersion.versionNumber}</button> : <button type="button" onClick={handleCreateNewDraft} disabled={isCreatingDraft} className="beat-primary">{isCreatingDraft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}{isCreatingDraft ? "Creating…" : "New draft"}</button> : <>
            <button type="button" onClick={onSaveDraft} disabled={isSaving || isPublishing} aria-busy={isSaving} className="beat-control">{isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-beat-gold" /> : <Save aria-hidden="true" className="h-4 w-4 text-beat-gold" />}{isSaving ? "Saving…" : "Save draft"}</button>
            <button type="button" onClick={() => setIsPublishModalOpen(true)} disabled={isSaving || isPublishing} className="beat-primary"><Send aria-hidden="true" className="h-4 w-4 text-beat-gold" />Publish</button>
          </>}
        </div>
      </header>

      <div className="z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-beat-border bg-beat-canvas px-3 py-2 text-beat-maroon md:px-4">
        <button type="button" className="beat-control hidden md:inline-flex" aria-expanded={isPathNavigationOpen} aria-controls="builder-path-navigation" onClick={() => setIsPathNavigationOpen(previous => !previous)}>{isPathNavigationOpen ? <PanelLeftClose aria-hidden="true" className="h-4 w-4" /> : <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />}Paths</button>
        <label className="min-w-0 flex-1 md:hidden"><span className="sr-only">Development path</span><select aria-label="Development path" value={focusedPath || ""} onChange={event => focusPath((event.target.value || null) as DevelopmentPath | null)} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-2 text-xs"><option value="">Whole plan</option>{INITIAL_PATH_ROOTS.map(root => <option key={root.id} value={root.path}>{currentPathTitles[root.path] || root.title}</option>)}</select></label>
        <div role="group" aria-label="Plan view" className="hidden items-center gap-1 md:flex">
          <button type="button" className="beat-segment" aria-label="Canvas view" aria-pressed={effectiveViewMode === "canvas"} onClick={openCanvas}><Network aria-hidden="true" className="h-4 w-4" />Canvas</button>
          <button type="button" className="beat-segment" aria-label="Outline view" aria-pressed={effectiveViewMode === "tree"} onClick={() => setViewMode("tree")}><ListTree aria-hidden="true" className="h-4 w-4" />Outline</button>
        </div>
        <button id="builder-library-toggle" ref={libraryReopenButton} type="button" aria-label={isLibraryOpen ? "Close milestone library" : "Open milestone library"} aria-expanded={isLibraryOpen} aria-controls="builder-inspector" className="beat-control" onClick={() => setLibraryVisible(!isLibraryOpen)}><BookOpen aria-hidden="true" className="h-4 w-4" /><span>Milestones</span></button>
        {effectiveViewMode === "canvas" && <details className="relative" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-xs hover:bg-white [&::-webkit-details-marker]:hidden">Canvas options<ChevronDown aria-hidden="true" className="h-3 w-3" /></summary>
          <div className="absolute left-0 z-40 mt-1 w-48 rounded-lg border border-beat-border bg-white p-1 text-xs">
            <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 hover:bg-beat-canvas disabled:opacity-40" disabled={isSaving || isPublishing || isViewingReadOnly} onClick={event => { onLayout(); event.currentTarget.closest("details")?.removeAttribute("open"); }}><LayoutGrid aria-hidden="true" className="h-4 w-4" />Arrange</button>
            <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 hover:bg-beat-canvas" onClick={event => { focusPath(null); event.currentTarget.closest("details")?.removeAttribute("open"); }}><Maximize2 aria-hidden="true" className="h-4 w-4" />Fit whole plan</button>
          </div>
        </details>}
        <aside aria-label="Version status" title={versionStatus} className="min-w-0 basis-full text-xs leading-relaxed text-beat-maroon/75 xl:ml-auto xl:basis-auto xl:truncate">{versionStatus}</aside>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {isPathNavigationOpen && <aside id="builder-path-navigation" aria-label="Development paths" className="absolute inset-y-0 left-0 z-10 hidden w-52 shrink-0 flex-col overflow-y-auto border-r border-beat-border bg-white p-3 md:flex xl:static xl:z-auto">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-beat-maroon">Development paths</h3><button type="button" aria-label="Collapse path navigation" className="flex h-9 w-9 items-center justify-center rounded-md text-beat-maroon hover:bg-beat-canvas" onClick={() => setIsPathNavigationOpen(false)}><PanelLeftClose aria-hidden="true" className="h-4 w-4" /></button></div>
          <nav aria-label="Focus development path" className="space-y-1">
            <button type="button" aria-pressed={focusedPath === null} onClick={() => focusPath(null)} className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-semibold ${focusedPath === null ? "bg-beat-maroon text-white" : "text-beat-maroon hover:bg-beat-canvas"}`}><Maximize2 aria-hidden="true" className="h-4 w-4" />Whole plan</button>
            {INITIAL_PATH_ROOTS.map(root => <button key={root.id} type="button" aria-pressed={focusedPath === root.path} onClick={() => focusPath(root.path)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-xs font-semibold ${focusedPath === root.path ? "bg-beat-maroon text-white" : "text-beat-maroon hover:bg-beat-canvas"}`}><span className="min-w-0 break-words">{currentPathTitles[root.path] || root.title}</span><span className="tabular-nums text-beat-gold">{nodeCountMap[root.path] || 0}</span></button>)}
          </nav>
          <p className="mt-auto pt-6 text-xs leading-relaxed text-beat-maroon/75">{nodes.filter(node => node.type === "milestone").length} milestones · {activeTraineeCount} enrolled trainees</p>
        </aside>}
      {effectiveViewMode === "tree" ? (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-beat-canvas/30">
          <PlanTreeView
            nodes={nodes}
            focusedPath={focusedPath}
            onInspectNode={handleEditNode}
            onRenamePath={handleRenamePath}
            readOnly={isViewingReadOnly}
            onEditNode={handleEditNode}
            onUpdateNode={(id, data) => { if (isViewingReadOnly) return; setNodes(previous => previous.map(node => node.id === id && node.data.isCustom ? { ...node, data: { ...node.data, ...data } } : node)); setHasUnsavedChanges(true); }}
            onDeleteNode={handleDeleteNode}
            onAddMilestone={(p) => setAddingToPath(p)}
            onReorderMilestones={handleReorderMilestones}
          />
        </div>
      ) : (
        <div
          ref={canvasElement}
          className="beat-canvas relative min-h-0 min-w-0 flex-1"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >

          <ReactFlow
            nodes={augmentedNodes}
            edges={augmentedEdges}
            deleteKeyCode={null}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => { if (node.type === "milestone") handleEditNode(node.id); }}
            onNodesChange={onNodesChange}
            onNodeDragStop={(_, moved) => {
              if (isViewingReadOnly || moved.type !== "milestone") return;
              const path = moved.data.path;
              const draftNodes = nodes.map(node => node.id === moved.id ? { ...node, position: moved.position } : node);
              const ordered = draftNodes.filter(node => node.type === "milestone" && node.data.path === path).sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id));
              const indices = new Map(ordered.map((node, index) => [node.id, index + 1]));
              const layout = getLayoutedElements(draftNodes.map(node => indices.has(node.id) ? { ...node, data: { ...node.data, orderIndex: indices.get(node.id) } } : node), edges, { direction: "TB" });
              setNodes(layout.nodes); setEdges(layout.edges); setHasUnsavedChanges(true);
            }}
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
              Select a milestone to inspect it. Drag to reorder within its path.
            </Panel>
          </ReactFlow>
        </div>
      )}

      <BuilderInspector open={isLibraryOpen || editingMilestone !== null} desktop={desktop} label={isLibraryOpen ? "Milestone library" : "Milestone inspector"} onClose={closeInspector}>
        <MilestoneLibraryDrawer
          isOpen={isLibraryOpen}
          onClose={closeInspector}
          milestones={availableMilestones}
          placedCodes={placedCodes}
          onAddMilestone={addLibraryMilestone}
          onEditMilestone={handleEditLibraryMilestone}
          onDeleteMilestone={handleDeleteLibraryMilestone}
          className="flex min-h-0 flex-1 flex-col bg-white text-beat-maroon"
        />
        <EditMilestoneModal
          isOpen={editingMilestone !== null}
          presentation="inspector"
          readOnly={isViewingReadOnly && !editingMilestone?.libraryEdit}
          onClose={closeInspector}
          milestone={editingMilestone}
          existingCodes={placedCodes}
          onSave={handleSaveEditedMilestone}
          onMaterialCountChange={handleMaterialCountChange}
        />
      </BuilderInspector>
      </div>

      {/* Custom Milestone Creation Modal */}
      <CreateMilestoneModal
        isOpen={addingToPath !== null}
        onClose={() => setAddingToPath(null)}
        path={addingToPath}
        pathDisplayName={addingToPath ? pathTitle(addingToPath, currentPathTitles) : undefined}
        roleIdentifier={plan.roleIdentifier}
        existingCodes={placedCodes}
        onSubmit={handleCreateCustomMilestone}
      />

      {/* Publish Plan Modal */}
      {plan.isIndividualInstance ? <IndividualPublishModal
        key={isPublishModalOpen ? "open" : "closed"}
        isOpen={isPublishModalOpen}
        planId={plan.id}
        graph={individualPublishGraph}
        onClose={() => setIsPublishModalOpen(false)}
        onPublished={count => {
          setIsPublishModalOpen(false); setHasUnsavedChanges(false);
          setCurrentVersion(version => ({ ...version, status: "PUBLISHED" }));
          setSaveMessage(`Published changes for ${count} ${count === 1 ? "trainee" : "trainees"}. Progress and stamps preserved.`);
          router.refresh();
        }}
      /> : <PublishPlanModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        planTitle={plan.title}
        roleIdentifier={plan.roleIdentifier}
        restaurantBrand={plan.restaurantBrand}
        versionNumber={currentVersion.versionNumber}
        diff={versionDiff}
        pathTitles={currentPathTitles}
        nodeCounts={nodeCountMap}
        totalMilestones={nodes.filter((n) => n.type === "milestone").length}
        activeTraineeCount={activeTraineeCount}
        isPublishing={isPublishing}
        onConfirmPublish={handleConfirmPublish}
      />}

      {/* Plan Version History Modal */}
      <PlanVersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        planTitle={plan.title}
        currentVersionNumber={effectiveVersionNumber}
        versions={allVersions}
        onSelectVersion={handleSwitchVersion}
        onCreateDraft={handleCreateNewDraft}
        nextDraftVersionNumber={nextDraftVersionNumber}
      />
    </div>
  );
}
