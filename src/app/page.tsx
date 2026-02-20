"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { getSupabase } from "@/lib/supabase"

export default function HomePage() {
  const router = useRouter()
  const [hostName, setHostName] = useState("")
  const [coinsPerParticipant, setCoinsPerParticipant] = useState(10)
  const [participants, setParticipants] = useState<string[]>(["", ""])
  const [tasks, setTasks] = useState<string[]>(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addParticipant() {
    setParticipants([...participants, ""])
  }

  function removeParticipant(index: number) {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  function updateParticipant(index: number, value: string) {
    const updated = [...participants]
    updated[index] = value
    setParticipants(updated)
  }

  function addTask() {
    setTasks([...tasks, ""])
  }

  function removeTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  function updateTask(index: number, value: string) {
    const updated = [...tasks]
    updated[index] = value
    setTasks(updated)
  }

  async function handleCreate() {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const trimmedParticipants = participants.filter((p) => p.trim())
      const trimmedTasks = tasks.filter((t) => t.trim())

      // 1. Create session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({ host_name: hostName.trim(), coins_per_participant: coinsPerParticipant })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 2. Insert participants
      const { error: participantsError } = await supabase.from("participants").insert(
        trimmedParticipants.map((name) => ({ session_id: session.id, name }))
      )
      if (participantsError) throw participantsError

      // 3. Insert tasks
      const { error: tasksError } = await supabase.from("tasks").insert(
        trimmedTasks.map((title, position) => ({ session_id: session.id, title, position }))
      )
      if (tasksError) throw tasksError

      router.push(`/session/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isValid =
    hostName.trim() &&
    participants.filter((p) => p.trim()).length >= 2 &&
    tasks.filter((t) => t.trim()).length >= 1

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fair Task Allocator</h1>
          <p className="text-muted-foreground mt-1">
            Create a session and let your team vote on task preferences.
          </p>
        </div>

        {/* Host Name */}
        <Card>
          <CardHeader>
            <CardTitle>Your Name</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="host-name">Host name</Label>
              <Input
                id="host-name"
                placeholder="e.g. Alice"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coins */}
        <Card>
          <CardHeader>
            <CardTitle>Coins per Participant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Each participant gets</Label>
              <span className="text-2xl font-bold tabular-nums w-12 text-right">
                {coinsPerParticipant}
              </span>
            </div>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[coinsPerParticipant]}
              onValueChange={([v]) => setCoinsPerParticipant(v)}
            />
            <p className="text-xs text-muted-foreground">
              Drag to set how many coins each participant distributes across tasks (1–50).
            </p>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participants.map((name, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Participant ${i + 1}`}
                  value={name}
                  onChange={(e) => updateParticipant(i, e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeParticipant(i)}
                  disabled={participants.length <= 2}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addParticipant} className="w-full">
              + Add participant
            </Button>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((title, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Task ${i + 1}`}
                  value={title}
                  onChange={(e) => updateTask(i, e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeTask(i)}
                  disabled={tasks.length <= 1}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addTask} className="w-full">
              + Add task
            </Button>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button onClick={handleCreate} disabled={!isValid || loading} className="w-full" size="lg">
          {loading ? "Creating…" : "Create Session"}
        </Button>
      </div>
    </main>
  )
}
