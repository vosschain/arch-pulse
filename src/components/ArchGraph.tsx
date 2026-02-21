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
import type { ScanResult, ScannedFile } from "@/types";

// --- Custom node types ---

const nodeTypes = { fileNode: FileNode };

// --- Dagre auto-layout ---

const NODE_WIDTH = 260;
const NODE_HEIGHT = 160;

function layoutNodes(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      };
    }),
    edges,
  };
}

// --- Build graph from scan result ---

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

// --- FitView controller (must render inside ReactFlow for hook context) ---

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

// --- ArchGraph Props ---

interface ArchGraphProps {
  scanResult: ScanResult;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  undoTrigger: number;
  redoTrigger: number;
  fitViewTrigger: number;
  onUndoRedoChange: (canUndo: boolean, canRedo: boolean) => void;
}

// --- ArchGraph Component ---

export default function ArchGraph({
  scanResult,
  selectedNodeId,
  onNodeSelect,
  undoTrigger,
  redoTrigger,
  fitViewTrigger,
  onUndoRedoChange,
}: ArchGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(scanResult.files, selectedNodeId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanResult]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Live ref so undo/redo effects read current nodes without stale closures
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Undo / Redo stacks (refs = no re-render on push/pop)
  const historyRef = useRef<Node[][]>([]);
  const futureRef = useRef<Node[][]>([]);
  const dragStartSnapshotRef = useRef<Node[] | null>(null);

  const notifyUndoRedo = useCallback(() => {
    onUndoRedoChange(
      historyRef.current.length > 0,
      futureRef.current.length > 0,
    );
  }, [onUndoRedoChange]);

  // Update selected state without full re-layout
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: n.id === selectedNodeId },
      }))
    );
  }, [selectedNodeId, setNodes]);

  // Capture pre-drag snapshot
  const onNodeDragStart = useCallback(() => {
    dragStartSnapshotRef.current = nodesRef.current.map((n) => ({
      ...n,
      position: { ...n.position },
    }));
  }, []);

  // Commit snapshot to history after drag
  const onNodeDragStop = useCallback(() => {
    if (dragStartSnapshotRef.current) {
      historyRef.current.push(dragStartSnapshotRef.current);
      futureRef.current = [];
      dragStartSnapshotRef.current = null;
      notifyUndoRedo();
    }
  }, [notifyUndoRedo]);

  // Undo trigger effect
  const prevUndoTrigger = useRef(undoTrigger);
  useEffect(() => {
    if (undoTrigger === 0 || undoTrigger === prevUndoTrigger.current) return;
    prevUndoTrigger.current = undoTrigger;
    if (historyRef.current.length === 0) return;
    futureRef.current.push(
      nodesRef.current.map((n) => ({ ...n, position: { ...n.position } }))
    );
    const prev = historyRef.current.pop()!;
    setNodes(prev);
    notifyUndoRedo();
  }, [undoTrigger, setNodes, notifyUndoRedo]);

  // Redo trigger effect
  const prevRedoTrigger = useRef(redoTrigger);
  useEffect(() => {
    if (redoTrigger === 0 || redoTrigger === prevRedoTrigger.current) return;
    prevRedoTrigger.current = redoTrigger;
    if (futureRef.current.length === 0) return;
    historyRef.current.push(
      nodesRef.current.map((n) => ({ ...n, position: { ...n.position } }))
    );
    const next = futureRef.current.pop()!;
    setNodes(next);
    notifyUndoRedo();
  }, [redoTrigger, setNodes, notifyUndoRedo]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [selectedNodeId, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div
      className="w-full h-full relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Project info overlay - top-left, above canvas */}
      <ProjectInfoOverlay scanResult={scanResult} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
        {/* FitView controller - must render inside ReactFlow for context */}
        <FitViewController trigger={fitViewTrigger} />

        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e1e2e"
        />
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
