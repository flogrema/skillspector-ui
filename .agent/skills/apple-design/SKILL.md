---
name: apple-design
description: |
  Cross-platform UI/UX design grounded in Apple's Human Interface Guidelines (HIG)
  and Liquid Glass aesthetics. Focuses on clean typography, two-layer hierarchy
  (content vs functional layer), purposeful accents, and craft.
license: MIT
metadata:
  author: Dick Wu
  version: "1.0.0"
---

# Apple Design Skill

## Core Guidelines
1. **Two-Layer Depth Architecture**:
   - **Content layer**: Solid, rich imagery, cards, grids, and primary content.
   - **Functional layer**: Navigation bars, sidebars, floating controls, dialogs using Liquid Glass (`backdrop-blur-xl`, subtle translucent background, hairline border `border-white/10`).
2. **Apple Dark Mode Craft**:
   - Deep rich pitch dark background (`bg-black` or `bg-[#09090b]`).
   - Cards and surfaces: `bg-[#121215]` / `bg-[#18181c]`.
   - Borders: hairline `border-white/[0.08]` with subtle inner highlights.
   - Micro-interactions: responsive spring hover states, subtle scale, clear active states.
3. **Typography & Readability**:
   - SF Pro / Inter font stack.
   - High contrast titles (`text-white` or `text-zinc-100`), subdued secondary labels (`text-zinc-400` / `text-[#86868b]`).
4. **Purposeful Accents**:
   - Don't spray color everywhere. Use one or two deliberate accent colors (e.g. Apple Cyan `#0ea5e9` or Lime `#e2f263`) for key actions, badges, and statuses.
