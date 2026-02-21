# Fair Task Allocator

A preference-based, coin-weighted task distribution app that fairly divides recurring work among a group.

## Description

Fair Task Allocator lets a group distribute recurring tasks (e.g., university assignments, household chores) using a gamified voting system. Each participant gets exactly 10 coins to express their preferences across available tasks. Once everyone votes, a Min-Cost Max-Flow algorithm computes the assignment that maximizes total group satisfaction while respecting each person's workload preferences.

## Features

- 10-coin preference voting system — distribute coins to signal what you want
- "Fewer Tasks" capacity preference option for workload balancing
- Optimal task assignment via Min-Cost Max-Flow algorithm
- Real-time lobby with polling — see who has voted
- Shareable session links — participants join via URL
- Dark amber UI built with shadcn/ui and Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Database | Supabase (PostgreSQL) |
| Testing | Jest (unit) + Playwright (e2e) |

## How It Works

1. **Host creates a session** — enters participant names and task titles, then shares the generated session link.
2. **Participants vote** — each person opens the link, picks their name, and distributes exactly 10 coins across the task list (including the "Fewer Tasks" option if they prefer a lighter load).
3. **Algorithm computes results** — once everyone has voted, the optimal assignment is displayed showing who got which tasks.

### The Algorithm

Task assignment runs in two steps inside `src/lib/algorithm.ts`:

1. **Capacity determination** — coins placed on "Fewer Tasks" control how many tasks each person receives. Participants who weighted this option more heavily are assigned a lower task cap (`base` tasks instead of `base + 1`), where `base = floor(total_tasks / total_participants)`.

2. **Min-Cost Max-Flow** — a bipartite graph is constructed with tasks on one side and participants on the other. Edge costs are the negated coin weights (so minimizing cost = maximizing satisfaction). MCMF finds the flow that assigns every task to exactly one participant while respecting per-person capacity and maximizing total coin satisfaction across the group.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone <repo-url>
cd fair-task-allocator
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Supabase Schema

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  host_name    text not null,
  created_at   timestamptz not null default now(),
  all_voted    boolean not null default false,
  coins_per_participant integer not null default 10
);

create table participants (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name       text not null,
  has_voted  boolean not null default false
);

create table tasks (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  title      text not null,
  position   integer not null default 0
);

create table votes (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  task_id        uuid references tasks(id) on delete cascade, -- null = "Fewer Tasks"
  coins          integer not null
);
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

```bash
npm test              # Unit tests (Jest) — 11 tests covering the allocation algorithm
npx playwright test   # E2E tests (Playwright) — 8 tests for the full session flow
```

**Unit tests** (`src/lib/algorithm.test.ts`) verify the MCMF allocation logic in isolation using fixture data: correct task counts, preference satisfaction, tie-breaking, and edge cases (single participant, zero tasks, etc.).

**End-to-end tests** (`e2e/session.spec.ts`) drive a real browser through the complete flow: creating a session, participants joining and submitting votes, and verifying the results page shows the correct assignments.

## Project Structure

```
src/
  app/
    page.tsx                        # Landing page
    create/page.tsx                 # Host session creation
    session/[id]/page.tsx           # Participant voting lobby
    session/[id]/results/page.tsx   # Results / assignment display
  lib/
    algorithm.ts                    # Min-Cost Max-Flow allocation logic
    algorithm.test.ts               # Jest unit tests
    types.ts                        # TypeScript interfaces (Session, Participant, Task, Vote)
    supabase.ts                     # Supabase client singleton
e2e/
  session.spec.ts                   # Playwright end-to-end tests
```

## License

MIT — see [LICENSE](LICENSE) for details.
