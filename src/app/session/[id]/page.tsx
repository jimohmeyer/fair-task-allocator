"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/Navbar"
import { getSupabase } from "@/lib/supabase"
import type { Participant, Task } from "@/lib/types"

const POLL_INTERVAL_MS = 3000

const FEWER_TASKS_ID = "__fewer_tasks__"

type CoinMap = Record<string, number>

function buildInitialCoins(tasks: Task[]): CoinMap {
  const map: CoinMap = {}
  tasks.forEach((t) => (map[t.id] = 0))
  map[FEWER_TASKS_ID] = 0
  return map
}

// ── Host Lobby ─────────────────────────────────────────────────────────────
function HostLobby({
  sessionId,
  initialParticipants,
  onCastVote,
}: {
  sessionId: string
  initialParticipants: Participant[]
  onCastVote: () => void
}) {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [allVoted, setAllVoted] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sessionUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/session/${sessionId}`

  function handleCopy() {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    async function poll() {
      const supabase = getSupabase()
      const [{ data: pData }, { data: sData }] = await Promise.all([
        supabase.from("participants").select("*").eq("session_id", sessionId).order("name"),
        supabase.from("sessions").select("all_voted").eq("id", sessionId).single(),
      ])
      if (pData) setParticipants(pData)
      if (sData?.all_voted) {
        setAllVoted(true)
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }

    poll()
    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [sessionId])

  const votedCount = participants.filter((p) => p.has_voted).length
  const progressPct =
    participants.length > 0 ? Math.round((votedCount / participants.length) * 100) : 0

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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-sm text-primary font-medium uppercase tracking-widest mb-1">
              Host Lobby
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Monitor voting progress</h1>
            <p className="text-muted-foreground mt-1">
              Share the link below and watch as participants submit their votes.
            </p>
          </div>

          {/* Two-column grid */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
            {/* Left — participant status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Participants
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className="tabular-nums"
                      style={
                        votedCount === participants.length && participants.length > 0
                          ? {
                              background: "oklch(0.78 0.17 75 / 0.15)",
                              color: "oklch(0.78 0.17 75)",
                              borderColor: "oklch(0.78 0.17 75 / 0.3)",
                            }
                          : {}
                      }
                    >
                      {votedCount} / {participants.length} voted
                    </Badge>
                  </div>
                </CardTitle>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-border/50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        progressPct === 100
                          ? "oklch(0.78 0.17 75)"
                          : "oklch(0.78 0.17 75 / 0.5)",
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    data-testid="participant-row"
                    className="flex items-center justify-between py-2 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: "oklch(0.78 0.17 75 / 0.15)",
                          color: "oklch(0.78 0.17 75)",
                        }}
                        aria-hidden="true"
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    {p.has_voted ? (
                      <Badge
                        className="text-xs"
                        style={{
                          background: "oklch(0.78 0.17 75 / 0.15)",
                          color: "oklch(0.78 0.17 75)",
                          borderColor: "oklch(0.78 0.17 75 / 0.3)",
                        }}
                      >
                        Voted
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Waiting
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right — share link + actions */}
            <div className="space-y-4 lg:sticky lg:top-24">
              {/* Glassmorphism share link card */}
              <div
                className="rounded-2xl border p-5 space-y-3 backdrop-blur-sm"
                style={{
                  borderColor: "oklch(0.78 0.17 75 / 0.25)",
                  background: "oklch(0.78 0.17 75 / 0.05)",
                }}
              >
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Shareable link
                </Label>
                <div className="flex gap-2">
                  <Input readOnly value={sessionUrl} className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                    style={
                      copied
                        ? { borderColor: "oklch(0.78 0.17 75 / 0.6)", color: "oklch(0.78 0.17 75)" }
                        : {}
                    }
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button onClick={onCastVote} variant="outline" className="w-full" size="lg">
                  Cast Your Vote →
                </Button>
                {allVoted && (
                  <Button
                    onClick={() => router.push(`/session/${sessionId}/results`)}
                    className="w-full"
                    size="lg"
                  >
                    View Results →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Participant Selector ───────────────────────────────────────────────────
function ParticipantSelector({
  participants,
  onSelect,
}: {
  participants: Participant[]
  onSelect: (p: Participant) => void
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Who are you?</h1>
            <p className="text-muted-foreground mt-1">Select your name to start voting.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {participants.map((p) => (
              <button
                key={p.id}
                onClick={() => !p.has_voted && onSelect(p)}
                disabled={p.has_voted}
                className={[
                  "w-full text-left px-5 py-5 rounded-2xl border transition-all duration-150",
                  p.has_voted
                    ? "opacity-40 cursor-not-allowed border-border bg-muted/30"
                    : "border-border bg-card hover:border-primary/50 cursor-pointer",
                ].join(" ")}
                style={
                  !p.has_voted
                    ? {
                        boxShadow: "0 0 0 0 transparent",
                      }
                    : {}
                }
                onMouseEnter={(e) => {
                  if (!p.has_voted) {
                    e.currentTarget.style.boxShadow = "0 0 20px oklch(0.78 0.17 75 / 0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 0 transparent"
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                    style={{
                      background: "oklch(0.78 0.17 75 / 0.15)",
                      color: "oklch(0.78 0.17 75)",
                    }}
                    aria-hidden="true"
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-base block">{p.name}</span>
                    {p.has_voted && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(0.78 0.17 75)" }}
                      >
                        Already voted
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Voting Interface ───────────────────────────────────────────────────────
function VotingInterface({
  participant,
  tasks,
  sessionId,
  totalCoins,
  onSubmitted,
}: {
  participant: Participant
  tasks: Task[]
  sessionId: string
  totalCoins: number
  onSubmitted: () => void
}) {
  const [coins, setCoins] = useState<CoinMap>(buildInitialCoins(tasks))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const spent = Object.values(coins).reduce((a, b) => a + b, 0)
  const remaining = totalCoins - spent
  const allPlaced = remaining === 0

  const submitLabel = submitting
    ? "Submitting…"
    : allPlaced
    ? "Submit Vote"
    : `Place ${remaining} more coin${remaining !== 1 ? "s" : ""} to submit`

  function increment(id: string) {
    if (remaining <= 0) return
    setCoins({ ...coins, [id]: coins[id] + 1 })
  }

  function decrement(id: string) {
    if (coins[id] <= 0) return
    setCoins({ ...coins, [id]: coins[id] - 1 })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = getSupabase()

      const voteRows = Object.entries(coins)
        .filter(([, coinCount]) => coinCount > 0)
        .map(([key, coinCount]) => ({
          session_id: sessionId,
          participant_id: participant.id,
          task_id: key === FEWER_TASKS_ID ? null : key,
          coins: coinCount,
        }))

      const { error: voteError } = await supabase.from("votes").insert(voteRows)
      if (voteError) throw voteError

      const { error: updateError } = await supabase
        .from("participants")
        .update({ has_voted: true })
        .eq("id", participant.id)
      if (updateError) throw updateError

      const { data: unvoted, error: checkError } = await supabase
        .from("participants")
        .select("id")
        .eq("session_id", sessionId)
        .eq("has_voted", false)
      if (checkError) throw checkError

      if (unvoted.length === 0) {
        await supabase
          .from("sessions")
          .update({ all_voted: true })
          .eq("id", sessionId)
      }

      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote")
    } finally {
      setSubmitting(false)
    }
  }

  function CoinRow({ id, label }: { id: string; label: string }) {
    return (
      <div className="flex items-center justify-between py-3 gap-4">
        <span className="text-sm font-medium flex-1">{label}</span>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-colors"
            style={
              coins[id] > 0
                ? {
                    borderColor: "oklch(0.78 0.17 75 / 0.5)",
                    color: "oklch(0.78 0.17 75)",
                  }
                : {}
            }
            onClick={() => decrement(id)}
            disabled={coins[id] === 0}
          >
            −
          </Button>
          <span
            className="w-6 text-center font-bold tabular-nums text-sm transition-colors"
            style={coins[id] > 0 ? { color: "oklch(0.78 0.17 75)" } : {}}
          >
            {coins[id]}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-colors"
            style={
              remaining > 0
                ? {
                    borderColor: "oklch(0.78 0.17 75 / 0.3)",
                  }
                : {}
            }
            onClick={() => increment(id)}
            disabled={remaining === 0}
          >
            +
          </Button>
        </div>
      </div>
    )
  }

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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Greeting header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hi, {participant.name}!</h1>
            <p className="text-muted-foreground mt-1">
              Distribute your {totalCoins} coins to express task preferences.
            </p>
          </div>

          {/* Mobile-only coin tracker */}
          <div
            className="lg:hidden rounded-2xl border p-4 flex items-center justify-between transition-all duration-300"
            style={
              allPlaced
                ? {
                    borderColor: "oklch(0.78 0.17 75 / 0.5)",
                    background: "oklch(0.78 0.17 75 / 0.06)",
                  }
                : { borderColor: "oklch(0.22 0 0)" }
            }
          >
            <span className="text-sm text-muted-foreground">Coins remaining</span>
            <span
              className="text-xl font-bold tabular-nums transition-colors"
              style={allPlaced ? { color: "oklch(0.78 0.17 75)" } : {}}
            >
              {remaining}
              <span className="text-sm font-normal text-muted-foreground"> / {totalCoins}</span>
            </span>
          </div>

          {/* Two-column layout on desktop */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left — tasks + fewer tasks + mobile actions */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Task votes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  {tasks.map((task) => (
                    <CoinRow key={task.id} id={task.id} label={task.title} />
                  ))}
                </CardContent>
              </Card>

              {/* Fewer tasks option */}
              <div
                className="rounded-2xl border border-dashed p-6"
                style={{ borderColor: "oklch(0.30 0 0)" }}
              >
                <p className="text-sm font-semibold mb-1">Capacity Preference</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Coins here signal you prefer a lighter workload.
                </p>
                <CoinRow id={FEWER_TASKS_ID} label="Fewer Tasks (Capacity Bonus)" />
              </div>

              {/* Mobile bottom actions */}
              <div className="lg:hidden space-y-4">
                <Separator />
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                    {error}
                  </p>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!allPlaced || submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitLabel}
                </Button>
              </div>
            </div>

            {/* Right — sticky sidebar (desktop only) */}
            <div className="hidden lg:flex flex-col w-64 shrink-0 sticky top-24 space-y-4">
              {/* Coin tracker widget */}
              <div
                className="rounded-2xl border p-5 transition-all duration-300"
                style={
                  allPlaced
                    ? {
                        borderColor: "oklch(0.78 0.17 75 / 0.5)",
                        background: "oklch(0.78 0.17 75 / 0.06)",
                      }
                    : { borderColor: "oklch(0.22 0 0)" }
                }
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                  Coins remaining
                </p>
                <div className="flex items-end gap-1">
                  <span
                    className="text-4xl font-bold tabular-nums transition-colors leading-none"
                    style={allPlaced ? { color: "oklch(0.78 0.17 75)" } : {}}
                  >
                    {remaining}
                  </span>
                  <span className="text-muted-foreground text-lg mb-0.5">/ {totalCoins}</span>
                </div>
                {allPlaced && (
                  <p
                    className="text-xs mt-2 font-medium"
                    style={{ color: "oklch(0.78 0.17 75)" }}
                  >
                    All coins placed ✓
                  </p>
                )}
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-border/50">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((spent / totalCoins) * 100)}%`,
                      background: allPlaced
                        ? "oklch(0.78 0.17 75)"
                        : "oklch(0.78 0.17 75 / 0.5)",
                    }}
                  />
                </div>
              </div>

              <Separator />

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!allPlaced || submitting}
                className="w-full"
                size="lg"
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [participants, setParticipants] = useState<Participant[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalCoins, setTotalCoins] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [hostCastingVote, setHostCastingVote] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabase()

        const isHostDevice = localStorage.getItem(`host:${sessionId}`) === "true"
        if (isHostDevice) setIsHost(true)

        const savedId = localStorage.getItem(`participant:${sessionId}`)

        const [
          { data: sessionData, error: sErr },
          { data: participantsData, error: pErr },
          { data: tasksData, error: tErr },
        ] = await Promise.all([
          supabase
            .from("sessions")
            .select("coins_per_participant, all_voted")
            .eq("id", sessionId)
            .single(),
          supabase
            .from("participants")
            .select("*")
            .eq("session_id", sessionId)
            .order("name"),
          supabase
            .from("tasks")
            .select("*")
            .eq("session_id", sessionId)
            .order("position"),
        ])

        if (sErr) throw sErr
        if (pErr) throw pErr
        if (tErr) throw tErr

        if (sessionData?.all_voted) {
          router.replace(`/session/${sessionId}/results`)
          return
        }

        setTotalCoins(sessionData?.coins_per_participant ?? 10)
        setParticipants(participantsData ?? [])
        setTasks(tasksData ?? [])

        if (savedId) {
          const saved = participantsData?.find((p) => p.id === savedId)
          if (saved) {
            if (saved.has_voted) {
              setSubmitted(true)
            } else {
              setSelectedParticipant(saved)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  function handleSelectParticipant(p: Participant) {
    localStorage.setItem(`participant:${sessionId}`, p.id)
    setSelectedParticipant(p)
  }

  function handleSubmitted() {
    setSubmitted(true)
    if (isHost) {
      setTimeout(() => {
        setSubmitted(false)
        setHostCastingVote(false)
        setSelectedParticipant(null)
      }, 1500)
    } else {
      setTimeout(() => router.push(`/session/${sessionId}/results`), 1500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "oklch(0.78 0.17 75)", borderTopColor: "transparent" }}
            />
            <p className="text-muted-foreground text-sm">Loading session…</p>
          </div>
        </main>
      </div>
    )
  }

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl mx-auto"
              style={{
                background: "oklch(0.78 0.17 75 / 0.15)",
                color: "oklch(0.78 0.17 75)",
              }}
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold">Vote submitted!</h2>
            <p className="text-muted-foreground">
              {isHost ? "Returning to lobby…" : "Redirecting to results…"}
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (isHost && !hostCastingVote) {
    return (
      <HostLobby
        sessionId={sessionId}
        initialParticipants={participants}
        onCastVote={() => setHostCastingVote(true)}
      />
    )
  }

  if (!selectedParticipant) {
    return (
      <ParticipantSelector
        participants={participants}
        onSelect={handleSelectParticipant}
      />
    )
  }

  return (
    <VotingInterface
      participant={selectedParticipant}
      tasks={tasks}
      sessionId={sessionId}
      totalCoins={totalCoins}
      onSubmitted={handleSubmitted}
    />
  )
}
