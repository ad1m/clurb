import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Sparkles, StickyNote, BarChart3, Brain, Upload } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Clurb</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-20">
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Your personal AI reading library
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance max-w-4xl mx-auto mb-6">
            Netflix for your <span className="text-primary">reading life</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty">
            Upload PDFs and documents. Your AI agent tracks everything you read, answers questions about your library,
            and helps you understand any passage — all in one beautiful space.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2">
                Build Your Library
                <BookOpen className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Upload className="w-6 h-6" />}
              title="Upload Any Document"
              description="Add PDFs to your personal library. Auto-generated covers and organized shelves make it beautiful."
            />
            <FeatureCard
              icon={<StickyNote className="w-6 h-6" />}
              title="Sticky Notes"
              description="Leave notes on any page as you read. Thoughts, questions, summaries — all pinned right where you need them."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Highlight Assistant"
              description="Highlight any passage and instantly ask AI to explain, summarize, or go deeper. Context-aware answers every time."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="AI Reading Agent"
              description="Ask natural language questions about your entire library. What have I been reading? Summarize chapter 3."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Reading Analytics"
              description="Track your progress across every book. See your reading history, streaks, and how far you've come."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Beautiful Library View"
              description="All your documents in one organized, visual space. Pick up right where you left off — every time."
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-primary/5 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              Start building your reading library
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Upload your first document and let your AI agent start learning your reading habits.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg">Create Your Account</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Clurb &copy; 2026</span>
          </div>
          <p className="text-sm text-muted-foreground">Your personal AI reading library</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
