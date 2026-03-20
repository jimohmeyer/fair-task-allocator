"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { getSupabase } from "@/lib/supabase"
import { calculateDistribution } from "@/lib/algorithm"
import type { Participant, Task, Vote, Assignment } from "@/lib/types"

const terra = "oklch(0.50 0.11 48)"
const terraTint = (a: number) => `oklch(0.50 0.11 48 / ${a})`
const cardBg = "oklch(0.94 0.012 78)"
const borderCol = "oklch(0.86 0.014 76)"

const FEWER_TASKS_KEY = "__fewer__"
const POLL_INTERVAL_MS = 3000

// participantId -> taskId (FEWER_TASKS_KEY for capacity option) -> coins
type CoinLookup = Record<string, Record<string, number>>

function buildCoinLookup(votes: Vote[]): CoinLookup {
  const lookup: CoinLookup = {}
  for (const v of votes) {
    if (!lookup[v.participant_id]) lookup[v.participant_id] = {}
    lookup[v.participant_id][v.task_id ?? FEWER_TASKS_KEY] = v.coins
  }
  return lookup
}

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [allVoted, setAllVoted] = useState(false)
  const [votedCount, setVotedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [results, setResults] = useState<Assignment[] | null>(null)
  const [voteData, setVoteData] = useState<Vote[]>([])
  const [participantData, setParticipantData] = useState<Participant[]>([])
  const [taskData, setTaskData] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchAndCompute() {
    try {
      const supabase = getSupabase()

      const [
        { data: session, error: sErr },
        { data: participants, error: pErr },
        { data: tasks, error: tErr },
      ] = await Promise.all([
        supabase.from("sessions").select("all_voted").eq("id", sessionId).single(),
        supabase.from("participants").select("*").eq("session_id", sessionId).order("name"),
        supabase.from("tasks").select("*").eq("session_id", sessionId).order("position"),
      ])

      if (sErr) throw sErr
      if (pErr) throw pErr
      if (tErr) throw tErr

      const voted = (participants ?? []).filter((p: Participant) => p.has_voted).length
      setVotedCount(voted)
      setTotalCount((participants ?? []).length)

      if (session?.all_voted) {
        if (pollingRef.current) clearInterval(pollingRef.current)

        const { data: votes, error: vErr } = await supabase
          .from("votes")
          .select("*")
          .eq("session_id", sessionId)

        if (vErr) throw vErr

        const distribution = calculateDistribution(
          tasks as Task[],
          participants as Participant[],
          votes as Vote[]
        )
        setResults(distribution)
        setVoteData(votes as Vote[])
        setParticipantData(participants as Participant[])
        setTaskData(tasks as Task[])
        setAllVoted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results")
    }
  }

  useEffect(() => {
    fetchAndCompute()
    pollingRef.current = setInterval(fetchAndCompute, POLL_INTERVAL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-screen p-6">
          <div className="text-center space-y-3">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (!allVoted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-screen p-6">
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: terraTint(0.18) }}
              />
              <div
                className="absolute inset-3 rounded-full animate-pulse"
                style={{ background: terraTint(0.14) }}
              />
              <div
                className="relative w-12 h-12 rounded-full"
                style={{ background: terraTint(0.28) }}
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Waiting for votes…</h2>
              {totalCount > 0 && (
                <p className="text-muted-foreground text-lg">
                  {votedCount} of {totalCount} participants have voted.
                </p>
              )}
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: terraTint(0.25), color: terraTint(0.7) }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: terra }}
              />
              Checking every 3 seconds
            </div>
          </div>
        </main>
      </div>
    )
  }

  const totalTasksAssigned = (results ?? []).reduce((s, a) => s + a.tasks.length, 0)

  // Derived lookups — built once at render time, no extra fetch
  const coinLookup = buildCoinLookup(voteData)

  // Total coins spent per participant (denominator for satisfaction %)
  const totalCoinsByParticipant: Record<string, number> = {}
  for (const v of voteData) {
    totalCoinsByParticipant[v.participant_id] = (totalCoinsByParticipant[v.participant_id] ?? 0) + v.coins
  }

  // taskId -> participantId (which person was assigned this task)
  const assignedTo = new Map<string, string>()
  for (const a of results ?? []) {
    for (const t of a.tasks) {
      assignedTo.set(t.id, a.participant_id)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-center overflow-hidden -z-10">
        <div
          className="w-[600px] h-[400px] rounded-full blur-[120px] mt-24"
          style={{ background: terraTint(0.12) }}
        />
      </div>

      <main className="pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* Header */}
          <div className="space-y-1">
            <p className="text-sm text-primary font-medium uppercase tracking-widest font-sans">
              Final results
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Task Allocation</h1>
            <p className="text-muted-foreground font-sans">
              All participants have voted. Here is the final distribution.
            </p>
          </div>

          {/* Summary stats */}
          {results && results.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: borderCol, background: cardBg }}
              >
                <p className="text-3xl font-bold tabular-nums">{totalTasksAssigned}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-sans">
                  Tasks assigned
                </p>
              </div>
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: borderCol, background: cardBg }}
              >
                <p className="text-3xl font-bold tabular-nums">{results.length}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-sans">
                  Participants
                </p>
              </div>
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: borderCol, background: cardBg }}
              >
                <p className="text-3xl font-bold" style={{ color: terra }}>✓</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-sans">
                  Preferences optimized
                </p>
              </div>
            </div>
          )}

          {/* Assignment cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(results ?? []).map((assignment, idx) => {
              const hues = [48, 38, 58, 68]
              const hue = hues[idx % hues.length]
              return (
                <Card
                  key={assignment.participant_id}
                  className="overflow-hidden relative"
                  style={{ borderColor: borderCol }}
                >
                  {/* Gradient top accent */}
                  <div
                    className="absolute top-0 inset-x-0 h-0.5"
                    style={{
                      background: `linear-gradient(90deg, oklch(0.50 0.13 ${hue} / 0.8), oklch(0.50 0.13 ${hue} / 0.15))`,
                    }}
                  />
                  <CardHeader className="pb-3 pt-6">
                    <CardTitle className="flex items-center justify-between text-base">
                      {assignment.participant_name}
                      <Badge
                        variant="secondary"
                        style={{ background: terraTint(0.10), color: terra }}
                      >
                        {assignment.tasks.length} task{assignment.tasks.length !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ol className="space-y-2.5">
                      {assignment.tasks.map((task, taskIdx) => {
                        const coins = coinLookup[assignment.participant_id]?.[task.id] ?? 0
                        return (
                          <li key={task.id} className="text-sm flex gap-3 items-center justify-between">
                            <div className="flex gap-3 items-center min-w-0">
                              <span
                                className="shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold"
                                style={{
                                  background: terraTint(0.12),
                                  color: terraTint(0.8),
                                }}
                              >
                                {taskIdx + 1}
                              </span>
                              <span className="text-foreground/80 truncate">{task.title}</span>
                            </div>
                            {coins > 0 && (
                              <span
                                className="shrink-0 text-xs font-semibold tabular-nums font-sans"
                                style={{ color: terra }}
                              >
                                {coins} 🪙
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ol>

                    {/* Satisfaction score */}
                    {(() => {
                      const coinsOnAssigned = assignment.tasks.reduce(
                        (sum, task) => sum + (coinLookup[assignment.participant_id]?.[task.id] ?? 0),
                        0
                      )
                      const total = totalCoinsByParticipant[assignment.participant_id] || 10
                      const pct = Math.round((coinsOnAssigned / total) * 100)
                      return (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: borderCol }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">
                              Satisfaction
                            </span>
                            <span
                              className="text-xs font-semibold tabular-nums font-sans"
                              style={{ color: terra }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden bg-border/50">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: terra }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Vote breakdown table */}
          {participantData.length > 0 && taskData.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary uppercase tracking-widest font-sans">
                  Vote Breakdown
                </p>
                <p className="text-muted-foreground text-sm font-sans">
                  Coins each participant placed on every option. Highlighted cells are the final assignments.
                </p>
              </div>

              <div
                className="overflow-x-auto rounded-2xl border"
                style={{ borderColor: borderCol }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: cardBg, borderBottom: `1px solid ${borderCol}` }}>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground font-sans whitespace-nowrap">
                        Task
                      </th>
                      {participantData.map((p) => (
                        <th
                          key={p.id}
                          className="px-4 py-3 font-medium text-center font-sans whitespace-nowrap"
                        >
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {taskData.map((task, i) => (
                      <tr
                        key={task.id}
                        style={{
                          borderBottom: i < taskData.length - 1 ? `1px solid ${borderCol}` : undefined,
                        }}
                      >
                        <td className="px-4 py-3 font-medium font-sans whitespace-nowrap max-w-[200px] truncate">
                          {task.title}
                        </td>
                        {participantData.map((p) => {
                          const coins = coinLookup[p.id]?.[task.id] ?? 0
                          const isAssigned = assignedTo.get(task.id) === p.id
                          return (
                            <td
                              key={p.id}
                              className="px-4 py-3 text-center tabular-nums font-sans"
                              style={
                                isAssigned
                                  ? {
                                      background: terraTint(0.08),
                                      color: terra,
                                      fontWeight: 600,
                                    }
                                  : {}
                              }
                            >
                              {coins > 0 ? (
                                coins
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* Fewer Tasks row — capacity preference, no assignment highlight */}
                    <tr style={{ borderTop: `2px solid ${borderCol}`, background: cardBg }}>
                      <td className="px-4 py-3 text-muted-foreground italic font-sans whitespace-nowrap">
                        Fewer Tasks
                      </td>
                      {participantData.map((p) => {
                        const coins = coinLookup[p.id]?.[FEWER_TASKS_KEY] ?? 0
                        return (
                          <td
                            key={p.id}
                            className="px-4 py-3 text-center tabular-nums text-muted-foreground font-sans"
                          >
                            {coins > 0 ? (
                              coins
                            ) : (
                              <span className="opacity-30">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* New session CTA */}
          <div className="flex justify-center pt-2 pb-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground font-sans">Ready for another round?</p>
              <Button asChild size="lg" className="px-8">
                <Link href="/create">Start a new session →</Link>
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
