"use client";

import type { HealthStatus } from "@/types";

// ─── Tier config ──────────────────────────────────────────────────────────────

interface TierConfig {
  status: HealthStatus;
  label: string;
  icon: string;
  activeClass: string;
  inactiveClass: string;
}

const TIERS: TierConfig[] = [
  {
    status: "red-critical",
    label: "Critical",
    icon: "🚨",
    activeClass: "border-red-700 bg-red-950/70 text-red-300",
    inactiveClass: "border-slate-700 bg-slate-900/40 text-slate-600",
  },
  {
    status: "red-fast",
    label: "Danger",
    icon: "⚠️",
    activeClass: "border-red-800 bg-red-900/40 text-red-400",
    inactiveClass: "border-slate-700 bg-slate-900/40 text-slate-600",
  },
  {
    status: "red-slow",
    label: "Warning",
    icon: "🔴",
    activeClass: "border-red-900 bg-red-900/20 text-red-500",
    inactiveClass: "border-slate-700 bg-slate-900/40 text-slate-600",
  },
  {
    status: "yellow",
    label: "Caution",
    icon: "🟡",
    activeClass: "border-yellow-800 bg-yellow-900/20 text-yellow-400",
    inactiveClass: "border-slate-700 bg-slate-900/40 text-slate-600",
  },
  {
    status: "green",
    label: "Healthy",
    icon: "🟢",
    activeClass: "border-green-800 bg-green-900/20 text-green-400",
    inactiveClass: "border-slate-700 bg-slate-900/40 text-slate-600",
  },
];

// ─── FilterBar component ──────────────────────────────────────────────────────

interface FilterBarProps {
  activeFilters: Set<HealthStatus>;
  onToggle: (status: HealthStatus) => void;
  fileCounts: Record<HealthStatus, number>;
}

export default function FilterBar({ activeFilters, onToggle, fileCounts }: FilterBarProps) {
  const allActive = TIERS.every((t) => activeFilters.has(t.status));
  const noneActive = TIERS.every((t) => !activeFilters.has(t.status));

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800/60 bg-[#0a0a0f]/80 flex-wrap">
      {/* Label */}
      <span className="text-[10px] text-slate-600 uppercase tracking-wider mr-1 flex-shrink-0">
        Filters
      </span>

      {/* Tier toggles */}
      {TIERS.map((tier) => {
        const isActive = activeFilters.has(tier.status);
        const count = fileCounts[tier.status] ?? 0;
        if (count === 0) return null; // Don't show tiers with no files
        return (
          <button
            key={tier.status}
            onClick={() => onToggle(tier.status)}
            title={isActive ? `Hide ${tier.label} nodes` : `Show ${tier.label} nodes`}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-all
              ${isActive ? tier.activeClass : tier.inactiveClass}
              hover:opacity-90 select-none
            `}
          >
            <span>{tier.icon}</span>
            <span className="font-medium">{tier.label}</span>
            <span className={`ml-0.5 font-mono ${isActive ? "opacity-80" : "opacity-40"}`}>
              {count}
            </span>
          </button>
        );
      })}

      {/* Select all / none */}
      <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
        <button
          onClick={() => {
            if (!allActive) {
              TIERS.forEach((t) => { if (!activeFilters.has(t.status)) onToggle(t.status); });
            }
          }}
          disabled={allActive}
          className="px-2 py-0.5 rounded text-[10px] border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          All
        </button>
        <button
          onClick={() => {
            if (!noneActive) {
              TIERS.forEach((t) => { if (activeFilters.has(t.status)) onToggle(t.status); });
            }
          }}
          disabled={noneActive}
          className="px-2 py-0.5 rounded text-[10px] border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          None
        </button>
      </div>
    </div>
  );
}
