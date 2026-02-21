import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-border/50 backdrop-blur-md bg-background/70">
      <div className="flex items-center gap-5">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          Task<span className="text-primary">Allocator</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </Link>
      </div>
      <Button asChild size="sm">
        <Link href="/create">Start a Session</Link>
      </Button>
    </header>
  )
}
