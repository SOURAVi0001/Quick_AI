import { FileText, Sparkles, Send } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Bring your material',
    description:
      'Paste your resume, a job description, or a LinkedIn profile. No formatting rules, no setup.',
    Icon: FileText,
  },
  {
    step: '02',
    title: 'Let the AI do the work',
    description:
      'Reviews, rewrites, scores, and practice questions — each tool is tuned for one job, so the output is specific rather than generic.',
    Icon: Sparkles,
  },
  {
    step: '03',
    title: 'Copy it and apply',
    description:
      'Every result is editable and one click from your clipboard, with your full history saved in the dashboard.',
    Icon: Send,
  },
];

const FeatureShowcase = () => {
  return (
    <section id="platform" className="relative border-y border-border bg-surface-1 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mx-auto mb-20 max-w-2xl text-center animate-reveal">
          <span className="text-eyebrow text-primary">The platform</span>
          <h2 className="text-h1 mt-3 text-foreground">
            From raw material to <span className="display-accent">sent application</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            One workspace for the whole job search — writing, tailoring, and practising, without
            switching tabs.
          </p>
        </div>

        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden="true"
            className="hairline-glow absolute left-0 right-0 top-6 hidden h-px md:block"
          />
          {steps.map(({ step, title, description, Icon }, i) => (
            <li
              key={step}
              className="relative animate-reveal"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-4 md:block">
                <span className="font-numeral relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-primary">
                  {step}
                </span>
                <span className="flex size-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary md:mt-6">
                  <Icon className="size-5" strokeWidth={2} />
                </span>
              </div>
              <h3 className="text-h2 mt-5 text-foreground">{title}</h3>
              <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default FeatureShowcase;
