"use client";

import { useState } from "react";

interface ToolbarProps {
  onScan: (folderPath: string) => void;
  isLoading: boolean;
}

export default function Toolbar({ onScan, isLoading }: ToolbarProps) {
  const [folderPath, setFolderPath] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderPath.trim();
    if (trimmed) onScan(trimmed);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--panel-bg)] z-20">
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">🫀</span>
        <span className="font-semibold text-slate-100 tracking-tight">ArchPulse</span>
      </div>

      <div className="w-px h-5 bg-slate-700 flex-shrink-0" />

      {/* Scanner form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
        <input
          type="text"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="Enter project folder path (e.g. C:\\_APPS\\HouseBuilder)"
          className="
            flex-1 px-3 py-1.5 rounded text-sm
            bg-[#0a0a0f] border border-[var(--border)]
            text-slate-200 placeholder-slate-600
            focus:outline-none focus:border-slate-500
            transition-colors
          "
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !folderPath.trim()}
          className="
            px-4 py-1.5 rounded text-sm font-medium
            bg-blue-600 hover:bg-blue-500
            disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
            text-white transition-colors flex-shrink-0
          "
        >
          {isLoading ? "Scanning…" : "Scan"}
        </button>
      </form>

      {/* Quick-access presets (example) */}
      <div className="flex-shrink-0 text-[11px] text-slate-600 hidden lg:block">
        Press Enter or click Scan
      </div>
    </header>
  );
}
