---
name: apple-bento-grid
description: |
  Create Apple-inspired bento grid presentation cards for showcasing project stats,
  timelines, AI metadata, prompts, and achievements. Zero-gap grids, stat cards,
  pill tags, and dark quote cards with Apple aesthetic (#000, #161618, #1c1c1e).
license: MIT
metadata:
  author: Joe Hu
  version: "1.0.0"
---

# Apple Bento Grid

## Overview
Generate Apple-inspired bento card grids with zero-gap technique, tight spacing (6-8px), rounded corners (16-20px), subtle hairline borders (rgba(255,255,255,0.08)), high contrast typography (Sora / Inter / SF Pro), and prominent stat cards with `.num` and `.label`.

## Core Principles
1. **Cards Fill Their Cells**: `align-items: stretch` so every card fills its row height without ragged gaps.
2. **Dense & Balanced**: Every cell occupied, spanning hero cards across 2 columns/rows.
3. **Typography**: Display bold numbers with negative letter spacing (`-0.03em`), muted labels (`#86868b`).
4. **Dark Apple Surface**: Jet-black background (`#000000` / `#09090b`), dark card surface (`#121215`), elevated (`#1c1c20`), hairline border (`rgba(255,255,255,0.08)`).
5. **Color Accents**: Apple Blue `#0071e3` / Cyan `#0ea5e9`, Neon Lime `#e2f263` / `#10b981`, Purple `#a855f7`, Coral `#ff6b6b`.
