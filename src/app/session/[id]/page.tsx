"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Host Lobby</h1>
          <p className="text-muted-foreground mt-1">
            Share the link below and monitor voting progress.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label>Shareable link</Label>
            <div className="flex gap-2">
              <Input readOnly value={sessionUrl} className="font-mono text-sm" />
              <Button variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Participants
              <Badge variant="secondary">
                {votedCount} / {participants.length} voted
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">{p.name}</span>
                {p.has_voted ? (
                  <Badge variant="default" className="text-xs">
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
    </main>
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
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Who are you?</h1>
          <p className="text-muted-foreground mt-1">Select your name to start voting.</p>
        </div>
        <div className="space-y-3">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => !p.has_voted && onSelect(p)}
              disabled={p.has_voted}
              className={[
                "w-full text-left px-4 py-4 rounded-xl border transition-colors",
                p.has_voted
                  ? "opacity-40 cursor-not-allowed bg-muted border-border"
                  : "hover:bg-accent hover:border-primary cursor-pointer border-border",
              ].join(" ")}
            >
              <span className="font-medium">{p.name}</span>
              {p.has_voted && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Voted
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
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

      // Build vote rows — only for tasks where coins were actually placed
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

      // Mark participant as voted
      const { error: updateError } = await supabase
        .from("participants")
        .update({ has_voted: true })
        .eq("id", participant.id)
      if (updateError) throw updateError

      // Check if all participants have now voted
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
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium flex-1 pr-4">{label}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => decrement(id)}
            disabled={coins[id] === 0}
          >
            −
          </Button>
          <span className="w-6 text-center font-semibold tabular-nums">{coins[id]}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
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
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi, {participant.name}!</h1>
          <p className="text-muted-foreground mt-1">
            Distribute your {totalCoins} coins to express task preferences.
          </p>
        </div>

        <Card className={remaining === 0 ? "border-green-500" : ""}>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Coins remaining</span>
            <Badge
              variant={remaining === 0 ? "default" : "secondary"}
              className="text-lg px-3 py-1"
            >
              {remaining} / {totalCoins}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">
            {tasks.map((task) => (
              <CoinRow key={task.id} id={task.id} label={task.title} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Capacity Preference</CardTitle>
          </CardHeader>
          <CardContent>
            <CoinRow
              id={FEWER_TASKS_ID}
              label="Fewer Tasks (Capacity Bonus) — signal you prefer a lighter load"
            />
          </CardContent>
        </Card>

        <Separator />

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={remaining !== 0 || submitting}
          className="w-full"
          size="lg"
        >
          {submitting
            ? "Submitting…"
            : remaining === 0
            ? "Submit Vote"
            : `Place ${remaining} more coin${remaining !== 1 ? "s" : ""} to submit`}
        </Button>
      </div>
    </main>
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

        // Detect host
        const isHostDevice = localStorage.getItem(`host:${sessionId}`) === "true"
        if (isHostDevice) setIsHost(true)

        // Restore previously selected participant from localStorage
        const savedId = localStorage.getItem(`participant:${sessionId}`)

        const [
          { data: sessionData, error: sErr },
          { data: participantsData, error: pErr },
          { data: tasksData, error: tErr },
        ] = await Promise.all([
          supabase
            .from("sessions")
            .select("coins_per_participant")
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
      // Host returns to lobby after a brief confirmation
      setTimeout(() => {
        setSubmitted(false)
        setHostCastingVote(false)
        setSelectedParticipant(null)
      }, 1500)
    } else {
      // Participants redirect to results page
      setTimeout(() => router.push(`/session/${sessionId}/results`), 1500)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading session…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">✓</div>
          <h2 className="text-2xl font-bold">Vote submitted!</h2>
          <p className="text-muted-foreground">
            {isHost ? "Returning to lobby…" : "Redirecting to results…"}
          </p>
        </div>
      </main>
    )
  }

  // Host lobby: shown when host hasn't clicked "Cast Your Vote" yet
  if (isHost && !hostCastingVote) {
    return (
      <HostLobby
        sessionId={sessionId}
        initialParticipants={participants}
        onCastVote={() => setHostCastingVote(true)}
      />
    )
  }

  // Participant selector (also used by host after clicking "Cast Your Vote")
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
