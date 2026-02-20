import type { Task, Participant, Vote, Assignment } from "./types"

const FEWER_TASKS_TASK_ID = null // votes with task_id = null mean "Fewer Tasks"

/**
 * Assigns tasks to participants using a two-step algorithm:
 *
 * 1. Capacity determination — participants who placed more coins on
 *    "Fewer Tasks" are awarded a lower task cap (base tasks instead of base+1).
 *
 * 2. Greedy capacitated assignment — iterate vote weights descending; assign
 *    a task to a participant when both the task is still unassigned and the
 *    participant still has remaining capacity. Any leftover tasks are force-
 *    assigned to participants with spare capacity.
 */
export function calculateDistribution(
  tasks: Task[],
  participants: Participant[],
  votes: Vote[]
): Assignment[] {
  const N = tasks.length
  const P = participants.length

  if (P === 0) return []
  if (N === 0) return participants.map((p) => ({ participant_id: p.id, participant_name: p.name, tasks: [] }))

  const base = Math.floor(N / P)
  const extra = N % P // this many participants get (base + 1) tasks

  // ── Step 1: Determine capacity ──────────────────────────────────────────
  // Sum coins each participant put on "Fewer Tasks" (task_id = null)
  const fewerCoins: Record<string, number> = {}
  participants.forEach((p) => (fewerCoins[p.id] = 0))

  // Track submission order for tie-breaking (earlier index = higher priority for fewer tasks)
  // We rely on the order participants appear in the votes array for tie-breaking.
  const firstVoteIndex: Record<string, number> = {}
  votes.forEach((v, i) => {
    if (!(v.participant_id in firstVoteIndex)) {
      firstVoteIndex[v.participant_id] = i
    }
    if (v.task_id === FEWER_TASKS_TASK_ID) {
      fewerCoins[v.participant_id] = (fewerCoins[v.participant_id] ?? 0) + v.coins
    }
  })

  // Sort participants: most fewer-task coins first; ties broken by earlier vote
  const sorted = [...participants].sort((a, b) => {
    const coinDiff = (fewerCoins[b.id] ?? 0) - (fewerCoins[a.id] ?? 0)
    if (coinDiff !== 0) return coinDiff
    return (firstVoteIndex[a.id] ?? Infinity) - (firstVoteIndex[b.id] ?? Infinity)
  })

  // Top (P - extra) participants get base capacity; the rest get base + 1
  const capacity: Record<string, number> = {}
  sorted.forEach((p, i) => {
    capacity[p.id] = i < P - extra ? base : base + 1
  })

  // Edge case: extra === 0 means all participants get exactly `base` tasks.
  // The sorted loop already handles this because P - extra === P, so every
  // participant hits the first branch (capacity = base).

  // ── Step 2: Greedy assignment ───────────────────────────────────────────
  // Collect (participant_id, task_id, coins) for all real-task votes
  type WeightedVote = { participant_id: string; task_id: string; coins: number }
  const weightedVotes: WeightedVote[] = votes
    .filter((v): v is Vote & { task_id: string } => v.task_id !== FEWER_TASKS_TASK_ID && v.coins > 0)
    .map((v) => ({ participant_id: v.participant_id, task_id: v.task_id, coins: v.coins }))

  // Sort descending by coin weight
  weightedVotes.sort((a, b) => b.coins - a.coins)

  const assignedTask = new Set<string>()
  const remainingCap: Record<string, number> = { ...capacity }
  const assignments: Record<string, string[]> = {}
  participants.forEach((p) => (assignments[p.id] = []))

  // Greedy pass
  for (const wv of weightedVotes) {
    if (assignedTask.has(wv.task_id)) continue
    if ((remainingCap[wv.participant_id] ?? 0) <= 0) continue
    assignedTask.add(wv.task_id)
    assignments[wv.participant_id].push(wv.task_id)
    remainingCap[wv.participant_id]--
  }

  // Force-assign leftover tasks
  const unassigned = tasks.filter((t) => !assignedTask.has(t.id))
  // Find participants still with capacity, prioritize those with most remaining
  const participantsWithCap = participants.filter((p) => (remainingCap[p.id] ?? 0) > 0)

  for (const task of unassigned) {
    // Find a participant with remaining capacity
    const pick = participantsWithCap.find((p) => (remainingCap[p.id] ?? 0) > 0)
    if (!pick) break // should not happen if capacities are correct
    assignedTask.add(task.id)
    assignments[pick.id].push(task.id)
    remainingCap[pick.id]--
  }

  // ── Step 3: Build result ────────────────────────────────────────────────
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  return participants.map((p) => ({
    participant_id: p.id,
    participant_name: p.name,
    tasks: assignments[p.id].map((tid) => taskById.get(tid)!),
  }))
}
