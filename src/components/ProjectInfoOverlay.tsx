"use client";

import { useMemo } from "react";
import type { ScanResult } from "@/types";

interface ProjectInfoOverlayProps {
  scanResult: ScanResult;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function truncatePath(path: string, maxLen = 42): string {
  if (path.length <= maxLen) return path;
  const parts = path.replace(/\\/g, "/").split("/");
  // Keep last 3 segments
  const tail = parts.slice(-3).join("/");
  if (tail.length <= maxLen - 4) return "…/" + tail;
  return "…/" + tail.slice(-(maxLen - 4));
}

export default function ProjectInfoOverlay({ scanResult }: ProjectInfoOverlayProps) {
  const stats = useMemo(() => ({
    critical: scanResult.files.filter((f) => f.health === "red-critical").length,
    danger:   scanResult.files.filter((f) => f.health === "red-fast").length,
    warning:  scanResult.files.filter((f) => f.health === "red-slow").length,
    caution:  scanResult.files.filter((f) => f.health === "yellow").length,
    healthy:  scanResult.files.filter((f) => f.health === "green").length,
  }), [scanResult]);

  const riskCount = stats.critical + stats.danger + stats.warning;
  const truncatedPath = truncatePath(scanResult.rootPath);
  const relTime = formatRelativeTime(scanResult.scannedAt);

  return (
    <div
      className="
        absolute top-3 left-3 z-20
        rounded-lg border border-slate-700/70
        bg-[#0d0d14]/85 backdrop-blur-md
        shadow-xl px-3.5 py-3
        min-w-[220px] max-w-[300px]
        select-none pointer-events-none
      "
    >
      {/* Project name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base leading-none">🫀</span>
        <span className="font-semibold text-slate-100 text-sm truncate leading-tight">
          {scanResult.projectName}
        </span>
      </div>

      {/* Path */}
      <div className="flex items-start gap-1.5 mb-2.5">
        <span className="text-slate-600 text-[10px] mt-0.5 flex-shrink-0">📁</span>
        <span
          className="text-[10px] text-slate-500 font-mono leading-tight break-all"
          title={scanResult.rootPath}
        >
          {truncatedPath}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] border-t border-slate-800/70 pt-2 mt-1">
        <span className="text-slate-500">
          <span className="text-slate-300 font-medium">{scanResult.totalFiles}</span> files
        </span>
        <span className="text-slate-500">
          <span className="text-slate-300 font-medium">{scanResult.totalLines.toLocaleString()}</span> lines
        </span>
      </div>

      {/* Health summary */}
      <div className="flex flex-wrap gap-1 mt-2">
        {stats.critical > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/80 text-red-300 border border-red-900/50">
            🚨 {stats.critical}
          </span>
        )}
        {stats.danger > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-900/40 text-red-400 border border-red-800/50">
            ⚠️ {stats.danger}
          </span>
        )}
        {stats.warning > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-900/20 text-red-500 border border-red-900/40">
            🔴 {stats.warning}
          </span>
        )}
        {stats.caution > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-yellow-900/20 text-yellow-400 border border-yellow-900/40">
            🟡 {stats.caution}
          </span>
        )}
        {stats.healthy > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-900/20 text-green-400 border border-green-900/40">
            🟢 {stats.healthy}
          </span>
        )}
      </div>

      {/* Scan time + risk summary */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/50">
        <span className="text-[10px] text-slate-600">Scanned {relTime}</span>
        {riskCount > 0 && (
          <span className="text-[10px] text-red-400 font-medium">{riskCount} at risk</span>
        )}
      </div>
    </div>
  );
}
