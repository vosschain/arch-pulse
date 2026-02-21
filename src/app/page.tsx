"use client";

import { useState } from "react";
import ArchGraph from "@/components/ArchGraph";
import HealthTable from "@/components/HealthTable";
import Toolbar from "@/components/Toolbar";
import type { ScanResult } from "@/types";

export default function HomePage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (folderPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Scan failed");
      }
      const data: ScanResult = await res.json();
      setScanResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top toolbar */}
      <Toolbar onScan={handleScan} isLoading={isLoading} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph viewport */}
        <div className="flex-1 relative">
          {!scanResult && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-6xl">🫀</div>
                <p className="text-slate-400 text-lg font-medium">ArchPulse</p>
                <p className="text-slate-600 text-sm max-w-xs">
                  Enter a project folder path above and click Scan to visualize
                  your codebase architecture.
                </p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="animate-spin text-4xl">⟳</div>
                <p className="text-slate-400">Scanning project…</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 p-6 bg-red-950/30 border border-red-800 rounded-lg max-w-md">
                <p className="text-red-400 font-semibold">Scan Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}
          {scanResult && !isLoading && (
            <ArchGraph
              scanResult={scanResult}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          )}
        </div>

        {/* Health table panel */}
        {scanResult && (
          <div className="w-80 border-l border-[var(--border)] overflow-y-auto bg-[var(--panel-bg)]">
            <HealthTable
              files={scanResult.files}
              selectedNodeId={selectedNodeId}
              onRowClick={setSelectedNodeId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
