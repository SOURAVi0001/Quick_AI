import { useState } from 'react';
import { PricingTable } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything you need to test-drive the suite.',
    features: [
      'All 7 career tools',
      '10 generations / month',
      'Resume review & score',
      'History for 7 days',
    ],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Premium',
    price: '$12',
    cadence: '/ month',
    blurb: 'For active job seekers who want unlimited runway.',
    features: [
      'Unlimited generations',
      'Resume tailoring per job post',
      'Interview coach sessions',
      'Recruiter outreach drafts',
      'Full creation history',
    ],
    cta: 'Upgrade to Premium',
    featured: true,
  },
  {
    name: 'Teams',
    price: 'Custom',
    cadence: 'per seat',
    blurb: 'Career services, bootcamps and hiring pods.',
    features: ['Shared workspace', 'Seat management', 'Priority processing', 'Onboarding support'],
    cta: 'Talk to us',
    featured: false,
  },
];

const Plan = () => {
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);

  const handleCta = (tier) => {
    if (tier.name === 'Free') return navigate('/ai');
    setShowCheckout(true);
  };

  return (
    <section id="pricing" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mb-16 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7 animate-reveal">
            <span className="text-eyebrow text-primary">No risk, all reward</span>
            <h2 className="text-h1 mt-3 text-foreground">
              Start free, <span className="display-accent">scale</span> when you are ready
            </h2>
          </div>
          <p className="lg:col-span-5 text-base leading-relaxed text-muted-foreground animate-reveal [animation-delay:80ms]">
            Every plan includes the full set of tools. Upgrade only when your ambition outgrows the
            free tier.
          </p>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Card
              key={tier.name}
              variant={tier.featured ? 'result' : 'panel'}
              className={`animate-reveal flex flex-col overflow-hidden p-7 sm:p-8 ${
                tier.featured ? 'lg:-mt-4 lg:mb-[-1rem] shadow-glow' : ''
              }`}
              style={{ animationDelay: `${140 + i * 80}ms` }}
            >
              {tier.featured && (
                <div className="absolute inset-x-0 top-0 h-px hairline-glow" aria-hidden="true" />
              )}

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-h2 text-foreground">{tier.name}</h3>
                {tier.featured && (
                  <Badge variant="primary">
                    <Sparkles className="size-3" />
                    Most popular
                  </Badge>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-numeral text-5xl text-foreground">{tier.price}</span>
                <span className="text-sm text-subtle-foreground">{tier.cadence}</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tier.blurb}</p>

              <ul className="mt-7 flex flex-1 flex-col gap-3 border-t border-border pt-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        tier.featured ? 'text-primary' : 'text-subtle-foreground'
                      }`}
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCta(tier)}
                variant={tier.featured ? 'default' : 'outline'}
                size="lg"
                className="mt-8 w-full"
              >
                {tier.cta}
                <ArrowRight />
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          {!showCheckout ? (
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              className="focus-ring text-sm text-subtle-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Compare official plans &amp; checkout
            </button>
          ) : (
            <div className="mx-auto mt-4 max-w-2xl animate-reveal text-left">
              <PricingTable />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Plan;
