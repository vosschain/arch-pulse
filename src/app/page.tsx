"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ArchGraph from "@/components/ArchGraph";
import HealthTable from "@/components/HealthTable";
import Toolbar from "@/components/Toolbar";
import MenuBar, { type ModalTarget } from "@/components/MenuBar";
import AboutModal from "@/components/AboutModal";
import ControlsGuide from "@/components/ControlsGuide";
import type { ScanResult } from "@/types";

export default function HomePage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Undo / Redo state ──
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);

  // ── Modal state ──
  const [activeModal, setActiveModal] = useState<ModalTarget>(null);

  // ── Last scan path (for re-scan) ──
  const lastPathRef = useRef<string>("");

  // Auto-dismiss toast after 6s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const handleScan = async (folderPath: string) => {
    lastPathRef.current = folderPath;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Scan failed");
      }
      const data: ScanResult = await res.json();
      setScanResult(data);
      // Reset undo/redo on new scan
      setCanUndo(false);
      setCanRedo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescan = useCallback(() => {
    if (lastPathRef.current) handleScan(lastPathRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(() => setUndoTrigger((n) => n + 1), []);
  const handleRedo = useCallback(() => setRedoTrigger((n) => n + 1), []);
  const handleFitView = useCallback(() => setFitViewTrigger((n) => n + 1), []);

  const handleUndoRedoChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "r" && !e.shiftKey) {
        e.preventDefault();
        handleRescan();
      } else if ((e.key === "e" || e.key === "E") && !e.shiftKey) {
        // Ctrl+E: open export — handled in MenuBar, just prevent default here
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, handleRescan]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ── Toast notification ── */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border border-red-700 bg-red-950/90 shadow-xl backdrop-blur-sm max-w-lg w-max">
          <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-red-300 font-semibold text-sm">Scan Error</p>
            <p className="text-red-400 text-xs mt-0.5 break-words">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-300 leading-none text-lg ml-1 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Menu bar (File / Edit / Help) ── */}
      <MenuBar
        scanResult={scanResult}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRescan={handleRescan}
        onFitView={handleFitView}
        onOpenModal={setActiveModal}
      />

      {/* ── Toolbar (path input + scan button) ── */}
      <Toolbar onScan={handleScan} isLoading={isLoading} />

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph viewport */}
        <div className="flex-1 relative">
          {!scanResult && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-6xl">🫀</div>
                <p className="text-slate-400 text-lg font-medium">ArchPulse</p>
                <p className="text-slate-600 text-sm max-w-xs">
                  Enter a project folder path above and click Scan to visualize
                  your codebase architecture.
                </p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="animate-spin text-4xl">⟳</div>
                <p className="text-slate-400">Scanning project…</p>
              </div>
            </div>
          )}
          {scanResult && !isLoading && (
            <ArchGraph
              scanResult={scanResult}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              undoTrigger={undoTrigger}
              redoTrigger={redoTrigger}
              fitViewTrigger={fitViewTrigger}
              onUndoRedoChange={handleUndoRedoChange}
            />
          )}
        </div>

        {/* Health table panel */}
        {scanResult && (
          <div className="w-80 border-l border-[var(--border)] overflow-y-auto bg-[var(--panel-bg)]">
            <HealthTable
              files={scanResult.files}
              selectedNodeId={selectedNodeId}
              onRowClick={setSelectedNodeId}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {activeModal === "about" && (
        <AboutModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "controls" && (
        <ControlsGuide onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
