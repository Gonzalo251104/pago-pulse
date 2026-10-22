# PagoPulse — Design System & Art Direction (`DESIGN.md`)

> Built applying **Impeccable** (`pbakaus/impeccable`), **Taste Skill** (`Leonxlnx/taste-skill`), and **Emil Kowalski Design Engineering** (`emilkowalski/skills`).

## 1. Aesthetic Direction: "Precision Point-of-Sale Terminal"
Inspired by Stripe Terminal, Square Register, and Linear. Instead of generic SaaS marketing cards or AI-slop gradients, the interface behaves like a **high-precision financial instrument**:
- **Asymmetric Split Workspace:** Live ledger stream on the left (8 columns) paired with a tactile Shift Register & Telemetry Rail on the right (4 columns).
- **Ticket-Level Scannability:** Every incoming payment is structured like a physical verification slip—wallet mark, customer name, high-contrast 3-digit security code stamp, tabular-nums amount in Peruvian Soles (`S/`), and a tactile one-press action.

## 2. Typography (`Plus Jakarta Sans` + `JetBrains Mono`)
- **UI & Display (`--font-sans`):** `Plus Jakarta Sans` — geometric clarity with warm humanistic terminals. Headings use tight tracking (`-0.025em`).
- **Financial & Cryptographic Figures (`--font-mono`):** `JetBrains Mono` with mandatory `font-variant-numeric: tabular-nums`. Used for all currency amounts (`S/ 45.50`), 3-digit security codes (`842`), timestamps (`14:03:22`), and UUID/HMAC identifiers to prevent layout jitter during live updates.

## 3. OKLCH Color System
All surfaces and accents are calibrated in perceptual `oklch()` space:
- `--bg-canvas`: `oklch(0.125 0.007 265)` (Deep Carbon Obsidian)
- `--bg-surface`: `oklch(0.165 0.009 265)` (Elevated Register Surface)
- `--bg-surface-hover`: `oklch(0.195 0.011 265)`
- `--bg-elevated`: `oklch(0.21 0.012 265)`
- `--text-primary`: `oklch(0.965 0.005 85)` (Warm Alabaster)
- `--text-secondary`: `oklch(0.71 0.012 265)` (Muted Slate Stone)
- `--text-tertiary`: `oklch(0.52 0.012 265)`
- `--accent-verified`: `oklch(0.79 0.165 162)` (Verdigris Mint for verified Soles)
- `--accent-pending`: `oklch(0.83 0.155 78)` (Amber Ledger for unclaimed payments)
- `--wallet-yape`: `oklch(0.72 0.18 326)` (Authentic Yape Plum-Magenta)
- `--wallet-plin`: `oklch(0.78 0.135 215)` (Crisp Plin Cerulean)

## 4. Motion & Micro-Interaction Engineering (`emil-design-eng`)
- **Custom Easing Tokens:**
  - `--ease-out-strong`: `cubic-bezier(0.23, 1, 0.32, 1)` (All entering elements, modals, and hover states)
  - `--ease-in-out-smooth`: `cubic-bezier(0.77, 0, 0.175, 1)` (On-screen layout transitions)
  - `--ease-sheet`: `cubic-bezier(0.32, 0.72, 0, 1)` (Dialogs and overlays)
- **Tactile Press Feedback:** Interactive buttons compress to `scale(0.97)` on `:active` within `120ms`.
- **Optical Hairlines over Harsh Borders:** Surfaces use `box-shadow: 0 0 0 1px oklch(1 0 0 / 0.065), 0 10px 30px -10px oklch(0 0 0 / 0.55)` instead of heavy 1px solid borders.
