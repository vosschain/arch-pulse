// ─── File Role Types ─────────────────────────────────────────────────────────

export type FileRole =
  | "component"
  | "hook"
  | "store"
  | "lib"
  | "util"
  | "api"
  | "type"
  | "config"
  | "page"
  | "unknown";

// ─── Health Status ────────────────────────────────────────────────────────────

export type HealthStatus = "green" | "yellow" | "red-slow" | "red-fast" | "red-critical";

export function getHealthStatus(lines: number): HealthStatus {
  if (lines < 500) return "green";
  if (lines < 1000) return "yellow";
  if (lines < 3000) return "red-slow";
  if (lines < 5000) return "red-fast";
  return "red-critical";
}

export function getHealthEmoji(status: HealthStatus): string {
  switch (status) {
    case "green": return "🟢";
    case "yellow": return "🟡";
    default: return "🔴";
  }
}

// ─── Scanned File ─────────────────────────────────────────────────────────────

export interface ScannedFile {
  id: string;           // Relative path, used as node id
  name: string;         // Base filename
  path: string;         // Relative path from project root
  role: FileRole;
  lines: number;        // Non-comment, non-blank lines
  totalLines: number;   // Total lines in file
  imports: string[];    // IDs of files this file imports
  responsibilities: string[]; // Bullet list of perceived responsibilities
  health: HealthStatus;
}

// ─── Scan Result ─────────────────────────────────────────────────────────────

export interface ScanResult {
  projectName: string;
  rootPath: string;
  scannedAt: string;
  files: ScannedFile[];
  totalFiles: number;
  totalLines: number;
}
