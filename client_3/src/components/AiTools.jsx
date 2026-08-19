import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowUpRight } from 'lucide-react';

const AiTools = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <section id="tools" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mb-16 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7 animate-reveal">
            <span className="text-eyebrow text-primary">Everything you need</span>
            <h2 className="text-h1 mt-3 text-foreground">
              Your AI career <span className="display-accent">suite</span>
            </h2>
          </div>
          <p className="lg:col-span-5 text-base leading-relaxed text-muted-foreground animate-reveal [animation-delay:80ms]">
            Seven focused tools, one mission: get you hired faster. Write, tailor, practise — all
            powered by AI.
          </p>
        </div>

        <ol className="divide-y divide-border border-y border-border">
          {AiToolsData.map((tool, index) => (
            <li
              key={tool.title}
              className="animate-reveal"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => user && navigate(tool.path)}
                className="tactile focus-ring group flex w-full flex-col gap-4 py-7 text-left sm:flex-row sm:items-center sm:gap-8"
              >
                <span className="font-numeral text-3xl text-subtle-foreground/60 sm:w-16 sm:shrink-0 sm:text-4xl">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition-transform duration-250 group-hover:scale-105">
                  <tool.Icon className="size-5" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-h2 text-foreground">{tool.title}</h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                </div>

                <ArrowUpRight className="hidden size-5 shrink-0 text-subtle-foreground transition-all duration-250 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default AiTools;
