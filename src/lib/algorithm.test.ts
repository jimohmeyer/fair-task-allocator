import { calculateDistribution } from "./algorithm"
import type { Task, Participant, Vote } from "./types"

// ── Helpers ────────────────────────────────────────────────────────────────

function makeParticipants(names: string[]): Participant[] {
  return names.map((name, i) => ({
    id: `p${i + 1}`,
    session_id: "s1",
    name,
    has_voted: true,
  }))
}

function makeTasks(titles: string[]): Task[] {
  return titles.map((title, i) => ({
    id: `t${i + 1}`,
    session_id: "s1",
    title,
    position: i,
  }))
}

/** Build a vote row. task_id = null for "Fewer Tasks". */
function vote(participantId: string, taskId: string | null, coins: number): Vote {
  return { id: `v-${participantId}-${taskId}`, session_id: "s1", participant_id: participantId, task_id: taskId, coins }
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe("calculateDistribution", () => {
  // ── Edge cases ────────────────────────────────────────────────────────

  test("returns empty array when there are no participants", () => {
    const tasks = makeTasks(["T1"])
    const result = calculateDistribution(tasks, [], [])
    expect(result).toEqual([])
  })

  test("assigns all tasks to a single participant", () => {
    const participants = makeParticipants(["Alice"])
    const tasks = makeTasks(["T1", "T2", "T3"])
    const votes: Vote[] = [
      vote("p1", "t1", 4),
      vote("p1", "t2", 4),
      vote("p1", "t3", 2),
    ]
    const result = calculateDistribution(tasks, participants, votes)
    expect(result).toHaveLength(1)
    expect(result[0].tasks).toHaveLength(3)
  })

  test("handles zero tasks gracefully", () => {
    const participants = makeParticipants(["Alice", "Bob"])
    const result = calculateDistribution([], participants, [])
    expect(result.every((a) => a.tasks.length === 0)).toBe(true)
  })

  // ── Divisible case (extra = 0) ─────────────────────────────────────────

  test("distributes equally when N is divisible by P", () => {
    // 4 participants, 8 tasks → each gets exactly 2
    const participants = makeParticipants(["A", "B", "C", "D"])
    const tasks = makeTasks(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"])
    const votes: Vote[] = [
      // Everyone puts 10 coins spread across tasks, no fewer-tasks preference
      vote("p1", "t1", 4), vote("p1", "t2", 3), vote("p1", "t3", 2), vote("p1", "t4", 1),
      vote("p2", "t5", 4), vote("p2", "t6", 3), vote("p2", "t7", 2), vote("p2", "t8", 1),
      vote("p3", "t1", 1), vote("p3", "t2", 1), vote("p3", "t5", 4), vote("p3", "t6", 4),
      vote("p4", "t3", 3), vote("p4", "t4", 3), vote("p4", "t7", 2), vote("p4", "t8", 2),
    ]
    const result = calculateDistribution(tasks, participants, votes)
    expect(result).toHaveLength(4)
    result.forEach((a) => expect(a.tasks).toHaveLength(2))
    const allAssigned = result.flatMap((a) => a.tasks.map((t) => t.id))
    expect(new Set(allAssigned).size).toBe(8) // all tasks assigned exactly once
  })

  // ── Main scenario: 4 participants, 14 tasks ────────────────────────────

  test("4 participants / 14 tasks: correct capacities (2 get 3, 2 get 4)", () => {
    // base=3, extra=2 → top 2 (fewest capacity preference) get 4; bottom 2 get 3
    // We make p3 and p4 prefer fewer tasks, so they should get capacity=3
    const participants = makeParticipants(["Alice", "Bob", "Carol", "Dave"])
    const tasks = makeTasks(Array.from({ length: 14 }, (_, i) => `Task ${i + 1}`))

    const votes: Vote[] = [
      // Alice: no fewer-tasks preference
      vote("p1", "t1", 3), vote("p1", "t2", 3), vote("p1", "t3", 2), vote("p1", "t4", 2),
      // Bob: no fewer-tasks preference
      vote("p2", "t5", 3), vote("p2", "t6", 3), vote("p2", "t7", 2), vote("p2", "t8", 2),
      // Carol: 4 coins on fewer-tasks
      vote("p3", null, 4), vote("p3", "t9", 3), vote("p3", "t10", 3),
      // Dave: 6 coins on fewer-tasks (most)
      vote("p4", null, 6), vote("p4", "t11", 2), vote("p4", "t12", 2),
    ]

    const result = calculateDistribution(tasks, participants, votes)
    expect(result).toHaveLength(4)

    const totalAssigned = result.reduce((s, a) => s + a.tasks.length, 0)
    expect(totalAssigned).toBe(14) // all tasks assigned

    // Dave has most fewer-tasks coins → gets 3
    const dave = result.find((a) => a.participant_id === "p4")!
    expect(dave.tasks.length).toBe(3)

    // Carol has second most → gets 3
    const carol = result.find((a) => a.participant_id === "p3")!
    expect(carol.tasks.length).toBe(3)

    // Alice and Bob get 4 each
    const alice = result.find((a) => a.participant_id === "p1")!
    const bob = result.find((a) => a.participant_id === "p2")!
    expect(alice.tasks.length).toBe(4)
    expect(bob.tasks.length).toBe(4)

    // Each task assigned exactly once
    const allIds = result.flatMap((a) => a.tasks.map((t) => t.id))
    expect(new Set(allIds).size).toBe(14)
  })

  test("4 participants / 14 tasks: greedy respects highest coin preferences", () => {
    const participants = makeParticipants(["Alice", "Bob", "Carol", "Dave"])
    const tasks = makeTasks(Array.from({ length: 14 }, (_, i) => `Task ${i + 1}`))

    const votes: Vote[] = [
      // Alice really wants t1 (8 coins)
      vote("p1", "t1", 8), vote("p1", "t2", 1), vote("p1", "t3", 1),
      // Bob also wants t1 but less (3 coins) — Alice should win
      vote("p2", "t1", 3), vote("p2", "t5", 3), vote("p2", "t6", 2), vote("p2", "t7", 2),
      // Carol and Dave spread coins
      vote("p3", "t8", 4), vote("p3", "t9", 3), vote("p3", "t10", 3),
      vote("p4", "t11", 4), vote("p4", "t12", 3), vote("p4", "t13", 3),
    ]

    const result = calculateDistribution(tasks, participants, votes)
    const alice = result.find((a) => a.participant_id === "p1")!
    expect(alice.tasks.some((t) => t.id === "t1")).toBe(true)

    const allIds = result.flatMap((a) => a.tasks.map((t) => t.id))
    expect(new Set(allIds).size).toBe(14)
  })

  // ── Tie-breaking ──────────────────────────────────────────────────────

  test("tie on fewer-tasks coins broken by vote submission order (earlier = fewer tasks)", () => {
    // 3 participants, 7 tasks → base=2, extra=1 → 2 get 2 tasks, 1 gets 3
    // p1 and p2 both put 3 coins on fewer-tasks; p1 voted first → p1 gets fewer (2)
    const participants = makeParticipants(["First", "Second", "Third"])
    const tasks = makeTasks(Array.from({ length: 7 }, (_, i) => `T${i + 1}`))

    const votes: Vote[] = [
      // p1 votes first
      vote("p1", null, 3), vote("p1", "t1", 4), vote("p1", "t2", 3),
      // p2 votes second (same fewer-tasks coins)
      vote("p2", null, 3), vote("p2", "t3", 4), vote("p2", "t4", 3),
      // p3 no fewer-tasks preference
      vote("p3", "t5", 4), vote("p3", "t6", 3), vote("p3", "t7", 3),
    ]

    const result = calculateDistribution(tasks, participants, votes)
    const totalAssigned = result.reduce((s, a) => s + a.tasks.length, 0)
    expect(totalAssigned).toBe(7)

    // p1 and p2 both tied with fewer-tasks coins; earlier submitter (p1) gets fewer tasks
    const first = result.find((a) => a.participant_id === "p1")!
    const second = result.find((a) => a.participant_id === "p2")!
    expect(first.tasks.length).toBe(2)
    expect(second.tasks.length).toBe(2)
  })

  // ── All coins on one task ──────────────────────────────────────────────

  test("all coins on one task: that task is assigned to the participant if capacity allows", () => {
    const participants = makeParticipants(["Alice", "Bob"])
    const tasks = makeTasks(["T1", "T2", "T3", "T4"])

    const votes: Vote[] = [
      // Alice puts all 10 on t1
      vote("p1", "t1", 10),
      // Bob spreads evenly
      vote("p2", "t2", 4), vote("p2", "t3", 3), vote("p2", "t4", 3),
    ]

    const result = calculateDistribution(tasks, participants, votes)
    const alice = result.find((a) => a.participant_id === "p1")!
    expect(alice.tasks.some((t) => t.id === "t1")).toBe(true)

    const allIds = result.flatMap((a) => a.tasks.map((t) => t.id))
    expect(new Set(allIds).size).toBe(4)
  })

  // ── MCMF optimality ───────────────────────────────────────────────────

  test("MCMF beats greedy: Alice gets both preferred tasks instead of a forced one", () => {
    // Bob's votes appear first → greedy would assign Bob T2 (ties Alice's T2=3)
    // leaving Alice force-assigned T3 with 0 satisfaction.
    // MCMF: Alice→{T1,T2}, Bob→{T3,T4}. Total satisfied = 5+3+2+1 = 11 vs greedy 9.
    const participants = makeParticipants(["Alice", "Bob"])
    const tasks = makeTasks(["T1", "T2", "T3", "T4"])
    const votes: Vote[] = [
      vote("p2", "t1", 4), vote("p2", "t2", 3), vote("p2", "t3", 2), vote("p2", "t4", 1),
      vote("p1", "t1", 5), vote("p1", "t2", 3),
    ]
    const result = calculateDistribution(tasks, participants, votes)
    const alice = result.find((a) => a.participant_id === "p1")!
    const bob   = result.find((a) => a.participant_id === "p2")!
    expect(alice.tasks).toHaveLength(2)
    expect(bob.tasks).toHaveLength(2)
    expect(new Set(result.flatMap((a) => a.tasks.map((t) => t.id))).size).toBe(4)
    expect(alice.tasks.map((t) => t.id).sort()).toEqual(["t1", "t2"])
    expect(bob.tasks.map((t) => t.id).sort()).toEqual(["t3", "t4"])
  })

  test("MCMF optimal: highest bidder wins contested tasks across 3 participants", () => {
    // 3 participants, 6 tasks → each gets exactly 2
    // Alice: T1=7, T2=3  |  Bob: T1=5, T3=5  |  Carol: T2=6, T4=4
    // Alice wins T1 (7>5), Carol wins T2 (6>3), Bob wins T3; remaining force-assigned
    const participants = makeParticipants(["Alice", "Bob", "Carol"])
    const tasks = makeTasks(["T1", "T2", "T3", "T4", "T5", "T6"])
    const votes: Vote[] = [
      vote("p2", "t1", 5), vote("p2", "t3", 5),
      vote("p3", "t2", 6), vote("p3", "t4", 4),
      vote("p1", "t1", 7), vote("p1", "t2", 3),
    ]
    const result = calculateDistribution(tasks, participants, votes)
    expect(result.every((a) => a.tasks.length === 2)).toBe(true)
    expect(new Set(result.flatMap((a) => a.tasks.map((t) => t.id))).size).toBe(6)
    expect(result.find((a) => a.participant_id === "p1")!.tasks.some((t) => t.id === "t1")).toBe(true)
    expect(result.find((a) => a.participant_id === "p3")!.tasks.some((t) => t.id === "t2")).toBe(true)
  })
})
