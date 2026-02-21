/**
 * ArchPulse — Refactor Suggestions Rule Engine
 * Pure logic, no React dependencies.
 * Generates actionable suggestions for files that need refactoring.
 */
import type { ScannedFile, RefactorSuggestion, SuggestionSeverity } from "@/types";

// ─── Thresholds ───────────────────────────────────────────────────────────────

const LINES_HIGH = 3000;
const LINES_MEDIUM = 1500;
const IMPORTS_HIGH = 12;
const IMPORTS_MEDIUM = 8;
const RESPONSIBILITIES_HIGH = 5;

// ─── Severity ordering (for sorting) ─────────────────────────────────────────

const SEVERITY_ORDER: Record<SuggestionSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ─── Rule engine ──────────────────────────────────────────────────────────────

export function generateSuggestions(files: ScannedFile[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  for (const file of files) {
    // ── Rule 1: God Component (too many lines) ──
    if (file.lines >= LINES_HIGH) {
      const severity: SuggestionSeverity = file.lines >= 5000 ? "high" : "high";
      const estimatedLines = Math.round(file.lines * 0.4);
      suggestions.push({
        fileId: file.id,
        fileName: file.name,
        health: file.health,
        reason: `${file.lines.toLocaleString()} non-comment lines — far exceeds the 500-line healthy threshold`,
        suggestion: `Split by responsibility. Extract the ${file.responsibilities.slice(0, 2).join(" and ")} concerns into separate ${file.role === "hook" ? "hooks" : "modules"}. Estimated reduction: ~${estimatedLines.toLocaleString()} lines removed from this file.`,
        severity,
        estimatedLineReduction: estimatedLines,
      });
    } else if (file.lines >= LINES_MEDIUM) {
      const estimatedLines = Math.round(file.lines * 0.35);
      suggestions.push({
        fileId: file.id,
        fileName: file.name,
        health: file.health,
        reason: `${file.lines.toLocaleString()} non-comment lines — approaching god-component territory`,
        suggestion: `Review responsibilities and consider extracting ${file.responsibilities.slice(0, 1).join(", ")} into a dedicated ${file.role === "component" ? "hook or util" : "module"}. Target: keep under 1,000 lines.`,
        severity: "medium",
        estimatedLineReduction: estimatedLines,
      });
    }

    // ── Rule 2: High Coupling (too many imports) ──
    if (file.imports.length >= IMPORTS_HIGH) {
      const alreadyHasLineSuggestion = suggestions.some(
        (s) => s.fileId === file.id
      );
      suggestions.push({
        fileId: file.id,
        fileName: file.name,
        health: file.health,
        reason: `Imports ${file.imports.length} other project files — high coupling makes changes risky`,
        suggestion: `Introduce an abstraction layer (facade, aggregate hook, or service) to reduce direct dependencies. Files with >10 internal imports are fragile change-magnets.`,
        severity: alreadyHasLineSuggestion ? "medium" : "high",
      });
    } else if (file.imports.length >= IMPORTS_MEDIUM) {
      suggestions.push({
        fileId: file.id,
        fileName: file.name,
        health: file.health,
        reason: `Imports ${file.imports.length} other project files — moderate coupling`,
        suggestion: `Review whether all ${file.imports.length} dependencies are essential, or if some logic can be co-located with the modules it relies on.`,
        severity: "low",
      });
    }

    // ── Rule 3: Too many responsibilities ──
    if (file.responsibilities.length >= RESPONSIBILITIES_HIGH && file.lines >= 500) {
      const alreadyExists = suggestions.some((s) => s.fileId === file.id && s.severity === "high");
      if (!alreadyExists) {
        suggestions.push({
          fileId: file.id,
          fileName: file.name,
          health: file.health,
          reason: `${file.responsibilities.length} distinct responsibilities detected — violates Single Responsibility Principle`,
          suggestion: `Consider the Strangler Fig pattern: extract one responsibility at a time. Start with the least-coupled: "${file.responsibilities[file.responsibilities.length - 1] ?? "—"}"`,
          severity: "medium",
        });
      }
    }
  }

  // De-duplicate (same file can have multiple rules — keep all, they're distinct)
  // Sort: high → medium → low, then by lines descending
  return suggestions.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    const af = files.find((f) => f.id === a.fileId);
    const bf = files.find((f) => f.id === b.fileId);
    return (bf?.lines ?? 0) - (af?.lines ?? 0);
  });
}

// ─── Severity label helpers ───────────────────────────────────────────────────

export function getSeverityIcon(severity: SuggestionSeverity): string {
  switch (severity) {
    case "high": return "🚨";
    case "medium": return "⚠️";
    case "low": return "💡";
  }
}

export function getSeverityColor(severity: SuggestionSeverity): string {
  switch (severity) {
    case "high": return "text-red-400 border-red-800 bg-red-950/50";
    case "medium": return "text-yellow-400 border-yellow-800 bg-yellow-950/30";
    case "low": return "text-blue-400 border-blue-800 bg-blue-950/30";
  }
}
