# Project: Fair Task Allocator

## 1. Project Overview
A web application that fairly distributes recurring tasks (e.g., university assignments) among a group using a coin-weighted voting system. Each participant gets a fixed budget of coins — 5, 10, or 15, chosen by the host — to express preferences. A Min-Cost Max-Flow algorithm then finds the globally optimal assignment.

The app is fully built and deployed. This file guides future AI sessions on constraints, conventions, and decisions already made.

## 2. Core Mechanics & Rules
- **Configurable coin budget:** The host picks 5, 10, or 15 coins per participant at session creation. 10 is the default.
- **The "Fewer Tasks" option:** A permanent voting option that lets participants signal a preference for a lighter workload. Coins placed here lower a participant's task capacity in the algorithm.
- **Hard constraint:** Every task must be assigned to exactly one person. No task may be left unassigned.
- **Soft constraint:** The algorithm maximises total group coin satisfaction (sum of coins on assigned tasks across all participants).
- **Tie-breaking:** When participants are tied on "Fewer Tasks" coins, the tie is broken by participant ID string order — deterministic and unbiased since Supabase assigns UUIDs randomly at creation time.

## 3. Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (new-york style) + Radix UI |
| Animations | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Fonts | Playfair Display (headings) + Inter (body) via `next/font/google` |
| Testing | Jest (unit) + Playwright (e2e) |
| Deployment | Vercel (auto-deploy on push to `main`) |

## 4. Design System
The UI follows an **Editorial Tech** aesthetic — warm, light, and typographically driven. Do not introduce cold grays, pure white/black, or a dark theme.

**Color palette (oklch):**
- Background: `oklch(0.97 0.010 80)` — warm off-white
- Foreground: `oklch(0.20 0.012 65)` — deep warm charcoal
- Primary (terracotta): `oklch(0.50 0.11 48)` — used for accents, highlights, CTAs
- Card: `oklch(0.94 0.012 78)`
- Border: `oklch(0.86 0.014 76)`
- Muted foreground: `oklch(0.47 0.018 68)`

These are defined as CSS variables in `src/app/globals.css`. Inner pages use inline `style={{}}` with hardcoded oklch values where opacity variants are needed (e.g. `oklch(0.50 0.11 48 / 0.15)`), since CSS custom properties don't support alpha variants in all contexts.

**Typography:**
- `font-serif` (Playfair Display) on all `h1`–`h4` — applied globally in `globals.css @layer base`
- `font-sans` (Inter) on body text, labels, UI elements
- Italic Playfair Display on hero accent spans for editorial flair

**Animations (Framer Motion):**
- Spring: `stiffness: 40, damping: 22` — slow and elegant, not bouncy
- Stagger: `0.18s` between children
- Hover scale: `1.02`
- Aurora background: long loop durations (22–35s), low opacity

## 5. User Flow
1. **Host creates a session** — enters host name, participant names, task titles, and selects coin budget (5 / 10 / 15). Receives a shareable link.
2. **Participants vote** — open the link, select their name, distribute coins across tasks and the "Fewer Tasks" option using +/− buttons, submit.
3. **Results** — once all participants have voted, the shareable link auto-redirects to the results page showing: final task assignments, each person's coin bids per task, a full vote breakdown matrix, and a per-person satisfaction score (coins on assigned tasks ÷ total coins spent).

## 6. Architecture & Key Decisions
- **`"use client"` on `src/app/page.tsx`** — required for Framer Motion. Intentional; it only affects the landing page route.
- **Algorithm lives in `src/lib/algorithm.ts`** — pure function `calculateDistribution(tasks, participants, votes)`. Uses Min-Cost Max-Flow (MCMF). Do not simplify to a greedy approach — MCMF is necessary for global optimality.
- **Polling, not websockets** — the session and results pages poll Supabase every 3 seconds. Simple and sufficient for small groups.
- **Host identity via localStorage** — `host:<sessionId>` key identifies the creating device. No auth system.
- **Completed sessions redirect** — opening a shareable link for a completed session (`all_voted = true`) immediately redirects to `/session/[id]/results`.
- **Coin budget is read from the session record** — the voting UI reads `coins_per_participant` from Supabase, so the algorithm and voting interface automatically adapt to whatever the host chose.

## 7. Testing Requirements
After completing any iteration (feature, fix, or redesign), run the full test suite before committing. Both layers must pass:

1. **Unit tests** — `npm test`
   - Covers the allocation algorithm in `src/lib/algorithm.ts`.
   - All tests must pass with no failures.

2. **End-to-end tests** — `npx playwright test`
   - Covers the full session flow in the browser (create → vote → results).
   - All 8 tests must pass with no failures.
   - If UI changes break selectors or assertions, update the e2e tests to match the new UI before committing.

Only commit once both commands exit cleanly. Never skip or comment out failing tests to make the suite pass.
