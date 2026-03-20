import type { Task, Participant, Vote, Assignment } from "./types"

const FEWER_TASKS_TASK_ID = null // votes with task_id = null mean "Fewer Tasks"

// ── Min-Cost Max-Flow helpers ───────────────────────────────────────────────

interface MCMFEdge {
  to: number
  cap: number
  cost: number
  flow: number
  rev: number
}

type Graph = MCMFEdge[][]

function mcmfAddEdge(graph: Graph, u: number, v: number, cap: number, cost: number): void {
  graph[u].push({ to: v, cap, cost, flow: 0, rev: graph[v].length })
  graph[v].push({ to: u, cap: 0, cost: -cost, flow: 0, rev: graph[u].length - 1 })
}

function minCostMaxFlow(graph: Graph, s: number, t: number, nodeCount: number): void {
  while (true) {
    const dist = new Array<number>(nodeCount).fill(Infinity)
    const inQueue = new Array<boolean>(nodeCount).fill(false)
    const prevNode = new Array<number>(nodeCount).fill(-1)
    const prevEdge = new Array<number>(nodeCount).fill(-1)

    dist[s] = 0
    const queue: number[] = [s]
    inQueue[s] = true

    while (queue.length > 0) {
      const u = queue.shift()!
      inQueue[u] = false
      for (let i = 0; i < graph[u].length; i++) {
        const e = graph[u][i]
        if (e.cap > 0 && dist[u] + e.cost < dist[e.to]) {
          dist[e.to] = dist[u] + e.cost
          prevNode[e.to] = u
          prevEdge[e.to] = i
          if (!inQueue[e.to]) { queue.push(e.to); inQueue[e.to] = true }
        }
      }
    }

    if (dist[t] === Infinity) break

    let flow = Infinity
    let v = t
    while (v !== s) { flow = Math.min(flow, graph[prevNode[v]][prevEdge[v]].cap); v = prevNode[v] }

    v = t
    while (v !== s) {
      const u = prevNode[v]; const ei = prevEdge[v]
      graph[u][ei].cap -= flow; graph[u][ei].flow += flow
      graph[graph[u][ei].to][graph[u][ei].rev].cap += flow
      v = u
    }
  }
}

/**
 * Assigns tasks to participants using a two-step algorithm:
 *
 * 1. Capacity determination — participants who placed more coins on
 *    "Fewer Tasks" are awarded a lower task cap (base tasks instead of base+1).
 *
 * 2. Optimal assignment via Min-Cost Max-Flow — considers all possible
 *    assignments simultaneously and picks the combination that maximises
 *    total coin satisfaction across the whole group.
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

  votes.forEach((v) => {
    if (v.task_id === FEWER_TASKS_TASK_ID) {
      fewerCoins[v.participant_id] = (fewerCoins[v.participant_id] ?? 0) + v.coins
    }
  })

  // Sort participants: most fewer-task coins first; ties broken by participant ID
  // (UUIDs are randomly assigned at creation, so ID order is an unbiased tie-break)
  const sorted = [...participants].sort((a, b) => {
    const coinDiff = (fewerCoins[b.id] ?? 0) - (fewerCoins[a.id] ?? 0)
    if (coinDiff !== 0) return coinDiff
    return a.id < b.id ? -1 : 1
  })

  // Top (P - extra) participants get base capacity; the rest get base + 1
  const capacity: Record<string, number> = {}
  sorted.forEach((p, i) => {
    capacity[p.id] = i < P - extra ? base : base + 1
  })

  // Edge case: extra === 0 means all participants get exactly `base` tasks.
  // The sorted loop already handles this because P - extra === P, so every
  // participant hits the first branch (capacity = base).

  // ── Step 2: Optimal assignment via Min-Cost Max-Flow ─────────────────────
  // Graph layout:
  //   Node 0      : source (S)
  //   Nodes 1..N  : one per task
  //   Nodes N+1..N+P : one per participant
  //   Node N+P+1  : sink (T)
  const S = 0, T = N + P + 1, nodeCount = N + P + 2

  const taskIndex = new Map(tasks.map((t, i) => [t.id, i]))
  const participantIndex = new Map(participants.map((p, i) => [p.id, i]))

  // Build coin-weight matrix (negated costs so MCMF minimises → maximises satisfaction)
  const coinWeight: number[][] = Array.from({ length: N }, () => new Array<number>(P).fill(0))
  for (const v of votes) {
    if (v.task_id === FEWER_TASKS_TASK_ID) continue
    const ti = taskIndex.get(v.task_id!), pi = participantIndex.get(v.participant_id)
    if (ti !== undefined && pi !== undefined) coinWeight[ti][pi] = v.coins
  }

  const graph: Graph = Array.from({ length: nodeCount }, () => [])
  for (let ti = 0; ti < N; ti++) mcmfAddEdge(graph, S, ti + 1, 1, 0)
  for (let ti = 0; ti < N; ti++)
    for (let pi = 0; pi < P; pi++)
      mcmfAddEdge(graph, ti + 1, N + pi + 1, 1, -coinWeight[ti][pi])
  participants.forEach((p, pi) => mcmfAddEdge(graph, N + pi + 1, T, capacity[p.id], 0))

  minCostMaxFlow(graph, S, T, nodeCount)

  const assignments: Record<string, string[]> = {}
  participants.forEach((p) => (assignments[p.id] = []))

  for (let ti = 0; ti < N; ti++) {
    for (const edge of graph[ti + 1]) {
      if (edge.to >= N + 1 && edge.to <= N + P && edge.cap === 0) {
        assignments[participants[edge.to - N - 1].id].push(tasks[ti].id)
        break
      }
    }
  }

  // Safety net: force-assign any tasks left unrouted (should never trigger)
  const assignedTask = new Set(Object.values(assignments).flat())
  const remainingCap: Record<string, number> = {}
  participants.forEach((p) => { remainingCap[p.id] = capacity[p.id] - assignments[p.id].length })
  for (const task of tasks.filter((t) => !assignedTask.has(t.id))) {
    const pick = participants.filter((p) => remainingCap[p.id] > 0)
      .sort((a, b) => remainingCap[b.id] - remainingCap[a.id])[0]
    if (!pick) break
    assignments[pick.id].push(task.id); remainingCap[pick.id]--
  }

  // ── Step 3: Build result ────────────────────────────────────────────────
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  return participants.map((p) => ({
    participant_id: p.id,
    participant_name: p.name,
    tasks: assignments[p.id].map((tid) => taskById.get(tid)!),
  }))
}
