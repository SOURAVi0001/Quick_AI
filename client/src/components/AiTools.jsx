import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';

const AiTools = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <section className="relative py-32 bg-background dot-grid bg-noise overflow-hidden">
      <div className="absolute inset-0 bg-mesh pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-glow pointer-events-none opacity-50" />
      
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="text-center max-w-2xl mx-auto mb-20 relative">
          <span className="inline-block py-1.5 px-4 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-semibold text-foreground/80 tracking-widest uppercase mb-6 backdrop-blur-sm">
            Everything you need
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent pb-2">
            Your AI creative suite
          </h2>
          <div className="mx-auto mt-6 w-16 h-1 bg-gradient-to-r from-foreground/5 via-foreground/20 to-foreground/5 rounded-full" />
          <p className="mt-6 text-muted-foreground leading-relaxed max-w-lg mx-auto text-lg">
            Six tools, one mission: turn your ideas into reality. Write, design, edit &mdash; all
            powered by AI.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {AiToolsData.map((tool, index) => (
            <Card
              key={index}
              className="group relative cursor-pointer overflow-hidden bg-background/50 backdrop-blur-xl border-border/40 hover:border-foreground/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-2xl"
              onClick={() => user && navigate(tool.path)}
            >
              {/* Subtle animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative z-10 p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-out">
                  <tool.Icon className="w-6 h-6 text-background" strokeWidth={2.5} />
                </div>
                <CardTitle className="text-xl font-semibold tracking-tight text-foreground mb-3">{tool.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed text-muted-foreground/80">
                  {tool.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AiTools;
