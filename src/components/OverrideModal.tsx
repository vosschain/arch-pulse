"use client";

import { useState, useCallback } from "react";
import type { ScannedFile, FileRole, FileOverride } from "@/types";

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLES: FileRole[] = [
  "component", "hook", "store", "lib", "util", "api", "type", "config", "page", "unknown",
];

const ROLE_COLORS: Record<FileRole, string> = {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverrideModalProps {
  file: ScannedFile;
  existingOverride?: FileOverride;
  projectPath: string;
  onSave: (fileId: string, override: FileOverride) => void;
  onReset: (fileId: string) => void;
  onClose: () => void;
}

// ─── OverrideModal component ──────────────────────────────────────────────────

export default function OverrideModal({
  file,
  existingOverride,
  projectPath,
  onSave,
  onReset,
  onClose,
}: OverrideModalProps) {
  const [role, setRole] = useState<FileRole>(existingOverride?.role ?? file.role);
  const [responsibilities, setResponsibilities] = useState<string[]>(
    existingOverride?.responsibilities ?? [...file.responsibilities]
  );
  const [newResp, setNewResp] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    role !== (existingOverride?.role ?? file.role) ||
    JSON.stringify(responsibilities) !==
      JSON.stringify(existingOverride?.responsibilities ?? file.responsibilities);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath, fileId: file.id, role, responsibilities }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      onSave(file.id, { role, responsibilities });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  }, [projectPath, file.id, role, responsibilities, onSave, onClose]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath, fileId: file.id }),
      });
      if (!res.ok) throw new Error("Reset failed");
      onReset(file.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  }, [projectPath, file.id, onReset, onClose]);

  const addResponsibility = useCallback(() => {
    const trimmed = newResp.trim();
    if (trimmed && !responsibilities.includes(trimmed)) {
      setResponsibilities([...responsibilities, trimmed]);
    }
    setNewResp("");
  }, [newResp, responsibilities]);

  const removeResponsibility = useCallback((idx: number) => {
    setResponsibilities((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-slate-700 bg-[#12121a] shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="min-w-0 mr-3">
            <div className="flex items-center gap-2">
              <span className="text-base">✎</span>
              <h2 className="text-sm font-bold text-slate-100 truncate">{file.name}</h2>
              {existingOverride && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-900/40 text-amber-400 border border-amber-800 flex-shrink-0">
                  overridden
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">{file.path}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {error && (
            <div className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded px-3 py-2">{error}</div>
          )}

          {/* Role picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Role
              {existingOverride?.role && existingOverride.role !== file.role && (
                <span className="ml-2 text-slate-600 normal-case font-normal">(auto-detected: {file.role})</span>
              )}
            </label>
            <div className="grid grid-cols-5 gap-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2 py-1.5 rounded text-[11px] border transition-all ${
                    role === r
                      ? `${ROLE_COLORS[r]} border-current bg-current/10 font-medium`
                      : "text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Responsibilities
            </label>
            <div className="space-y-1.5 mb-2">
              {responsibilities.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <span className="flex-1 text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1.5 min-w-0 truncate">
                    {r}
                  </span>
                  <button
                    onClick={() => removeResponsibility(idx)}
                    className="text-slate-600 hover:text-red-400 text-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {responsibilities.length === 0 && (
                <p className="text-xs text-slate-600 italic">No responsibilities listed</p>
              )}
            </div>
            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addResponsibility()}
                placeholder="Add responsibility…"
                className="flex-1 px-2.5 py-1.5 rounded text-xs bg-[#0a0a0f] border border-slate-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500"
              />
              <button
                onClick={addResponsibility}
                disabled={!newResp.trim()}
                className="px-3 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3 border-t border-slate-800 flex-shrink-0">
          <div>
            {existingOverride && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                Reset to auto-detected
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-xs border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving…" : "Save Override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
