# Product Requirements Document (PRD)
## Project: ArchPulse — Codebase Architecture Visualizer

**Version:** 1.0  
**Created:** Feb 21, 2026  
**Port:** 4050  

---

## 1. Product Summary

ArchPulse is a browser-based developer tool that visualizes the architecture of any local codebase as an interactive node graph. Each script file becomes a "node" in the viewport. Nodes display the file's name, role, responsibilities, and non-comment line count. Nodes are connected by directed arrows that represent import dependencies. Files that are growing too large ("god components") animate a red glow at increasing rates as their line count grows, making architectural health immediately visible at a glance.

The goal is to provide a **live architecture radar** for developers and AI agents alike — making it instantly obvious where refactoring is needed, which files have too much responsibility, and how components relate to each other.

---

## 2. Target Users

### Primary
- Developers reviewing an unfamiliar codebase for the first time.
- AI coding agents (GitHub Copilot, Claude, etc.) needing to understand project structure before making changes.
- Team leads doing architecture reviews or sprint planning.

### Secondary
- Solo developers who want a visual health dashboard for their own projects.
- QA engineers verifying that refactoring efforts reduced coupling and god-component sizes.

---

## 3. Problem This Solves

Large codebases suffer from "god components" — files with too many responsibilities and too many lines of code. This leads to:

- **Whack-a-mole bugs:** Fixing one thing breaks another because logic is tangled.
- **Slow onboarding:** New contributors (human or AI) cannot quickly understand the project structure.
- **Invisible technical debt:** No tool makes it obvious *which* files are becoming problems.
- **Missed refactor opportunities:** Files creep past healthy sizes unnoticed.

ArchPulse makes this debt **visible and urgent**.

---

## 4. Core Product Goals

1. **Visualize architecture** as an interactive, zoomable node graph.
2. **Show health status** for every file — green to critical — using color coding and animated pulses.
3. **Surface import relationships** as directed edges between nodes.
4. **Provide an audit table** with sortable file health data (similar to REFACTOR_FRESH_PLAN's Current File Audit).
5. **Work locally** — scan any folder path on the local filesystem.

---

## 5. Key Features

### A. Interactive Node Graph Viewport

- Built with **React Flow** + **Dagre** auto-layout (top-down hierarchy).
- One node per source file (`.ts`, `.tsx`, `.js`, `.jsx`).
- Directed edges drawn from importer → imported file.
- Nodes auto-arranged to reflect dependency hierarchy (leaves at bottom, entry points / pages at top).
- Pan, zoom, minimap, and fit-to-view controls.

### B. File Node Card

Each node displays:
- **File name** (bold)
- **Role badge** — color-coded by type: `component`, `hook`, `store`, `lib`, `util`, `api`, `type`, `config`, `page`
- **Non-comment line count** — formatted with health color
- **Responsibility bullets** — up to 4 auto-extracted items (exports, hooks used, types, API verbs)
- **Short relative path** (truncated footer)

### C. God Component Pulse Animation

Line count thresholds drive CSS box-shadow keyframe animations on the node:

| Lines | Status | Health Badge | Animation |
|------:|:-------|:------------|:----------|
| < 500 | ✅ Healthy | 🟢 | None |
| 500–999 | ⚠️ Caution | 🟡 | None |
| 1,000–2,999 | 🔴 Warning | 🔴 | Slow red pulse (3s cycle) |
| 3,000–4,999 | 🔴 Danger | 🔴 ⚠️ | Fast red pulse (1s cycle) |
| 5,000+ | 🚨 Critical | 🔴 🚨 | Near-constant red glow (0.4s) |

The speed of the pulse is the visual "alarm level" — users can see at a glance which files are in crisis without reading a single number.

### D. Health Audit Table (Right Panel)

A persistent sidebar table showing all files sorted by severity descending, then by line count descending. Columns:

| File | Lines | Status |
|:-----|------:|:------:|
| ThreeEditorImpl.tsx | 5,076 | 🔴 |
| EditorPage.tsx | 4,114 | 🔴 |
| useInputLogic.ts | 3,357 | 🔴 |
| WallObject.tsx | 756 | 🟡 |
| scene.ts | 633 | 🟡 |
| FileNode.tsx | 142 | 🟢 |

- Clicking a row highlights the corresponding node in the viewport.
- Summary badge strip at the top shows counts per health tier.
- Legend at the bottom explains thresholds.

### E. File Scanner (API Route)

`POST /api/scan` accepts `{ folderPath: string }` and returns a full `ScanResult` JSON:

- Recursively walks the folder (skipping `node_modules`, `.next`, `.git`, `dist`, `build`).
- Counts non-comment, non-blank lines per file.
- Detects file role from path patterns and export signatures.
- Extracts exported function/component/type names as responsibility bullets.
- Resolves relative and `@/`-aliased imports into inter-file dependency edges.

### F. Project Selector Toolbar

- Text input for entering any local folder path.
- "Scan" button to trigger the scan API.
- Loading state during scan.
- Error display if path not found or scan fails.

---

## 6. Role Color System

| Role | Color | Examples |
|:-----|:------|:--------|
| `component` | Blue | `WallObject.tsx`, `FileNode.tsx` |
| `hook` | Purple | `useInputLogic.ts`, `useDragInteraction.ts` |
| `store` | Amber | `SceneActions.ts`, `useSceneStore.ts` |
| `lib` | Emerald | `GapFillMath.ts`, `scene.ts` |
| `util` | Cyan | `interactionUtils.ts` |
| `api` | Orange | `route.ts` |
| `type` | Slate | `index.ts` (types-only) |
| `config` | Stone | `tailwind.config.ts`, `constants.ts` |
| `page` | Pink | `page.tsx`, `layout.tsx` |

---

## 7. Non-Goals (Phase 1)

- **No editing** — this is read-only visualization, not a code editor.
- **No AI analysis** — responsibilities are extracted heuristically, not via LLM.
- **No CI/CD integration** — local tool only.
- **No GitHub/GitLab API** — scans local filesystem only.
- **No project saving/persistence** — scan session is ephemeral.

---

## 8. Success Metrics

- A developer can scan a new project and immediately identify the top 3 god components without reading any code.
- The audit table matches the quality/utility of the hand-maintained table in `REFACTOR_FRESH_PLAN.md`.
- Scanning a 200-file project completes in under 3 seconds.
- Zero false positives in `npm run test` (verify_system.js).

---

## 9. Future Phases

| Phase | Feature |
|:------|:--------|
| Phase 5 | Project selector with recently-scanned list |
| Phase 6 | Manual override of file role and responsibilities |
| Phase 7 | "Refactor Suggestions" AI panel (highlight which files to split and how) |
| Phase 8 | Git diff mode — show which files *changed* in a PR and their health before/after |
| Phase 9 | Export architecture diagram as SVG/PNG |
| Phase 10 | Multi-project comparison view |

---

## 10. Technical Stack

| Layer | Technology |
|:------|:----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Graph rendering | React Flow 11 |
| Auto-layout | Dagre |
| Runtime | Node.js (local API route for filesystem access) |
| Port | 4050 |
