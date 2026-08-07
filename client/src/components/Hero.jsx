import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[hsl(0,0%,4%)] dot-grid-dark bg-noise-dark">
      <div className="absolute inset-0 bg-glow-dark pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 mb-10 backdrop-blur-sm">
          <Sparkles className="w-3 h-3" />
          Where ideas meet intelligence
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-balance text-white">
          Stop struggling.
          <br />
          Start creating
          <br />
          <span className="relative inline-block mt-2">
            with AI.
            <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-white/20 rounded-full" />
          </span>
        </h1>
        <p className="mt-8 max-w-2xl mx-auto text-base sm:text-lg text-white/50 leading-relaxed">
          From blog posts to brand visuals &mdash; generate, refine, and ship content
          <br className="hidden sm:block" />
          at the speed of inspiration. No learning curve. No limits.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          <Button
            onClick={() => navigate('/ai')}
            size="lg"
            className="h-12 px-8 text-base bg-white text-[hsl(0,0%,4%)] hover:bg-white/90 shadow-elevated"
          >
            Create for free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
};

export default Hero;
