"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ScanResult } from "@/types";
import { exportMarkdown, exportCSV, exportJSON, downloadFile } from "@/lib/exportUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalTarget = "about" | "controls" | null;

interface MenuBarProps {
  scanResult: ScanResult | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRescan: () => void;
  onFitView: () => void;
  onOpenModal: (modal: ModalTarget) => void;
}

// ─── Menu definitions ─────────────────────────────────────────────────────────

type MenuSeparator = { type: "separator" };
type MenuAction = {
  type: "action";
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
};
type MenuItem = MenuSeparator | MenuAction;

// ─── MenuBar ──────────────────────────────────────────────────────────────────

export default function MenuBar({
  scanResult,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRescan,
  onFitView,
  onOpenModal,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Export helpers ──
  const handleExport = useCallback(
    (format: "md" | "csv" | "json") => {
      if (!scanResult) return;
      setOpenMenu(null);
      const safeName = scanResult.projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      if (format === "md") {
        downloadFile(exportMarkdown(scanResult), `arch_${safeName}_${dateStr}.md`, "text/markdown");
      } else if (format === "csv") {
        downloadFile(exportCSV(scanResult), `arch_${safeName}_${dateStr}.csv`, "text/csv");
      } else {
        downloadFile(exportJSON(scanResult), `arch_${safeName}_${dateStr}.json`, "application/json");
      }
    },
    [scanResult]
  );

  // ── Menu definitions ──
  const menus: { id: string; label: string; items: MenuItem[] }[] = [
    {
      id: "file",
      label: "File",
      items: [
        {
          type: "action",
          label: "Re-scan Project",
          shortcut: "Ctrl+R",
          disabled: !scanResult,
          action: () => { setOpenMenu(null); onRescan(); },
        },
        { type: "separator" },
        {
          type: "action",
          label: "Export as Markdown",
          shortcut: "Ctrl+E",
          disabled: !scanResult,
          action: () => handleExport("md"),
        },
        {
          type: "action",
          label: "Export as CSV",
          disabled: !scanResult,
          action: () => handleExport("csv"),
        },
        {
          type: "action",
          label: "Export as JSON",
          disabled: !scanResult,
          action: () => handleExport("json"),
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          type: "action",
          label: "Undo",
          shortcut: "Ctrl+Z",
          disabled: !canUndo,
          action: () => { setOpenMenu(null); onUndo(); },
        },
        {
          type: "action",
          label: "Redo",
          shortcut: "Ctrl+Y",
          disabled: !canRedo,
          action: () => { setOpenMenu(null); onRedo(); },
        },
        { type: "separator" },
        {
          type: "action",
          label: "Fit to View",
          shortcut: "Ctrl+Shift+F",
          disabled: !scanResult,
          action: () => { setOpenMenu(null); onFitView(); },
        },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        {
          type: "action",
          label: "Keyboard Shortcuts & Controls",
          action: () => { setOpenMenu(null); onOpenModal("controls"); },
        },
        { type: "separator" },
        {
          type: "action",
          label: "About ArchPulse",
          action: () => { setOpenMenu(null); onOpenModal("about"); },
        },
      ],
    },
  ];

  // ── Close on outside click ──
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      ref={menuRef}
      className="flex items-center h-7 px-1 bg-[#0d0d14] border-b border-slate-800/60 z-30"
    >
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          {/* Menu trigger */}
          <button
            className={`px-3 h-7 text-xs rounded transition-colors ${
              openMenu === menu.id
                ? "bg-slate-700 text-slate-100"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            onClick={() =>
              setOpenMenu(openMenu === menu.id ? null : menu.id)
            }
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {openMenu === menu.id && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[220px] rounded-md border border-slate-700 bg-[#16161f] shadow-2xl py-1 z-50">
              {menu.items.map((item, idx) => {
                if (item.type === "separator") {
                  return (
                    <div key={idx} className="my-1 border-t border-slate-800" />
                  );
                }
                return (
                  <button
                    key={item.label}
                    disabled={item.disabled}
                    onClick={item.disabled ? undefined : item.action}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                      item.disabled
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-6 text-[10px] text-slate-500 flex-shrink-0">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
