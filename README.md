# ArchPulse 🫀

> **Codebase architecture visualizer with health indicators.**  
> See god components pulsing red before they become a problem.

## What is it?

ArchPulse scans any local TypeScript/JavaScript project and renders an interactive node graph of its source files. Each node shows the file's name, role, responsibilities, and line count. Nodes are connected by import dependency arrows. Files that are growing too large animate a red glow — the larger the file, the faster and brighter the pulse.

## Quick Start

```bash
cd ArchPulse
npm install
npm run dev       # http://localhost:4050
```

Enter a local folder path in the toolbar (e.g. `C:\_APPS\HouseBuilder`) and click **Scan**.

## Health Thresholds

| Lines | Status | Animation |
|------:|:-------|:----------|
| < 500 | 🟢 Healthy | None |
| 500–999 | 🟡 Caution | None |
| 1,000–2,999 | 🔴 Warning | Slow pulse |
| 3,000–4,999 | 🔴 Danger | Fast pulse |
| 5,000+ | 🚨 Critical | Constant glow |

## Scripts

```bash
npm run dev       # Dev server on port 4050
npm run dev:lan   # Dev server on 0.0.0.0:4050 (LAN access)
npm run build     # Production build
npm run test      # verify_system.js — checks file structure + config
```

## Tech Stack

- **Next.js 16** (App Router)
- **React Flow 11** — node graph viewport
- **Dagre** — automatic hierarchical layout
- **Tailwind CSS 4** — styling + pulse keyframes
- **TypeScript 5**
