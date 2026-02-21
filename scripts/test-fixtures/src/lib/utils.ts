// Test fixture: a utility library
import path from "path";

export function formatLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getExtension(filePath: string): string {
  return path.extname(filePath);
}
