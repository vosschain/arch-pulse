"use client";

import { useMemo, useState } from "react";
import type { ScannedFile, RefactorSuggestion } from "@/types";
import { generateSuggestions, getSeverityIcon, getSeverityColor } from "@/lib/refactorSuggestions";

interface RefactorSuggestionsProps {
  files: ScannedFile[];
  onFileSelect: (id: string) => void;
}

export default function RefactorSuggestions({ files, onFileSelect }: RefactorSuggestionsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const suggestions: RefactorSuggestion[] = useMemo(
    () => generateSuggestions(files),
    [files]
  );

  const highCount = suggestions.filter((s) => s.severity === "high").length;
  const medCount  = suggestions.filter((s) => s.severity === "medium").length;

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-sm font-medium text-slate-300">No refactor issues detected</p>
        <p className="text-xs text-slate-600 mt-1">All files are within healthy thresholds.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-slate-200">Refactor Suggestions</h2>
        <div className="flex gap-1.5 mt-1.5">
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800">
              🚨 {highCount} high
            </span>
          )}
          {medCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-900/20 text-yellow-400 border border-yellow-900">
              ⚠️ {medCount} medium
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 text-blue-400 border border-blue-900">
            💡 {suggestions.filter((s) => s.severity === "low").length} low
          </span>
        </div>
      </div>

      {/* Suggestion list */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.map((s, idx) => {
          const isOpen = expanded === `${s.fileId}-${idx}`;
          const key = `${s.fileId}-${idx}`;

          return (
            <div
              key={key}
              className="border-b border-[var(--border)] last:border-0"
            >
              {/* Summary row */}
              <button
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-slate-800/30 text-left transition-colors"
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">{getSeverityIcon(s.severity)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-medium cursor-pointer hover:underline text-blue-400"
                      onClick={(e) => { e.stopPropagation(); onFileSelect(s.fileId); }}
                    >
                      {s.fileName}
                    </span>
                    <span className={`px-1 py-0 rounded text-[9px] border ${getSeverityColor(s.severity)}`}>
                      {s.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {s.reason}
                  </p>
                </div>
                <span className="text-slate-600 text-xs flex-shrink-0 mt-1">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded suggestion */}
              {isOpen && (
                <div className="px-9 pb-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{s.suggestion}</p>
                  {s.estimatedLineReduction != null && (
                    <p className="text-[10px] text-emerald-500 mt-1.5">
                      💚 Estimated reduction: ~{s.estimatedLineReduction.toLocaleString()} lines
                    </p>
                  )}
                  <button
                    onClick={() => onFileSelect(s.fileId)}
                    className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Jump to node ↗
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
