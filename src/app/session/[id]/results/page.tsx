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

const POLL_INTERVAL_MS = 3000

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [allVoted, setAllVoted] = useState(false)
  const [votedCount, setVotedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [results, setResults] = useState<Assignment[] | null>(null)
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
            {/* Pulsing glow orb */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "oklch(0.78 0.17 75 / 0.2)" }}
              />
              <div
                className="absolute inset-3 rounded-full animate-pulse"
                style={{ background: "oklch(0.78 0.17 75 / 0.15)" }}
              />
              <div
                className="relative w-12 h-12 rounded-full"
                style={{ background: "oklch(0.78 0.17 75 / 0.3)" }}
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
              style={{
                borderColor: "oklch(0.78 0.17 75 / 0.2)",
                color: "oklch(0.78 0.17 75 / 0.7)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.78 0.17 75)" }}
              />
              Checking every 3 seconds
            </div>
          </div>
        </main>
      </div>
    )
  }

  const totalTasksAssigned = (results ?? []).reduce((s, a) => s + a.tasks.length, 0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-center overflow-hidden -z-10">
        <div
          className="w-[600px] h-[400px] rounded-full blur-[120px] mt-24"
          style={{ background: "oklch(0.78 0.17 75 / 0.10)" }}
        />
      </div>

      <main className="pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <p className="text-sm text-primary font-medium uppercase tracking-widest">
              Final results
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Task Allocation</h1>
            <p className="text-muted-foreground">
              All participants have voted. Here is the final distribution.
            </p>
          </div>

          {/* Summary stats row */}
          {results && results.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: "oklch(0.22 0 0)", background: "oklch(0.13 0 0)" }}
              >
                <p className="text-3xl font-bold tabular-nums">{totalTasksAssigned}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                  Tasks assigned
                </p>
              </div>
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: "oklch(0.22 0 0)", background: "oklch(0.13 0 0)" }}
              >
                <p className="text-3xl font-bold tabular-nums">{results.length}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                  Participants
                </p>
              </div>
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ borderColor: "oklch(0.22 0 0)", background: "oklch(0.13 0 0)" }}
              >
                <p
                  className="text-3xl font-bold"
                  style={{ color: "oklch(0.78 0.17 75)" }}
                >
                  ✓
                </p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                  Preferences optimized
                </p>
              </div>
            </div>
          )}

          {/* Results grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(results ?? []).map((assignment, idx) => {
              const hues = [75, 55, 90, 65]
              const hue = hues[idx % hues.length]
              return (
                <Card
                  key={assignment.participant_id}
                  className="overflow-hidden relative"
                  style={{ borderColor: "oklch(0.22 0 0)" }}
                >
                  {/* Gradient top accent border */}
                  <div
                    className="absolute top-0 inset-x-0 h-0.5"
                    style={{
                      background: `linear-gradient(90deg, oklch(0.78 0.17 ${hue} / 0.8), oklch(0.78 0.17 ${hue} / 0.2))`,
                    }}
                  />
                  <CardHeader className="pb-3 pt-6">
                    <CardTitle className="flex items-center justify-between text-base">
                      {assignment.participant_name}
                      <Badge
                        variant="secondary"
                        style={{
                          background: "oklch(0.78 0.17 75 / 0.1)",
                          color: "oklch(0.78 0.17 75)",
                        }}
                      >
                        {assignment.tasks.length} task{assignment.tasks.length !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ol className="space-y-2.5">
                      {assignment.tasks.map((task, taskIdx) => (
                        <li key={task.id} className="text-sm flex gap-3 items-start">
                          <span
                            className="shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold mt-px"
                            style={{
                              background: "oklch(0.78 0.17 75 / 0.12)",
                              color: "oklch(0.78 0.17 75 / 0.8)",
                            }}
                          >
                            {taskIdx + 1}
                          </span>
                          <span className="text-foreground/80">{task.title}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* New session CTA */}
          <div className="flex justify-center pt-6 pb-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Ready for another round?</p>
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
