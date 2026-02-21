"use client";

interface ControlsGuideProps {
  onClose: () => void;
}

interface ControlEntry {
  icon: string;
  action: string;
  description: string;
  category: string;
}

const CONTROLS: ControlEntry[] = [
  // Canvas Navigation
  { category: "Canvas Navigation", icon: "🖱️", action: "Right-click + Drag", description: "Pan the canvas — move around the architecture graph" },
  { category: "Canvas Navigation", icon: "🖱️", action: "Scroll Wheel", description: "Zoom in and out" },
  { category: "Canvas Navigation", icon: "⌨️", action: "Ctrl + Scroll", description: "Precision zoom" },
  // Node Interaction
  { category: "Nodes", icon: "👆", action: "Click a Node", description: "Select it — highlights the corresponding row in the Health Table" },
  { category: "Nodes", icon: "👆", action: "Click Selected Node", description: "Deselect it" },
  { category: "Nodes", icon: "✊", action: "Drag a Node", description: "Move it to a new position on the canvas" },
  { category: "Nodes", icon: "👆", action: "Double-click a Node", description: "Open the Override Modal to edit role and responsibilities" },
  // Undo / Redo
  { category: "Undo / Redo", icon: "⌨️", action: "Ctrl + Z", description: "Undo last node move" },
  { category: "Undo / Redo", icon: "⌨️", action: "Ctrl + Y  /  Ctrl + Shift + Z", description: "Redo last undone move" },
  // Canvas Controls
  { category: "Canvas Controls", icon: "⌨️", action: "Ctrl + Shift + F", description: "Fit all nodes into view" },
  { category: "Canvas Controls", icon: "⌨️", action: "F", description: "Focus selected node — zoom in and center on it" },
  { category: "Canvas Controls", icon: "🗺️", action: "MiniMap (bottom-right)", description: "Drag within the minimap to navigate" },
  { category: "Canvas Controls", icon: "🔧", action: "Controls widget (bottom-left)", description: "Zoom in, Zoom out, Fit view, Lock" },
  // Filtering
  { category: "Filters", icon: "🎛️", action: "Status Filter Buttons", description: "Toggle visibility by health status — fades nodes with deselected status" },
  { category: "Filters", icon: "🎛️", action: "All / None buttons", description: "Enable or disable all filters at once" },
  // Health Table
  { category: "Health Table", icon: "📋", action: "Click a Table Row", description: "Select the node in the canvas viewport" },
  { category: "Health Table", icon: "📋", action: "Color-coded badges", description: "Critical → Danger → Warning → Caution → Healthy" },
  { category: "Health Table", icon: "✎", action: "Override button (hover row)", description: "Edit the role and responsibilities for a file" },
  // Menus
  { category: "Menus", icon: "📁", action: "File → Export", description: "Export the architecture report as Markdown, CSV, JSON, or PNG" },
  { category: "Menus", icon: "✏️", action: "Edit → Focus Selected (F)", description: "Zoom in and center on the currently selected node" },
  { category: "Menus", icon: "✏️", action: "Edit → Fit to View", description: "Fit all nodes into the viewport" },
  { category: "Menus", icon: "👁️", action: "View → Git Diff Mode (Ctrl+D)", description: "Overlay git diff status badges on changed nodes" },
];

const CATEGORIES = [...new Set(CONTROLS.map((c) => c.category))];

export default function ControlsGuide({ onClose }: ControlsGuideProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-slate-700 bg-[#12121a] shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100">Keyboard Shortcuts & Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">Everything you can do in ArchPulse</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="space-y-1.5">
                {CONTROLS.filter((c) => c.category === cat).map((ctrl) => (
                  <div
                    key={ctrl.action}
                    className="flex items-start gap-3 rounded-md px-3 py-2 bg-slate-900/50 border border-slate-800/60"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{ctrl.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200">{ctrl.action}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{ctrl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-800 flex-shrink-0">
          <p className="text-[11px] text-slate-600 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
