"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { ScannedFile } from "@/types";

// ─── Role color mapping ───────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { border: string; badge: string; dot: string }> = {
  component: { border: "#3b82f6", badge: "bg-blue-900/60 text-blue-300", dot: "bg-blue-400" },
  hook:      { border: "#a855f7", badge: "bg-purple-900/60 text-purple-300", dot: "bg-purple-400" },
  store:     { border: "#f59e0b", badge: "bg-amber-900/60 text-amber-300", dot: "bg-amber-400" },
  lib:       { border: "#10b981", badge: "bg-emerald-900/60 text-emerald-300", dot: "bg-emerald-400" },
  util:      { border: "#06b6d4", badge: "bg-cyan-900/60 text-cyan-300", dot: "bg-cyan-400" },
  api:       { border: "#f97316", badge: "bg-orange-900/60 text-orange-300", dot: "bg-orange-400" },
  type:      { border: "#64748b", badge: "bg-slate-800/60 text-slate-300", dot: "bg-slate-400" },
  config:    { border: "#78716c", badge: "bg-stone-800/60 text-stone-300", dot: "bg-stone-400" },
  page:      { border: "#ec4899", badge: "bg-pink-900/60 text-pink-300", dot: "bg-pink-400" },
  unknown:   { border: "#374151", badge: "bg-gray-800/60 text-gray-400", dot: "bg-gray-500" },
};

// ─── Pulse animation class ────────────────────────────────────────────────────

function getPulseClass(health: string): string {
  switch (health) {
    case "red-slow":     return "node-pulse-slow";
    case "red-fast":     return "node-pulse-fast";
    case "red-critical": return "node-pulse-critical";
    default:             return "";
  }
}

function getHealthBadge(health: string, lines: number): { label: string; cls: string } {
  switch (health) {
    case "green":        return { label: `🟢 ${lines}`, cls: "text-emerald-400" };
    case "yellow":       return { label: `🟡 ${lines}`, cls: "text-yellow-400" };
    case "red-slow":     return { label: `🔴 ${lines}`, cls: "text-red-400" };
    case "red-fast":     return { label: `🔴 ${lines} ⚠️`, cls: "text-red-400 font-bold" };
    case "red-critical": return { label: `🔴 ${lines} 🚨`, cls: "text-red-300 font-bold" };
    default:             return { label: `${lines}`, cls: "text-slate-400" };
  }
}

// ─── Diff badge ──────────────────────────────────────────────────────────────

function DiffBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    added:    { label: "+", cls: "bg-emerald-500/80 text-white" },
    modified: { label: "~", cls: "bg-amber-500/80 text-white" },
    deleted:  { label: "−", cls: "bg-red-500/80 text-white" },
    renamed:  { label: "→", cls: "bg-sky-500/80 text-white" },
  };
  const b = map[status];
  if (!b) return null;
  return (
    <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${b.cls}`}>
      {b.label}
    </span>
  );
}

// ─── FileNode Component ───────────────────────────────────────────────────────

interface FileNodeData {
  file: ScannedFile;
  isSelected: boolean;
  diffStatus?: string | null;
  hasOverride?: boolean;
  isFaded?: boolean;
}

function FileNode({ data }: NodeProps<FileNodeData>) {
  const { file, isSelected, diffStatus, hasOverride } = data;
  const colors = ROLE_COLORS[file.role] ?? ROLE_COLORS.unknown;
  const pulseClass = getPulseClass(file.health);
  const healthBadge = getHealthBadge(file.health, file.lines);

  return (
    <div
      className={`
        relative rounded-lg p-3 min-w-[200px] max-w-[260px]
        bg-[#12121a] text-xs
        transition-all duration-200
        ${pulseClass}
        ${isSelected ? "ring-2 ring-white/50" : ""}
      `}
      style={{
        border: `1.5px solid ${isSelected ? "#fff" : colors.border}`,
        boxShadow: isSelected ? `0 0 0 2px ${colors.border}40` : undefined,
      }}
    >
      {diffStatus && <DiffBadge status={diffStatus} />}
      {hasOverride && !diffStatus && (
        <span className="absolute top-1.5 right-1.5 text-[10px] text-sky-400 leading-none" title="Has role/responsibility override">✎</span>
      )}
      {/* Source handle (top) */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />

      {/* Header: role dot + filename */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className="font-semibold text-slate-100 truncate">{file.name}</span>
      </div>

      {/* Role badge + line count */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.badge}`}>
          {file.role}
        </span>
        <span className={`text-[10px] ml-auto ${healthBadge.cls}`}>
          {healthBadge.label} lines
        </span>
      </div>

      {/* Responsibilities */}
      {file.responsibilities.length > 0 && (
        <ul className="space-y-0.5 text-slate-400">
          {file.responsibilities.slice(0, 4).map((r, i) => (
            <li key={i} className="flex gap-1 leading-tight">
              <span className="text-slate-600 flex-shrink-0">•</span>
              <span className="truncate">{r}</span>
            </li>
          ))}
          {file.responsibilities.length > 4 && (
            <li className="text-slate-600 pl-3">+{file.responsibilities.length - 4} more</li>
          )}
        </ul>
      )}

      {/* Short file path */}
      <div className="mt-2 text-[10px] text-slate-600 truncate">{file.path}</div>

      {/* Source handle (bottom) */}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />
    </div>
  );
}

export default memo(FileNode);
