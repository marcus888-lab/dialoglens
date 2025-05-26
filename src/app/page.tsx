import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full items-center justify-between text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to DialogLens</h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI-powered conversation transcription with speaker attribution
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/docs">Learn More</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}