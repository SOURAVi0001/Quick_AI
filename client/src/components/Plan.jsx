import { PricingTable } from '@clerk/clerk-react';

const Plan = () => {
  return (
    <div className="max-w-2xl mx-auto z-20 my-30 px-4">
      <div className="text-center">
        <h2 className="text-foreground text-[42px] font-semibold tracking-tight">Choose Your Plan</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start for free and scale up as you grow. Find the perfect plan for your content creation
          needs.
        </p>
      </div>

      <div className="mt-14 max-sm:mx-8">
        <PricingTable />
      </div>
    </div>
  );
};

export default Plan;
