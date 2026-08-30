import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArticleIcon,
  HashIcon,
  ImageIcon,
  BackgroundIcon,
  EraserIcon,
  ResumeIcon,
} from './FeatureIcons';

gsap.registerPlugin(ScrollTrigger);

const accentGradient = 'from-[#dc2626] to-[#f97316]';

const features = [
  {
    id: 'email',
    title: 'AI Email Writer',
    subtitle: 'From a rough idea to a polished email in seconds.',
    description:
      'Pick your topic and tone, and let the words flow. Professional, friendly, or urgent — the AI adapts to your voice.',
    Icon: ArticleIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">email.txt</div>
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="h-2.5 w-3/4 rounded-full bg-white/8" />
          <div className="h-2.5 w-full rounded-full bg-white/6" />
          <div className="h-2.5 w-5/6 rounded-full bg-white/6" />
          <div className="h-2.5 w-full rounded-full bg-white/6" />
          <div className="h-2.5 w-4/5 rounded-full bg-white/6" />
          <div className="h-2.5 w-2/3 rounded-full bg-white/6" />
          <div className="mt-4 h-20 rounded-lg border border-white/6 bg-white/[0.02] p-3">
            <div className="h-2 w-1/3 rounded bg-gradient-to-r from-red-500/30 to-orange-500/30 mb-2" />
            <div className="h-2 w-full rounded bg-white/6 mb-1.5" />
            <div className="h-2 w-4/5 rounded bg-white/6" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'titles',
    title: 'Blog Title Generator',
    subtitle: 'Stuck on a headline? We have dozens ready.',
    description:
      'Drop in a keyword and your category, and get a batch of click-worthy titles in seconds.',
    Icon: HashIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">headlines</div>
        </div>
        <div className="flex-1 space-y-2">
          {[
            'The Future of AI in the Workplace',
            '10 Ways to Boost Your Productivity',
            'Why Remote Work Is Here to Stay',
            'A Beginner Guide to Machine Learning',
          ].map((title, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"
            >
              <div className="w-1 h-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
              <span className="text-[11px] text-white/40 truncate">{title}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'image',
    title: 'AI Image Generation',
    subtitle: 'Describe it. Watch it appear.',
    description:
      'Thumbnails, social posts, mood boards — describe what you see in your head and the AI brings it to life.',
    Icon: ImageIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">generator</div>
        </div>
        <div className="flex-1 rounded-xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border border-white/[0.06] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-white/[0.08]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 opacity-60" />
            </div>
            <div className="h-2 w-24 mx-auto rounded bg-white/10" />
            <div className="h-2 w-16 mx-auto rounded bg-white/6 mt-2" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'bg',
    title: 'Background Removal',
    subtitle: 'Clean cutouts in a single click.',
    description:
      'No Photoshop. No lasso tool. Just upload and get a professional cutout instantly.',
    Icon: BackgroundIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">remove-bg</div>
        </div>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-full rounded-xl bg-gradient-to-br from-red-500/5 to-transparent border border-white/[0.06] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:8px_8px]" />
            <div className="w-10 h-14 rounded-lg bg-white/10 relative z-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-[10px] text-white/20 font-mono">done</div>
          </div>
          <div className="flex-1 h-full rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-white/[0.06] flex items-center justify-center">
            <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-white/10" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'object',
    title: 'Object Removal',
    subtitle: 'Unwanted photobomber? Make it vanish.',
    description:
      'Tell the AI what to remove and watch it disappear. Cluttered backgrounds, stray objects — gone.',
    Icon: EraserIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">eraser</div>
        </div>
        <div className="flex-1 rounded-xl bg-gradient-to-br from-red-500/5 to-transparent border border-white/[0.06] relative overflow-hidden flex items-center justify-center">
          <div className="w-24 h-16 rounded-lg bg-white/8 relative">
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/40 border-2 border-red-500/60 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.04]">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
            <div className="text-[10px] text-white/30">Select object to remove</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'resume',
    title: 'Resume Reviewer',
    subtitle: 'Land more interviews with AI-powered feedback.',
    description:
      'Get blunt, actionable insights on your resume before you hit send. Optimized for any role.',
    Icon: ResumeIcon,
    visual: (
      <div className="w-full h-full flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-auto text-[10px] text-white/20 font-mono">review</div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
              <span className="text-[10px] text-white/30 font-medium">Score: 82/100</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500/60" />
                <span className="text-[10px] text-white/30">Add quantifiable results</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-orange-500/60" />
                <span className="text-[10px] text-white/30">Strengthen summary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-500/60" />
                <span className="text-[10px] text-white/30">Great experience section</span>
              </div>
            </div>
          </div>
          <div className="h-10 rounded-lg border border-white/[0.04] bg-white/[0.02] flex items-center px-3">
            <div className="h-2 w-20 rounded bg-gradient-to-r from-red-500/30 to-orange-500/30" />
          </div>
        </div>
      </div>
    ),
  },
];

const FeatureShowcase = () => {
  const sectionRef = useRef(null);
  const pinnedRef = useRef(null);
  const textRefs = useRef([]);
  const screenRefs = useRef([]);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const section = sectionRef.current;
    const textEls = textRefs.current;
    const screenEls = screenRefs.current;
    const total = features.length;

    const st = ScrollTrigger.create({
      trigger: section,
      pin: pinnedRef.current,
      start: 'top top',
      end: `+=${total * 500}vh`,
      scrub: 1.8,
      onUpdate: (self) => {
        const p = self.progress;
        const idx = Math.min(Math.floor(p * total), total - 1);
        setActiveDot(idx);

        const slot = 1 / total;

        textEls.forEach((el) => {
          gsap.set(el, { opacity: 0, y: 24 });
        });
        screenEls.forEach((el) => {
          gsap.set(el, { opacity: 0, y: 24, scale: 0.93 });
        });

        const localP = (p - idx * slot) / slot;
        let progress;
        if (localP < 0) progress = 0;
        else if (localP < 0.12) progress = localP / 0.12;
        else if (localP < 0.88) progress = 1;
        else if (localP < 1) progress = (1 - localP) / 0.12;
        else progress = 0;

        if (textEls[idx]) gsap.set(textEls[idx], { opacity: progress, y: (1 - progress) * 24 });
        if (screenEls[idx])
          gsap.set(screenEls[idx], {
            opacity: progress,
            y: (1 - progress) * 24,
            scale: 0.93 + 0.07 * progress,
          });
      },
    });

    return () => {
      st.kill();
      lenis.destroy();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative">
      <style>{`
        @keyframes icon-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2.5px); }
        }
        @keyframes icon-glow {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.25); }
        }
        .icon-glow-effect { animation: icon-glow 2.5s ease-in-out infinite; }
        .icon-float { animation: icon-float 3s ease-in-out infinite; }
      `}</style>
      <div ref={pinnedRef} className="h-screen w-full overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(220,38,38,0.08),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(249,115,22,0.06),transparent)] pointer-events-none" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col">
          <div className="pt-8 sm:pt-12">
            <span className="text-[11px] font-medium text-white/25 tracking-[0.2em] uppercase">
              The platform
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1.5">
              Every tool you need to create.
            </h2>
          </div>

          <div className="flex-1 flex items-center justify-center -mt-12 sm:-mt-16">
            <div className="w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="relative h-[380px] sm:h-[460px]">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    ref={(el) => (textRefs.current[i] = el)}
                    className="absolute inset-0 flex flex-col justify-center"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="relative mb-6">
                      <div className="icon-glow-effect absolute -inset-3 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-md" />
                      <div
                        className={`icon-float relative w-12 h-12 rounded-xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-lg shadow-red-500/10`}
                      >
                        <feature.Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05] mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg sm:text-xl text-white/60 font-medium mb-3 leading-snug max-w-md">
                      {feature.subtitle}
                    </p>
                    <p className="text-sm sm:text-base text-white/35 leading-relaxed max-w-sm">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center">
                <div className="w-full max-w-md">
                  <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.07] shadow-2xl shadow-red-500/5 overflow-hidden backdrop-blur-xl">
                    <div
                      className="relative mx-auto overflow-hidden"
                      style={{ aspectRatio: '4/3' }}
                    >
                      {features.map((feature, i) => (
                        <div
                          key={i}
                          ref={(el) => (screenRefs.current[i] = el)}
                          className="absolute inset-0"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="h-full bg-[#0d0d0d]">{feature.visual}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pb-6 sm:pb-10 flex items-center justify-center gap-2.5">
            {features.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const st = ScrollTrigger.getAll().find((t) => t.trigger === sectionRef.current);
                  if (st) {
                    gsap.to(st, {
                      progress: (i + 0.5) / features.length,
                      duration: 0.8,
                      ease: 'power3.inOut',
                    });
                  }
                }}
                className={`rounded-full transition-all duration-500 ${
                  i === activeDot
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 w-7 h-2'
                    : 'bg-white/12 hover:bg-white/25 w-2 h-2'
                }`}
                aria-label={`Feature ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
