import { PricingTable } from '@clerk/clerk-react';

const Plan = () => {
  return (
    <section className="relative py-28 bg-background dot-grid bg-noise">
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-glow pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto px-6 sm:px-10">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            No risk, all reward
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-4">
            Start free, scale when you are ready
          </h2>
          <div className="mx-auto mt-4 w-12 h-0.5 bg-foreground/10 rounded-full" />
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every plan comes with a full set of tools. Upgrade only when your ambition outgrows
            the free tier.
          </p>
        </div>
        <div className="max-sm:mx-4">
          <PricingTable />
        </div>
      </div>
    </section>
  );
};

export default Plan;
