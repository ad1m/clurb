import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, MessageSquare, Sparkles, StickyNote, BarChart3 } from "lucide-react"

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
            The New Book Club
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance max-w-4xl mx-auto mb-6">
            Reading is better <span className="text-primary">together</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty">
            Share PDFs and documents with friends, leave surprise sticky notes for them to discover, and chat in
            real-time as you read. Powered by AI to track and analyze your reading journey.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2">
                Start Reading Together
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
              icon={<Users className="w-6 h-6" />}
              title="Share with Friends"
              description="Upload PDFs and invite friends to read along. See where everyone is in the document."
            />
            <FeatureCard
              icon={<StickyNote className="w-6 h-6" />}
              title="Surprise Sticky Notes"
              description="Leave hidden notes on any page for your friends to discover as they read."
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Real-time Chat"
              description="Discuss what you're reading with an in-document chat that stays with the book."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI-Powered Insights"
              description="Highlight any text and ask AI to explain, summarize, or even generate images."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Reading Analytics"
              description="Ask your AI agent about your reading habits, progress, and activity history."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Your Digital Library"
              description="All your documents in one beautiful, organized space with cover art."
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-primary/5 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Ready to transform how you read?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join Clurb today and start sharing your reading journey with friends.
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
          <p className="text-sm text-muted-foreground">The Social Reading App</p>
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
