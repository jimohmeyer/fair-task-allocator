"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        // Stop polling
        if (pollingRef.current) clearInterval(pollingRef.current)

        // Fetch votes and compute distribution
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
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  if (!allVoted) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">⏳</div>
          <h2 className="text-2xl font-bold">Waiting for votes…</h2>
          {totalCount > 0 && (
            <p className="text-muted-foreground">
              {votedCount} of {totalCount} participants have voted.
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Allocation Results</h1>
          <p className="text-muted-foreground mt-1">
            All participants have voted. Here is the final distribution.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(results ?? []).map((assignment) => (
            <Card key={assignment.participant_id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {assignment.participant_name}
                  <Badge variant="secondary">
                    {assignment.tasks.length} task{assignment.tasks.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {assignment.tasks.map((task) => (
                    <li key={task.id} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-foreground">•</span>
                      {task.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button asChild variant="outline">
            <Link href="/">Start a new session</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
