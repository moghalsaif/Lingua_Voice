import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mic2, PlayCircle, Sparkles, AudioWaveform } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 md:py-32 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
          <Sparkles className="mr-2 h-4 w-4" />
          The future of language learning
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
          Learn a language with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">your own voice.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl text-balance">
          Clone your voice once. Practice with an AI tutor that responds in your own vocal identity. 
          Intimate, focused, and designed like a professional audio studio.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
            <Link href="/sign-up">Start Free Trial</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 border-t border-border/50 py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-2xl border border-border/50 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Mic2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Voice Cloning</h3>
            <p className="text-muted-foreground text-sm">Upload a short sample of your voice. Our AI creates a perfect digital twin for your practice sessions.</p>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border border-border/50 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <AudioWaveform className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Immersive Studio</h3>
            <p className="text-muted-foreground text-sm">Practice in a distraction-free, dark-mode environment designed to feel like a high-end recording studio.</p>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border border-border/50 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <PlayCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Feedback</h3>
            <p className="text-muted-foreground text-sm">Get real-time corrections, transcriptions, and suggested improvements after every sentence you speak.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
