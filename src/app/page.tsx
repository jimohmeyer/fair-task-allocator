"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

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

// Slow, elegant spring — stiffness 40, damping 22
const spring = { type: "spring" as const, stiffness: 40, damping: 22 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const scrollVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay },
  }),
}

// New terracotta primary for inline styles
const terra = "oklch(0.50 0.11 48)"
const terraTint = (a: number) => `oklch(0.50 0.11 48 / ${a})`

// Warm card/border for inline styles (matches CSS vars)
const cardBg = "oklch(0.94 0.012 78)"
const sectionBg = "oklch(0.91 0.012 76)"
const borderCol = "oklch(0.86 0.014 76)"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-border/60 backdrop-blur-md bg-background/80">
        <span className="font-semibold tracking-tight text-foreground">
          Task<span className="text-primary">Allocator</span>
        </span>
        <Button asChild size="sm">
          <Link href="/create">Start a Session</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-16 overflow-hidden">
        {/* Aurora orbs — warm terracotta/amber on light bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px]"
            style={{ background: terraTint(0.22) }}
            animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px]"
            style={{ background: "oklch(0.65 0.12 75 / 0.16)" }}
            animate={{ x: [0, -50, 40, 0], y: [0, 50, -20, 0], scale: [1, 0.85, 1.15, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[120px]"
            style={{ background: "oklch(0.58 0.10 35 / 0.10)" }}
            animate={{ x: [0, 30, -60, 0], y: [0, -60, 20, 0], scale: [1, 1.3, 0.8, 1] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <motion.div
          className="relative max-w-4xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium font-sans"
            style={{
              borderColor: terraTint(0.35),
              color: terra,
              background: terraTint(0.07),
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: terra }} />
            Preference-based task allocation
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08]"
          >
            Fairly distribute tasks,
            <br />
            <span className="text-primary italic">the smart way.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-sans"
          >
            Give everyone 5, 10, or 15 coins to vote on task preferences. Our algorithm
            finds the fairest assignment so nobody gets stuck with work they hate.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Button asChild size="lg" className="text-base px-8 h-12">
                <Link href="/create">Start a Session →</Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Button asChild size="lg" variant="outline" className="text-base px-8 h-12">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6" style={{ background: sectionBg }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-widest font-sans">
              Process
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                custom={i * 0.12}
                variants={scrollVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div
                  className="rounded-2xl border p-8 h-full transition-colors hover:border-primary/30"
                  style={{ borderColor: borderCol, background: cardBg }}
                >
                  <p
                    className="text-4xl font-black mb-4 tabular-nums font-serif"
                    style={{ color: terraTint(0.30) }}
                  >
                    {step.number}
                  </p>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid — Features */}
      <section className="py-28 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-widest font-sans">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Built for fairness</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <motion.div
              custom={0}
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="md:col-span-2 rounded-2xl border p-8 transition-colors hover:border-primary/30 cursor-default"
              style={{ borderColor: borderCol, background: cardBg }}
            >
              <div
                className="w-10 h-10 rounded-xl mb-6 flex items-center justify-center text-xl"
                style={{ background: terraTint(0.12) }}
              >
                ⚖️
              </div>
              <h3 className="text-xl font-semibold mb-3">Fair by design</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md font-sans">
                The assignment algorithm maximises total satisfaction across the whole group
                — nobody gets stuck with tasks they dislike. Min-Cost Max-Flow ensures a
                globally optimal solution, not just a greedy one.
              </p>
            </motion.div>

            <motion.div
              custom={0.10}
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl border p-8 transition-colors hover:border-primary/30 cursor-default flex flex-col justify-between"
              style={{ borderColor: borderCol, background: cardBg }}
            >
              <div
                className="w-10 h-10 rounded-xl mb-6 flex items-center justify-center text-xl"
                style={{ background: terraTint(0.12) }}
              >
                🪙
              </div>
              <div>
                <p
                  className="text-5xl font-black tabular-nums mb-2 font-serif"
                  style={{ color: terra }}
                >
                  5–15
                </p>
                <h3 className="text-base font-semibold mb-1">Coins per person</h3>
                <p className="text-muted-foreground text-xs leading-relaxed font-sans">
                  Host picks 5, 10, or 15 — limited votes that carry real weight.
                </p>
              </div>
            </motion.div>

            {/* Row 2 */}
            <motion.div
              custom={0.20}
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl border p-8 transition-colors hover:border-primary/30 cursor-default"
              style={{ borderColor: borderCol, background: cardBg }}
            >
              <div
                className="w-10 h-10 rounded-xl mb-6 flex items-center justify-center text-xl"
                style={{ background: terraTint(0.12) }}
              >
                🎯
              </div>
              <h3 className="text-base font-semibold mb-2">Fewer tasks option</h3>
              <p className="text-muted-foreground text-xs leading-relaxed font-sans">
                Participants can signal they prefer a lighter workload. The algorithm
                accounts for capacity preferences alongside task preferences.
              </p>
            </motion.div>

            <motion.div
              custom={0.30}
              variants={scrollVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="md:col-span-2 rounded-2xl border p-8 transition-colors hover:border-primary/30 cursor-default"
              style={{ borderColor: borderCol, background: cardBg }}
            >
              <div
                className="w-10 h-10 rounded-xl mb-6 flex items-center justify-center text-xl"
                style={{ background: terraTint(0.12) }}
              >
                ⚡
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time voting</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md font-sans">
                Everyone votes independently via a shareable link. The host monitors
                progress live and results appear the moment the last vote lands. No
                account required — just share the link.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden" style={{ background: sectionBg }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="w-[500px] h-[300px] rounded-full blur-[120px]"
            style={{ background: terraTint(0.10) }}
          />
        </div>
        <div className="relative max-w-xl mx-auto space-y-6">
          <motion.h2
            className="text-3xl md:text-4xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring}
          >
            Ready to allocate?
          </motion.h2>
          <motion.p
            className="text-muted-foreground font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.14 }}
          >
            Create a free session in seconds. No account required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.28 }}
            whileHover={{ scale: 1.02 }}
          >
            <Button asChild size="lg" className="text-base px-10 h-12">
              <Link href="/create">Start a Session →</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-6 text-center bg-background">
        <p className="text-xs text-muted-foreground font-sans">
          Task<span style={{ color: terra }}>Allocator</span> — fair
          distribution through coin-weighted voting
        </p>
      </footer>
    </div>
  )
}
