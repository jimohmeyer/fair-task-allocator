# Project: Task Allocator (Coin Voting System)

## 1. Project Overview
We are building a web application to fairly distribute a set of recurring tasks (e.g., university assignments) among a group of people (usually around 4 participants, but should be dynamic). 
To make the distribution fair and preference-based, we use a gamified voting system: Each participant gets exactly 10 "coins" to weight their preferences.

## 2. Core Mechanics & Rules
* **The "10 Coins" Rule:** Every participant has exactly 10 coins to distribute across the available tasks.
* **The "Fewer Tasks" Option:** Because tasks often cannot be divided equally (e.g., 14 tasks for 4 people), there must be a permanent voting option called "Fewer Tasks (Capacity Bonus)". Placing coins here signals a preference to receive a smaller total quantity of tasks.
* **Hard Constraint:** Every single task MUST be assigned to exactly one person at the end of the process. No tasks can be left unassigned.
* **Soft Constraint (Optimization):** The allocation algorithm should maximize the overall group satisfaction (highest sum of fulfilled coin weights) while respecting the "Fewer Tasks" weighting.

## 3. Tech Stack
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **UI Components:** shadcn/ui (use this for buttons, inputs, sliders, cards, etc.)
* **Database / Backend:** Supabase

## 4. User Flow
1. **Host View (Session Creation):**
   * Input host name.
   * Add participant names dynamically.
   * Add task titles dynamically.
   * Generate a shareable session link.
2. **Participant View (Voting):**
   * Open link, select own name from the participant list.
   * View all tasks + the "Fewer Tasks" option.
   * Distribute exactly 10 coins using visual +/- buttons.
   * Submit vote.
3. **Result View (Distribution):**
   * Triggered once all participants have voted.
   * Displays the final calculated allocation (who got which task).

## 5. Development Phases for the AI Agent
Please execute the development in the following iterative phases. Do not build everything at once. Ask for review after each phase.

* **Phase 1: Data Modeling & Setup**
  * Define TypeScript interfaces for `Session`, `Participant`, `Task`, and `Vote`.
  * Set up the basic Next.js page structure.
* **Phase 2: Static UI (Mock Data)**
  * Build the Host creation UI.
  * Build the Participant voting UI (ensure the 10-coin logic works on the client side).
  * Use shadcn/ui components for a clean, modern look.
* **Phase 3: The Allocation Algorithm (Crucial)**
  * Create an isolated utility function `calculateDistribution(tasks, participants, votes)`.
  * This function must solve the assignment problem mathematically.
  * Write unit tests with dummy data (e.g., 4 people, 14 tasks) to verify the logic works flawlessly before integrating it into the UI.
* **Phase 4: Backend Integration**
  * Connect the application to Supabase.
  * Store sessions, tasks, participants, and votes in the database.
  * Implement real-time or polling updates to check if all participants have voted.
