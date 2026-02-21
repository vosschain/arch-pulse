"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ArchGraph from "@/components/ArchGraph";
import HealthTable from "@/components/HealthTable";
import Toolbar from "@/components/Toolbar";
import MenuBar, { type ModalTarget } from "@/components/MenuBar";
import AboutModal from "@/components/AboutModal";
import ControlsGuide from "@/components/ControlsGuide";
import FilterBar from "@/components/FilterBar";
import OverrideModal from "@/components/OverrideModal";
import RefactorSuggestions from "@/components/RefactorSuggestions";
import type { ScanResult, HealthStatus, OverrideMap, GitDiffFile, FileOverride } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_HEALTH_STATUSES: HealthStatus[] = [
  "red-critical", "red-fast", "red-slow", "yellow", "green",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingToast, setLoadingToast] = useState<string | null>(null);

  // ── Undo / Redo ──
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);

  // ── Modals ──
  const [activeModal, setActiveModal] = useState<ModalTarget>(null);
  const [overrideModalFileId, setOverrideModalFileId] = useState<string | null>(null);

  // ── Filters ──
  const [activeFilters, setActiveFilters] = useState<Set<HealthStatus>>(
    () => new Set(ALL_HEALTH_STATUSES)
  );

  // ── Overrides ──
  const [overrides, setOverrides] = useState<OverrideMap>({});

  // ── Git Diff ──
  const [gitDiffActive, setGitDiffActive] = useState(false);
  const [gitDiffFiles, setGitDiffFiles] = useState<Map<string, GitDiffFile>>(new Map());

  // ── Right panel tab ──
  const [rightPanelTab, setRightPanelTab] = useState<"health" | "suggestions">("health");

  // ── Refs ──
  const lastPathRef = useRef<string>("");
  const graphRef = useRef<HTMLDivElement>(null);

  // ── Auto-dismiss toast ──
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Computed ──
  const fileCounts = useMemo<Record<HealthStatus, number>>(() => {
    const c: Record<HealthStatus, number> = {
      "red-critical": 0, "red-fast": 0, "red-slow": 0, yellow: 0, green: 0,
    };
    if (scanResult) {
      for (const f of scanResult.files) c[f.health] = (c[f.health] ?? 0) + 1;
    }
    return c;
  }, [scanResult]);

  const overriddenIds = useMemo(() => new Set(Object.keys(overrides)), [overrides]);

  const effectiveScanResult = useMemo<ScanResult | null>(() => {
    if (!scanResult) return null;
    return {
      ...scanResult,
      files: scanResult.files.map((f) => {
        const ov = overrides[f.id];
        if (!ov) return f;
        return {
          ...f,
          role: (ov.role as typeof f.role) ?? f.role,
          responsibilities: ov.responsibilities ?? f.responsibilities,
        };
      }),
    };
  }, [scanResult, overrides]);

  const overrideModalFile = useMemo(
    () =>
      overrideModalFileId
        ? (effectiveScanResult?.files.find((f) => f.id === overrideModalFileId) ?? null)
        : null,
    [overrideModalFileId, effectiveScanResult]
  );

  // ── Scan ──
  const handleScan = async (folderPath: string) => {
    lastPathRef.current = folderPath;
    setIsLoading(true);
    setLoadingToast("Scanning project…");
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
      setCanUndo(false);
      setCanRedo(false);
      setGitDiffActive(false);
      setGitDiffFiles(new Map());
      // Load overrides for this project
      fetchOverrides(folderPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
      setLoadingToast(null);
    }
  };

  const handleRescan = useCallback(() => {
    if (lastPathRef.current) handleScan(lastPathRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Overrides fetch ──
  const fetchOverrides = useCallback(async (projectPath: string) => {
    try {
      const res = await fetch(`/api/overrides?projectPath=${encodeURIComponent(projectPath)}`);
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides ?? {});
      }
    } catch { /* ignore */ }
  }, []);

  const handleOverrideSave = useCallback((fileId: string, override: FileOverride) => {
    setOverrides((prev) => ({ ...prev, [fileId]: override }));
    setOverrideModalFileId(null);
  }, []);

  const handleOverrideReset = useCallback((fileId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
    setOverrideModalFileId(null);
  }, []);

  // ── Git Diff toggle ──
  const handleToggleGitDiff = useCallback(async () => {
    if (gitDiffActive) {
      setGitDiffActive(false);
      setGitDiffFiles(new Map());
      return;
    }
    if (!lastPathRef.current) return;
    setLoadingToast("Loading git diff…");
    try {
      const res = await fetch("/api/gitdiff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: lastPathRef.current }),
      });
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, GitDiffFile>();
        for (const f of data.files ?? []) map.set(f.id, f);
        setGitDiffFiles(map);
        setGitDiffActive(true);
        if (!data.isGitRepo) {
          setError("Project does not appear to be a git repository");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Git diff failed");
    } finally {
      setLoadingToast(null);
    }
  }, [gitDiffActive]);

  // ── PNG Export ──
  const handleExportPNG = useCallback(async () => {
    if (!graphRef.current) return;
    setLoadingToast("Exporting PNG…");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(graphRef.current, { cacheBust: true, quality: 0.95 });
      const link = document.createElement("a");
      const safe = (scanResult?.projectName ?? "arch").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      link.download = `archpulse_${safe}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : "PNG export failed");
    } finally {
      setLoadingToast(null);
    }
  }, [scanResult]);

  // ── Trigger handlers ──
  const handleUndo = useCallback(() => setUndoTrigger((n) => n + 1), []);
  const handleRedo = useCallback(() => setRedoTrigger((n) => n + 1), []);
  const handleFitView = useCallback(() => setFitViewTrigger((n) => n + 1), []);
  const handleFocusSelected = useCallback(() => setFocusTrigger((n) => n + 1), []);
  const handleUndoRedoChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  // ── Filter handlers ──
  const handleFilterToggle = useCallback((status: HealthStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      // F key: focus selected node (no modifier, no input focused, no modal open)
      if (e.key === "f" && !ctrl && !e.shiftKey && !isInput && !activeModal && !overrideModalFileId) {
        e.preventDefault();
        if (selectedNodeId) handleFocusSelected();
        return;
      }

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
      } else if (e.key === "d" && !e.shiftKey) {
        e.preventDefault();
        handleToggleGitDiff();
      } else if ((e.key === "e" || e.key === "E") && !e.shiftKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    handleUndo, handleRedo, handleRescan, handleFocusSelected, handleToggleGitDiff,
    selectedNodeId, activeModal, overrideModalFileId,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ── Loading toast ── */}
      {loadingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/95 shadow-xl backdrop-blur-sm">
          <svg className="animate-spin w-4 h-4 text-sky-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-200">{loadingToast}</span>
        </div>
      )}

      {/* ── Error toast ── */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border border-red-700 bg-red-950/90 shadow-xl backdrop-blur-sm max-w-lg w-max">
          <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-red-300 font-semibold text-sm">Error</p>
            <p className="text-red-400 text-xs mt-0.5 break-words">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 leading-none text-lg ml-1 shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── Menu bar ── */}
      <MenuBar
        scanResult={scanResult}
        canUndo={canUndo}
        canRedo={canRedo}
        selectedNodeId={selectedNodeId}
        gitDiffActive={gitDiffActive}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRescan={handleRescan}
        onFitView={handleFitView}
        onFocusSelected={handleFocusSelected}
        onExportPNG={handleExportPNG}
        onToggleGitDiff={handleToggleGitDiff}
        onOpenModal={setActiveModal}
      />

      {/* ── Toolbar ── */}
      <Toolbar onScan={handleScan} isLoading={isLoading} />

      {/* ── Filter Bar (only when scanned) ── */}
      {scanResult && (
        <FilterBar
          activeFilters={activeFilters}
          onToggle={handleFilterToggle}
          fileCounts={fileCounts}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph viewport */}
        <div className="flex-1 relative" ref={graphRef}>
          {!scanResult && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-6xl">🫀</div>
                <p className="text-slate-400 text-lg font-medium">ArchPulse</p>
                <p className="text-slate-600 text-sm max-w-xs">
                  Enter a project folder path above and click Scan to visualize your codebase architecture.
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
          {effectiveScanResult && !isLoading && (
            <ArchGraph
              scanResult={effectiveScanResult}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodeDoubleClick={setOverrideModalFileId}
              undoTrigger={undoTrigger}
              redoTrigger={redoTrigger}
              fitViewTrigger={fitViewTrigger}
              focusTrigger={focusTrigger}
              activeFilters={activeFilters}
              gitDiffFiles={gitDiffFiles}
              overriddenIds={overriddenIds}
              onUndoRedoChange={handleUndoRedoChange}
            />
          )}
        </div>

        {/* Right panel */}
        {effectiveScanResult && (
          <div className="w-80 border-l border-[var(--border)] flex flex-col bg-[var(--panel-bg)]">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] flex-shrink-0">
              <button
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  rightPanelTab === "health"
                    ? "text-slate-200 border-b-2 border-sky-500"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => setRightPanelTab("health")}
              >
                Health
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  rightPanelTab === "suggestions"
                    ? "text-slate-200 border-b-2 border-sky-500"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => setRightPanelTab("suggestions")}
              >
                Suggestions
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightPanelTab === "health" ? (
                <HealthTable
                  files={effectiveScanResult.files}
                  selectedNodeId={selectedNodeId}
                  activeFilters={activeFilters}
                  overrides={overrides}
                  onRowClick={setSelectedNodeId}
                  onEditOverride={setOverrideModalFileId}
                />
              ) : (
                <RefactorSuggestions
                  files={effectiveScanResult.files}
                  onFileSelect={(id) => {
                    setSelectedNodeId(id);
                    setRightPanelTab("health");
                  }}
                />
              )}
            </div>
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
      {overrideModalFile && (
        <OverrideModal
          file={overrideModalFile}
          existingOverride={overrides[overrideModalFile.id] ?? null}
          projectPath={lastPathRef.current}
          onSave={handleOverrideSave}
          onReset={handleOverrideReset}
          onClose={() => setOverrideModalFileId(null)}
        />
      )}
    </div>
  );
}
