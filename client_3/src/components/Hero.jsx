import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';

const PROOF_POINTS = [
  '7 career tools in one place',
  'No credit card to start',
  'Results in seconds',
];

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[min(90vh,46rem)] items-center overflow-hidden bg-background pt-28 pb-24">
      <AnimatedBackground variant="page" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 sm:px-10 lg:grid-cols-12 lg:items-end lg:gap-6">
        <div className="lg:col-span-8">
          <div className="animate-reveal inline-flex items-center gap-2 rounded-full border border-border bg-surface-1/70 px-4 py-1.5 text-eyebrow text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Built for the job search
          </div>

          <h1 className="text-display mt-8 max-w-4xl text-balance text-foreground animate-reveal [animation-delay:80ms]">
            Stop guessing.
            <br />
            Start getting <span className="display-accent">interviews.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg animate-reveal [animation-delay:160ms]">
            Tailor your resume, sharpen your LinkedIn, write outreach that gets replies, and
            practise interviews — all in one AI workspace.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-reveal [animation-delay:240ms]">
            <Button onClick={() => navigate('/ai')} size="lg" className="px-8">
              Create for free
              <ArrowRight />
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#tools">
                See what's possible
                <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-4 lg:pb-2">
          <ul className="animate-reveal [animation-delay:320ms] flex flex-col gap-4 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            {PROOF_POINTS.map((point, i) => (
              <li key={point} className="flex items-baseline gap-3 text-sm text-subtle-foreground">
                <span className="font-numeral text-xs text-primary">0{i + 1}</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Hero;
