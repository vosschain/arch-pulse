"use client";

import { useEffect, useMemo, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  type Node,
  type Edge,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import FileNode from "./FileNode";
import ProjectInfoOverlay from "./ProjectInfoOverlay";
import type { ScanResult, ScannedFile, HealthStatus, GitDiffFile } from "@/types";

const nodeTypes = { fileNode: FileNode };

const NODE_WIDTH = 260;
const NODE_HEIGHT = 160;

function layoutNodes(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });
  for (const node of nodes) g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);
  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
    }),
    edges,
  };
}

function buildGraph(
  files: ScannedFile[],
  selectedNodeId: string | null
): { nodes: Node[]; edges: Edge[] } {
  const fileSet = new Set(files.map((f) => f.id));
  const rawNodes: Node[] = files.map((file) => ({
    id: file.id,
    type: "fileNode",
    position: { x: 0, y: 0 },
    data: { file, isSelected: file.id === selectedNodeId },
  }));
  const rawEdges: Edge[] = [];
  for (const file of files) {
    for (const imp of file.imports) {
      if (fileSet.has(imp) && imp !== file.id) {
        rawEdges.push({
          id: `${file.id}->${imp}`,
          source: file.id,
          target: imp,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#334155", strokeWidth: 1.5 },
          markerEnd: { type: "arrowclosed" } as Edge["markerEnd"],
        });
      }
    }
  }
  return layoutNodes(rawNodes, rawEdges);
}

// ─── FitView controller ───────────────────────────────────────────────────────

function FitViewController({ trigger }: { trigger: number }) {
  const { fitView } = useReactFlow();
  const prevRef = useRef(trigger);
  useEffect(() => {
    if (trigger === prevRef.current) return;
    prevRef.current = trigger;
    fitView({ padding: 0.15, duration: 400 });
  }, [trigger, fitView]);
  return null;
}

// ─── Focus controller (F key) ─────────────────────────────────────────────────

interface FocusControllerProps {
  trigger: number;
  nodeId: string | null;
  nodesRef: React.MutableRefObject<Node[]>;
}

function FocusController({ trigger, nodeId, nodesRef }: FocusControllerProps) {
  const { fitBounds } = useReactFlow();
  const prevRef = useRef(trigger);
  useEffect(() => {
    if (trigger === 0 || trigger === prevRef.current) return;
    prevRef.current = trigger;
    if (!nodeId) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    fitBounds(
      { x: node.position.x, y: node.position.y, width: NODE_WIDTH, height: NODE_HEIGHT },
      { padding: 0.35, duration: 500 }
    );
  }, [trigger, nodeId, fitBounds, nodesRef]);
  return null;
}

// ─── ArchGraph Props ──────────────────────────────────────────────────────────

interface ArchGraphProps {
  scanResult: ScanResult;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodeDoubleClick?: (id: string) => void;
  undoTrigger: number;
  redoTrigger: number;
  fitViewTrigger: number;
  focusTrigger: number;
  activeFilters: Set<HealthStatus>;
  gitDiffFiles: Map<string, GitDiffFile>;
  overriddenIds: Set<string>;
  onUndoRedoChange: (canUndo: boolean, canRedo: boolean) => void;
}

// ─── ArchGraph Component ──────────────────────────────────────────────────────

export default function ArchGraph({
  scanResult,
  selectedNodeId,
  onNodeSelect,
  onNodeDoubleClick,
  undoTrigger,
  redoTrigger,
  fitViewTrigger,
  focusTrigger,
  activeFilters,
  gitDiffFiles,
  overriddenIds,
  onUndoRedoChange,
}: ArchGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(scanResult.files, selectedNodeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanResult]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const historyRef = useRef<Node[][]>([]);
  const futureRef = useRef<Node[][]>([]);
  const dragStartSnapshotRef = useRef<Node[] | null>(null);

  const notifyUndoRedo = useCallback(() => {
    onUndoRedoChange(historyRef.current.length > 0, futureRef.current.length > 0);
  }, [onUndoRedoChange]);

  // ── Selected state ──
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isSelected: n.id === selectedNodeId } }))
    );
  }, [selectedNodeId, setNodes]);

  // ── Filter opacity + diff badge + override badge ──
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const file = (n.data as { file: ScannedFile }).file;
        const isFaded = !activeFilters.has(file.health);
        const diffFile = gitDiffFiles.get(file.id);
        const hasOverride = overriddenIds.has(file.id);
        return {
          ...n,
          style: { ...n.style, opacity: isFaded ? 0.15 : 1 },
          data: { ...n.data, isFaded, diffStatus: diffFile?.status ?? null, hasOverride },
        };
      })
    );
    // Fade edges whose source or target is filtered out
    setEdges((eds) =>
      eds.map((e) => {
        const srcFile = scanResult.files.find((f) => f.id === e.source);
        const tgtFile = scanResult.files.find((f) => f.id === e.target);
        const isFaded =
          !activeFilters.has(srcFile?.health ?? "green") ||
          !activeFilters.has(tgtFile?.health ?? "green");
        return {
          ...e,
          style: { ...e.style, opacity: isFaded ? 0.08 : 1 },
        };
      })
    );
  }, [activeFilters, gitDiffFiles, overriddenIds, setNodes, setEdges, scanResult.files]);

  // ── Node drag history ──
  const onNodeDragStart = useCallback(() => {
    dragStartSnapshotRef.current = nodesRef.current.map((n) => ({
      ...n,
      position: { ...n.position },
    }));
  }, []);

  const onNodeDragStop = useCallback(() => {
    if (dragStartSnapshotRef.current) {
      historyRef.current.push(dragStartSnapshotRef.current);
      futureRef.current = [];
      dragStartSnapshotRef.current = null;
      notifyUndoRedo();
    }
  }, [notifyUndoRedo]);

  // ── Undo trigger ──
  const prevUndoTrigger = useRef(undoTrigger);
  useEffect(() => {
    if (undoTrigger === 0 || undoTrigger === prevUndoTrigger.current) return;
    prevUndoTrigger.current = undoTrigger;
    if (historyRef.current.length === 0) return;
    futureRef.current.push(nodesRef.current.map((n) => ({ ...n, position: { ...n.position } })));
    setNodes(historyRef.current.pop()!);
    notifyUndoRedo();
  }, [undoTrigger, setNodes, notifyUndoRedo]);

  // ── Redo trigger ──
  const prevRedoTrigger = useRef(redoTrigger);
  useEffect(() => {
    if (redoTrigger === 0 || redoTrigger === prevRedoTrigger.current) return;
    prevRedoTrigger.current = redoTrigger;
    if (futureRef.current.length === 0) return;
    historyRef.current.push(nodesRef.current.map((n) => ({ ...n, position: { ...n.position } })));
    setNodes(futureRef.current.pop()!);
    notifyUndoRedo();
  }, [redoTrigger, setNodes, notifyUndoRedo]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [selectedNodeId, onNodeSelect]
  );

  const onNodeDblClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeDoubleClick) onNodeDoubleClick(node.id);
    },
    [onNodeDoubleClick]
  );

  const onPaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect]);

  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      <ProjectInfoOverlay scanResult={scanResult} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDblClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        panOnDrag={[2]}
        selectionOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2}
      >
        <FitViewController trigger={fitViewTrigger} />
        <FocusController trigger={focusTrigger} nodeId={selectedNodeId} nodesRef={nodesRef} />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e1e2e" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const health = (n.data as { file: ScannedFile }).file?.health;
            if (health === "red-critical" || health === "red-fast") return "#ef4444";
            if (health === "red-slow") return "#f87171";
            if (health === "yellow") return "#fbbf24";
            return "#22c55e";
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
