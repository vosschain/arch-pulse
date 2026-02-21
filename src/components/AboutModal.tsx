"use client";

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-xl border border-slate-700 bg-[#12121a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🫀</span>
            <div>
              <h2 className="text-lg font-bold text-slate-100">ArchPulse</h2>
              <p className="text-xs text-slate-500">Codebase Architecture Visualizer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            ArchPulse turns any local codebase into a live architecture radar — an
            interactive node graph that makes god components, coupling issues, and
            technical debt immediately visible.
          </p>

          {/* Tech stack */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tech Stack
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                ["Framework", "Next.js 16 (App Router)"],
                ["Language", "TypeScript 5"],
                ["Styling", "Tailwind CSS 4"],
                ["Graph", "React Flow 11"],
                ["Layout", "Dagre"],
                ["Port", "4050"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 w-20 flex-shrink-0">{k}</span>
                  <span className="text-slate-300">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Health thresholds quick ref */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Health Thresholds
            </h3>
            <div className="space-y-1 text-xs">
              {[
                ["🟢 Healthy", "< 500 lines"],
                ["🟡 Caution", "500 – 999 lines"],
                ["🔴 Warning", "1,000 – 2,999 lines (slow pulse)"],
                ["🔴 Danger", "3,000 – 4,999 lines (fast pulse)"],
                ["🚨 Critical", "5,000+ lines (near-constant glow)"],
              ].map(([label, threshold]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-slate-500">{threshold}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-600">
            Built for developers and AI agents · Feb 2026
          </p>
        </div>
      </div>
    </div>
  );
}
