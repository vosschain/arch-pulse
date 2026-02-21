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
| Phase 5 | Menus, Undo/Redo, Project Overlay, and UX Polish ✅ |
| Phase 6 | Manual override of file role and responsibilities |
| Phase 7 | "Refactor Suggestions" AI panel (highlight which files to split and how) |
| Phase 8 | Git diff mode — show which files *changed* in a PR and their health before/after |
| Phase 9 | Export architecture diagram as SVG/PNG |
| Phase 10 | Multi-project comparison view |

---

## Phase 5 — Menus, Undo/Redo, Project Overlay, and UX Polish ✅

**Status:** Complete (Feb 21, 2026)
**Branch:** `feature/phase5-menus-undo-overlay`

### Deliverables

#### 5A. Right-Click Canvas Pan
- Pan the graph with **right-click + drag** (previously left-click)
- Left-click is now reserved solely for node selection
- Browser context menu suppressed on the canvas via `onContextMenu`
- ReactFlow `panOnDrag={[2]}` — mouse button 2 = right-click

#### 5B. Undo / Redo History
- Dragging a node records the pre-drag snapshot to a history stack
- **Ctrl+Z** undoes the last node move
- **Ctrl+Y** / **Ctrl+Shift+Z** redoes the last undone move
- History stacks are per-session (cleared on new scan)
- Menu bar Edit → Undo / Redo shows greyed-out state when stack is empty

#### 5C. Menu Bar (File / Edit / Help)
A native-style dark menu bar row sits above the toolbar.

**File menu:**
- Re-scan Project (Ctrl+R) — rescans the last path
- Export as Markdown (Ctrl+E) — risk-sorted table ideal for agents
- Export as CSV — spreadsheet-friendly
- Export as JSON — machine-readable full data payload

**Edit menu:**
- Undo (Ctrl+Z) — disabled when history is empty
- Redo (Ctrl+Y) — disabled when future stack is empty
- Fit to View (Ctrl+Shift+F) — smoothly re-fits all nodes

**Help menu:**
- Keyboard Shortcuts & Controls — scrollable visual guide modal
- About ArchPulse — tech stack, health thresholds, credits

#### 5D. Export Report
The Markdown export generates a structured agent-friendly report:
- Project metadata (name, path, scan time, totals)
- Health summary table (tier counts)
- Full file audit table sorted by **highest risk first**
  - Columns: Rank, File, Role, Lines, Health, Imports, Top Responsibilities

CSV and JSON exports follow the same risk-sorted ordering.

#### 5E. Project Info Overlay
A frosted-glass card anchored to the **top-left of the canvas** shows:
- Project name
- Truncated folder path
- Total files + total lines
- Health Badge strip (🚨 N, ⚠️ N, 🔴 N, 🟡 N, 🟢 N)
- "X at risk" count + relative scan time ("just now", "3m ago", …)
- `pointer-events-none` — never blocks graph interaction

#### 5F. Modals
- **About** — logo, description, tech stack table, health thresholds
- **Controls Guide** — categorized card-by-card reference for all interactions

---

## Phase 6 — Role & Responsibility Overrides

**Status:** Planned

### Goals
Allow users to manually correct auto-detected file metadata when the heuristic scanner misidentifies a file's role or responsibilities.

### Key Features
- Click a node to open a detail panel (replaces or extends health table row expansion)
- **Role Picker** — dropdown to manually set role (component, hook, store, lib, etc.)
- **Responsibility Editor** — editable bullet list (add/remove/reorder)
- Overrides stored in a project-local `.archpulse.json` file (auto-created)
- Override badge on node card (small "✎" icon indicating a manual override)
- "Reset to auto-detected" button per field

### Data Model
```json
// .archpulse.json
{
  "projectPath": "C:\\_APPS\\HouseBuilder",
  "overrides": {
    "src/components/ThreeEditorImpl.tsx": {
      "role": "component",
      "responsibilities": ["3D scene rendering", "camera controls", "user input handling"]
    }
  }
}
```

---

## Phase 7 — AI Refactor Suggestions Panel

**Status:** Planned

### Goals
Surface concrete, actionable refactor suggestions for god components and overly-coupled files.

### Key Features
- **Refactor Panel** (collapsible, right side) shows top 3–5 files needing attention
- Per-file suggestion cards showing:
  - Why it's a problem (too many lines, too many responsibilities, too many dependents)
  - Suggested split: "Extract hook `useInputLogic` → `src/hooks/useInputLogic.ts`"
  - Estimated impact: "Would reduce `ThreeEditorImpl.tsx` by ~800 lines"
- Suggestions generated via rule engine (Phase 7a) then optionally via LLM API (Phase 7b)
- **Phase 7a (Rule Engine):** Pattern-based — if file >2000 lines and has multiple export types, suggest splitting; if file imports >10 others, flag coupling
- **Phase 7b (LLM):** Optional — send file metadata to OpenAI/Claude API for narrative suggestions
- User can dismiss a suggestion ("Not now") or mark it resolved ("Done")
- Dismissed suggestions stored in `.archpulse.json`

---

## Phase 8 — Git Diff Mode

**Status:** Planned

### Goals
Show which files changed in the current working tree (or a specific PR/commit) and their health before vs. after.

### Key Features
- **Diff Mode Toggle** in toolbar — requires project path to be a git repo
- Changed files highlighted with a diff overlay:
  - 🟩 Added (new file)
  - 🟨 Modified (existing, changed line count)
  - 🟥 Deleted (file removed)
  - Line delta badge on node: `+142 lines` or `-38 lines`
- "Health Impact" summary: "3 files got worse, 1 improved"
- Commit selector — compare HEAD vs HEAD~1, or HEAD vs a specific branch
- Powered by `git diff --name-status` and `git show` via API route using Node.js `child_process`

### Non-Goals
- No GitHub/GitLab API integration (local git only)
- No patch viewing (line-level diffs)

---

## Phase 9 — Diagram Export (SVG / PNG)

**Status:** Planned

### Goals
Export the current graph viewport as a static image for documentation, Slack shares, or architecture documentation.

### Key Features
- **Export as PNG** — rasterized at 2× for retina (via `html-to-image` or canvas capture)
- **Export as SVG** — vector with proper node shapes and edge paths
- Options: export "visible area only" vs "full graph (all nodes)"
- File naming convention: `arch_{projectName}_{date}.png`
- Exported image respects current zoom/pan state
- Dark background preserved (not white-washed)
- Triggered from File → Export → As Image (PNG) / As Vector (SVG)

### Technical Approach
- Use `reactflow`'s `toObject()` to get node/edge positions, then render to canvas
- Or use `html-to-image` library on the `.react-flow__viewport` DOM element

---

## Phase 10 — Multi-Project Comparison

**Status:** Planned

### Goals
Scan two or more projects simultaneously and compare their architecture health side-by-side.

### Key Features
- **Project Tabs** in toolbar — add up to 4 projects via "+" button
- Each tab shows: project name + health summary badge strip
- **Side-by-Side mode** — split the viewport vertically or horizontally, one graph per pane
- **Overlay mode** — merge both graphs into one viewport; matched files (same name/path) are linked with dashed edges
- **Comparison summary panel** — table of files that exist in both projects with health diff: "ThreeEditorImpl: 🟡 (HouseBuilder) vs 🔴 (OtherProject)"
- Independent scan triggers per project tab
- Health Audit Table shows a project column when multiple are loaded

### Non-Goals
- No cross-project dependency resolution (imports stay within each project's graph)
- No persistent multi-project sessions

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
