import Link from "next/link"
import { Button } from "@/components/ui/button"

const steps = [
  {
    number: "01",
    title: "Create a session",
    description:
      "The host adds participant names and all the tasks that need to be distributed.",
  },
  {
    number: "02",
    title: "Everyone votes",
    description:
      "Each participant distributes their coins across tasks to signal preferences — more coins means higher interest.",
  },
  {
    number: "03",
    title: "Fair distribution",
    description:
      "The algorithm maximises collective satisfaction and assigns every task to exactly one person.",
  },
]

const features = [
  {
    title: "Fair by design",
    description:
      "The assignment algorithm maximises total satisfaction across the whole group — nobody gets stuck with tasks they dislike.",
  },
  {
    title: "Coin-weighted preferences",
    description:
      "10 coins per person means limited votes that carry real weight. Spreading thin signals mild interest; stacking coins signals strong preference.",
  },
  {
    title: "Fewer tasks option",
    description:
      "Participants can signal they prefer a lighter workload. The algorithm accounts for capacity preferences alongside task preferences.",
  },
  {
    title: "Real-time voting",
    description:
      "Everyone votes independently via a shareable link. The host monitors progress live and results appear the moment the last vote lands.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-border/50 backdrop-blur-md bg-background/70">
        <span className="font-semibold tracking-tight text-foreground">
          Task<span className="text-primary">Allocator</span>
        </span>
        <Button asChild size="sm">
          <Link href="/create">Start a Session</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-16">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className="w-[700px] h-[500px] rounded-full blur-[140px]"
            style={{ background: "oklch(0.78 0.17 75 / 0.12)" }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto space-y-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium"
            style={{
              borderColor: "oklch(0.78 0.17 75 / 0.4)",
              color: "oklch(0.78 0.17 75)",
              background: "oklch(0.78 0.17 75 / 0.08)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.78 0.17 75)" }}
            />
            Preference-based task allocation
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Fairly distribute tasks,
            <br />
            <span className="text-primary">the smart way.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Give everyone 10 coins to vote on task preferences. Our algorithm finds the
            fairest assignment so nobody gets stuck with work they hate.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button asChild size="lg" className="text-base px-8 h-12">
              <Link href="/create">Start a Session →</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base px-8 h-12">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-widest">
              Process
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative group">
                <div
                  className="rounded-2xl border p-8 h-full transition-colors"
                  style={{ borderColor: "oklch(0.22 0 0)", background: "oklch(0.13 0 0)" }}
                >
                  <p
                    className="text-4xl font-black mb-4 tabular-nums"
                    style={{ color: "oklch(0.78 0.17 75 / 0.25)" }}
                  >
                    {step.number}
                  </p>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-28 px-6" style={{ background: "oklch(0.11 0 0)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-widest">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Built for fairness</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border p-8 transition-colors hover:border-primary/30"
                style={{ borderColor: "oklch(0.22 0 0)", background: "oklch(0.13 0 0)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg mb-5"
                  style={{ background: "oklch(0.78 0.17 75 / 0.15)" }}
                />
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="w-[500px] h-[300px] rounded-full blur-[100px]"
            style={{ background: "oklch(0.78 0.17 75 / 0.08)" }}
          />
        </div>
        <div className="relative max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to allocate?</h2>
          <p className="text-muted-foreground">
            Create a free session in seconds. No account required.
          </p>
          <Button asChild size="lg" className="text-base px-10 h-12">
            <Link href="/create">Start a Session →</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          Task<span style={{ color: "oklch(0.78 0.17 75)" }}>Allocator</span> — fair
          distribution through coin-weighted voting
        </p>
      </footer>
    </div>
  )
}
