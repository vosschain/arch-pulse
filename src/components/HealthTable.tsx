"use client";

import { useMemo } from "react";
import type { ScannedFile, HealthStatus, OverrideMap } from "@/types";
import { getHealthEmoji } from "@/types";

interface HealthTableProps {
  files: ScannedFile[];
  selectedNodeId: string | null;
  activeFilters: Set<HealthStatus>;
  overrides: OverrideMap;
  onRowClick: (id: string) => void;
  onEditOverride: (id: string) => void;
}

const STATUS_ORDER: Record<HealthStatus, number> = {
  "red-critical": 0,
  "red-fast":     1,
  "red-slow":     2,
  "yellow":       3,
  "green":        4,
};

const ROLE_COLORS: Record<string, string> = {
  component: "text-blue-400",
  hook:      "text-purple-400",
  store:     "text-amber-400",
  lib:       "text-emerald-400",
  util:      "text-cyan-400",
  api:       "text-orange-400",
  type:      "text-slate-400",
  config:    "text-stone-400",
  page:      "text-pink-400",
  unknown:   "text-gray-500",
};

export default function HealthTable({ files, selectedNodeId, activeFilters, overrides, onRowClick, onEditOverride }: HealthTableProps) {
  const sorted = useMemo(
    () => [...files].sort((a, b) => STATUS_ORDER[a.health] - STATUS_ORDER[b.health] || b.lines - a.lines),
    [files]
  );

  // Summary counts
  const stats = useMemo(() => ({
    critical: files.filter((f) => f.health === "red-critical").length,
    danger:   files.filter((f) => f.health === "red-fast").length,
    warning:  files.filter((f) => f.health === "red-slow").length,
    caution:  files.filter((f) => f.health === "yellow").length,
    healthy:  files.filter((f) => f.health === "green").length,
  }), [files]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-slate-200">File Health Audit</h2>
        <p className="text-xs text-slate-500 mt-0.5">{files.length} files scanned</p>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {stats.critical > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800">
              🚨 {stats.critical} critical
            </span>
          )}
          {stats.danger > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-900/40 text-red-400 border border-red-700">
              ⚠️ {stats.danger} danger
            </span>
          )}
          {stats.warning > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-900/20 text-red-500 border border-red-900">
              🔴 {stats.warning} warning
            </span>
          )}
          {stats.caution > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-900/20 text-yellow-400 border border-yellow-900">
              🟡 {stats.caution} caution
            </span>
          )}
          {stats.healthy > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-900/20 text-green-400 border border-green-900">
              🟢 {stats.healthy} healthy
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--panel-bg)] z-10">
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-2 text-slate-500 font-medium">File</th>
              <th className="text-right p-2 text-slate-500 font-medium whitespace-nowrap">Lines</th>
              <th className="text-center p-2 text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((file) => {
              const isSelected = file.id === selectedNodeId;
              const roleColor = ROLE_COLORS[file.role] ?? ROLE_COLORS.unknown;
              const isFaded = !activeFilters.has(file.health);
              const hasOverride = !!overrides[file.id];
              return (
                <tr
                  key={file.id}
                  className={`
                    border-b border-[var(--border)]/50 cursor-pointer transition-all group
                    hover:bg-white/5
                    ${isSelected ? "bg-white/10" : ""}
                    ${isFaded ? "opacity-25" : ""}
                  `}
                  onClick={() => onRowClick(file.id)}
                >
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <div className="font-medium text-slate-200 truncate max-w-[110px]">{file.name}</div>
                      {hasOverride && (
                        <span className="text-[10px] text-sky-400" title="Has override">✎</span>
                      )}
                    </div>
                    <div className={`text-[10px] ${roleColor}`}>{file.role}</div>
                  </td>
                  <td className="p-2 text-right">
                    <span className={`
                      font-mono px-1.5 py-0.5 rounded text-[10px]
                      ${file.health === "green" ? "bg-green-900/20 text-green-400" : ""}
                      ${file.health === "yellow" ? "bg-yellow-900/20 text-yellow-400" : ""}
                      ${file.health === "red-slow" ? "bg-red-900/20 text-red-400" : ""}
                      ${file.health === "red-fast" ? "bg-red-900/40 text-red-300 font-bold" : ""}
                      ${file.health === "red-critical" ? "bg-red-950 text-red-200 font-bold border border-red-700" : ""}
                    `}>
                      {file.lines.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getHealthEmoji(file.health)}
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditOverride(file.id); }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-sky-400 transition-opacity"
                        title="Edit override"
                      >✎</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-[var(--border)] text-[10px] text-slate-500 space-y-0.5">
        <div>🟢 Healthy (&lt;500 lines)</div>
        <div>🟡 Caution (500–999 lines)</div>
        <div>🔴 Warning (1k–2,999) — slow pulse</div>
        <div>🔴 Danger (3k–4,999) — fast pulse</div>
        <div>🚨 Critical (5,000+) — constant glow</div>
      </div>
    </div>
  );
}
