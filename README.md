# SkillSpector UI

Desktop GUI for [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector).

![License](https://img.shields.io/badge/license-MIT-22c55e)
![Platform](https://img.shields.io/badge/platform-Windows-0078D4)
![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)

---

## What is this?

[NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector) is a security scanner for AI agent skill packages. It runs as a command-line tool and outputs JSON reports.

**SkillSpector UI** wraps that CLI into a desktop application — so you can configure scans, browse results, track history, and export reports without touching the terminal or parsing JSON by hand.

This is an independent project. It is not affiliated with, endorsed by, or supported by NVIDIA.

![Scan view showing a recursive scan of 7 skills with LLM analysis, summary cards, and results table](docs/screenshots/scan_view.png)

---

## Features

**Scanning**
- Single-skill and recursive multi-skill scans with real-time progress
- Optional LLM-enhanced analysis via local [Ollama](https://ollama.com) instance
- Live stdout/stderr streaming during scan execution
- Cancel running scans (full process tree termination)

**Results**
- Summary cards: security score, skill count, findings, analysis completeness
- Sortable and filterable results table with severity indicators
- Per-skill detail view with findings, evidence, code locations, and remediation
- Three-tier separation: security findings, inspection warnings, runtime warnings — never mixed

**History & Comparison**
- Every scan is saved automatically to `%APPDATA%`
- Browse, search, favorite, and delete past scans
- Compare any two scans side-by-side
- Non-equivalent configurations (e.g. LLM on vs. off) are detected and labeled — no misleading "Improved" or "Resolved" claims

**Export**
- JSON — instant export from stored data, no re-scan needed
- Markdown summary — copy to clipboard
- Markdown / SARIF files — generated via SkillSpector's native formatters

**Configuration**
- Auto-detects `skillspector.exe` from known paths, relative candidates, or system PATH
- Manual path override in Settings
- Ollama connection and model selection
- Favorite scan targets with one-click launch

---

## Screenshots

| Scan Results | History | Export |
|:---:|:---:|:---:|
| ![Scan view](docs/screenshots/scan_view.png) | ![History view](docs/screenshots/history_view.png) | ![Export modal](docs/screenshots/export_modal.png) |

---

## Requirements

- **[NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector)** (v2.11+) — installed with its Python virtual environment. See [installation instructions](https://github.com/NVIDIA/skillspector#installation).
- **Node.js** (v18+)
- **Ollama** *(optional)* — only needed if you want LLM-enhanced semantic analysis. Detected automatically at `localhost:11434`.

---

## Installation

```bash
git clone https://github.com/flogrema/skillspector-ui.git
cd skillspector-ui
npm install
```

---

## Usage

**Quick launch (Windows):**

Double-click `launch.bat` — builds automatically on first run.

**From terminal:**

```bash
npm start          # Build and launch
```

**Development mode** (hot-reload with Vite + Electron):

```bash
npm run electron:dev
```

**Other commands:**

```bash
npm run build      # Production build
npm run typecheck   # Type-check both renderer and electron code
npm run dev         # Vite dev server only (no Electron window)
```

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Start scan |
| `Alt + 1` | Scan view |
| `Alt + 2` | History view |
| `Alt + 3` | Favorites view |
| `Alt + 4` | Settings view |

---

## How it works

SkillSpector UI is a frontend. NVIDIA SkillSpector does the actual scanning.

The app locates `skillspector.exe` automatically (or uses a manually configured path), then invokes it as a subprocess using `child_process.spawn` with explicit argument arrays and `shell: false`. No shell string interpolation, no `exec()`.

```
skillspector.exe scan <target> --format json --output <tempfile> [--recursive] [--no-llm]
```

When LLM analysis is enabled, Ollama connection details are passed via process-scoped environment variables (`SKILLSPECTOR_PROVIDER`, `SKILLSPECTOR_MODEL`, `OLLAMA_BASE_URL`).

The CLI writes a JSON report to a temp file. The app reads it, normalizes the data into a structured format, saves it to history, and displays it in the UI. Stdout is parsed in real-time for progress updates (`[3/7] Scanning skill-name`).

### Detection waterfall

The app tries to find SkillSpector in this order:

1. User-configured custom path (from Settings)
2. Known absolute path on disk
3. Relative candidate paths (e.g. `../skillspector/.venv/Scripts/skillspector.exe`)
4. System PATH via `where.exe`

Each candidate is validated by running `skillspector.exe --version` and checking for a recognized version string.

### Data storage

All app data lives in `%APPDATA%\SkillSpector UI\`. The NVIDIA SkillSpector installation is never modified.

```
%APPDATA%\SkillSpector UI\
├── settings.json
├── favorites.json
├── recent-paths.json
└── history/
    ├── index.json            # Lightweight metadata index
    └── scans/
        └── <uuid>.json       # Full scan report per scan
```

---

## Security

The Electron app follows security best practices:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Renderer communicates with the main process only through a typed IPC allowlist exposed via `contextBridge`
- All subprocess calls use `spawn()` with explicit argument arrays — no shell, no `exec()`
- File paths from the renderer are validated with `fs.realpathSync` to prevent symlink/junction traversal
- Process environment variables for LLM config are scoped per-spawn, not set globally

---

## Tech stack

| | |
|---|---|
| Runtime | Electron 35 |
| Frontend | React 19, Zustand 5 |
| Styling | Tailwind CSS 3, Lucide icons |
| Bundler | Vite 6 |
| Language | TypeScript 5.8 (end-to-end) |

---

## Project status

This is a v1.0 release. The core scan workflow, history, comparison, and export features are implemented and tested. There are currently no pre-built binaries — you run it from source via `npm start`.

Known limitations:
- Windows only (process management uses `taskkill`)
- No packaged `.exe` installer — requires Node.js to run
- SkillSpector must be installed separately

---

## Verification

The project includes regression test scripts that validate architecture, security boundaries, completeness logic, and comparison semantics without modifying source code:

```bash
npx tsx scripts/verify.ts                         # 17 tests
npx tsx scripts/verify-fixes.ts                   # 38 tests
npx tsx scripts/verify-presentation-fixes.ts      # 18 tests
npx tsx scripts/verify-recursive-completeness.ts  # 36 tests
npx tsx scripts/verify-scan-comparison.ts         # 35 tests
```

---

## Credits

- [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector) — the security scanner this UI is built around (Apache 2.0)
- [Ollama](https://ollama.com) — local LLM inference used for optional semantic analysis

---

## Disclaimer

SkillSpector UI is an independent community project by [0xFloCode](https://github.com/0xFloCode).
It is **not affiliated with, endorsed by, or supported by NVIDIA Corporation**.

NVIDIA and SkillSpector are trademarks of NVIDIA Corporation. This application does not modify, bundle, or redistribute any part of NVIDIA SkillSpector — it invokes the separately installed CLI as a subprocess.

---

## License

[MIT](LICENSE)
