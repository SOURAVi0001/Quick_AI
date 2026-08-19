import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Brain,
  Briefcase,
  FileText,
  House,
  Linkedin,
  LogOut,
  Send,
  SquarePen,
  UserRound,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Navigation source of truth (unchanged destinations / groups)
 * ------------------------------------------------------------------ */
export const navSections = [
  {
    label: 'Overview',
    items: [{ to: '/ai', label: 'Dashboard', Icon: House }],
  },
  {
    label: 'Documents',
    items: [
      { to: '/ai/review-resume', label: 'Review Resume', Icon: FileText },
      { to: '/ai/resume-tailor', label: 'Resume Tailor', Icon: Wand2 },
      { to: '/ai/career-score', label: 'Career Score', Icon: BarChart3 },
      { to: '/ai/job-tracker', label: 'Job Application Tracker', Icon: Briefcase },
    ],
  },
  {
    label: 'Outreach & practice',
    items: [
      { to: '/ai/write-email', label: 'Write Email', Icon: SquarePen },
      { to: '/ai/linkedin-optimizer', label: 'LinkedIn Optimizer', Icon: Linkedin },
      { to: '/ai/recruiter-outreach', label: 'Recruiter Outreach', Icon: Send },
      { to: '/ai/interview-coach', label: 'AI Interview Coach', Icon: Brain },
    ],
  },
];

const flatItems = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, group: section.label })),
);

const SOUND_KEY = 'quickai:nav-sound';

/* ---- dial geometry ------------------------------------------------ */
const STEP_DEG = 20; // angular distance between items
const RADIUS_X = 104; // horizontal ellipse radius (creates the curve)
const RADIUS_Y = 168; // vertical ellipse radius (spacing along the dial)
const VISIBLE = 4; // items rendered on each side of the focus

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const toRad = (deg) => (deg * Math.PI) / 180;

/* ------------------------------------------------------------------ *
 * Tick — tiny WebAudio click, created lazily after user interaction
 * ------------------------------------------------------------------ */
function useTick(enabled) {
  const ctxRef = useRef(null);
  const armed = useRef(false);

  useEffect(() => {
    const arm = () => {
      armed.current = true;
    };
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
    window.addEventListener('wheel', arm, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('wheel', arm);
    };
  }, []);

  return useCallback(() => {
    if (!enabled || !armed.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      /* audio is supplementary — never interrupt navigation */
    }
  }, [enabled]);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */

const FloatingNav = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduced = usePrefersReducedMotion();

  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false); // touch / keyboard expansion
  const expanded = hovered || pinned;

  const [sound, setSound] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  });
  const tick = useTick(sound && !reduced);

  /* route → index (single source of truth on navigation) */
  const routeIndex = useMemo(() => {
    const matches = flatItems
      .map((item, index) => ({
        index,
        len: item.to.length,
        match: pathname === item.to || pathname.startsWith(`${item.to}/`),
      }))
      .filter((m) => m.match)
      .sort((a, b) => b.len - a.len);
    return matches.length ? matches[0].index : 0;
  }, [pathname]);

  /* ---- dial state: continuous rotation offset + committed selection ---- */
  const [offset, setOffset] = useState(routeIndex); // float, drives geometry
  const offsetRef = useRef(routeIndex);
  const targetRef = useRef(routeIndex);
  const rafRef = useRef(0);
  const restTimer = useRef(0);
  const lastTick = useRef(routeIndex);
  const [activeIndex, setActiveIndex] = useState(routeIndex); // persistent selection

  const setOffsetValue = useCallback(
    (value) => {
      offsetRef.current = value;
      setOffset(value);
      const near = clamp(Math.round(value), 0, flatItems.length - 1);
      if (near !== lastTick.current) {
        lastTick.current = near;
        setActiveIndex(near);
        tick();
      }
    },
    [tick],
  );

  /* spring-ish animation toward the snap target */
  const animate = useCallback(() => {
    if (rafRef.current) return;
    const step = () => {
      const diff = targetRef.current - offsetRef.current;
      if (Math.abs(diff) < 0.001) {
        setOffsetValue(targetRef.current);
        rafRef.current = 0;
        return;
      }
      setOffsetValue(offsetRef.current + diff * (reduced ? 1 : 0.18));
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
  }, [reduced, setOffsetValue]);

  const glideTo = useCallback(
    (index) => {
      targetRef.current = clamp(index, 0, flatItems.length - 1);
      if (reduced) {
        setOffsetValue(targetRef.current);
        return;
      }
      animate();
    },
    [animate, reduced, setOffsetValue],
  );

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restTimer.current) clearTimeout(restTimer.current);
  }, []);

  /* external route change (links, back button, refresh) re-centers the dial */
  useEffect(() => {
    setActiveIndex(routeIndex);
    lastTick.current = routeIndex;
    glideTo(routeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeIndex]);

  const commit = useCallback(
    (index) => {
      const item = flatItems[index];
      if (!item) return;
      setActiveIndex(index);
      lastTick.current = index;
      glideTo(index);
      if (pathname !== item.to) navigate(item.to);
    },
    [glideTo, navigate, pathname],
  );

  /* rest detection: snap + commit the item the user stopped on */
  const scheduleRest = useCallback(() => {
    if (restTimer.current) clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => {
      const index = clamp(Math.round(offsetRef.current), 0, flatItems.length - 1);
      commit(index);
    }, 220);
  }, [commit]);

  /* ---- wheel: rotate the dial, contained to the nav ---- */
  const navRef = useRef(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) / 120;
      setOffsetValue(clamp(offsetRef.current + delta * 0.7, 0, flatItems.length - 1));
      scheduleRest();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scheduleRest, setOffsetValue]);

  /* ---- touch: vertical swipe rotates the dial ---- */
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return;
    drag.current = { y: e.clientY, start: offsetRef.current };
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY;
    setOffsetValue(clamp(drag.current.start + dy / 64, 0, flatItems.length - 1));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    scheduleRest();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(clamp(Math.round(offsetRef.current) + (e.key === 'ArrowDown' ? 1 : -1), 0, flatItems.length - 1));
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(clamp(Math.round(offsetRef.current), 0, flatItems.length - 1));
    }
  };

  const toggleSound = () => {
    setSound((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  /* ---- elliptical placement --------------------------------------- */
  const geometry = (index) => {
    const d = index - offset; // continuous distance from the focus zone
    const angle = toRad(d * STEP_DEG);
    const x = RADIUS_X * Math.cos(angle); // convex arc: focus bulges right, edges pull back
    const y = RADIUS_Y * Math.sin(angle);
    const dist = Math.abs(d);
    const scale = clamp(1 - dist * 0.075, 0.78, 1);
    const opacity = clamp(1 - dist * 0.22, 0.28, 1);
    return { x, y, scale, opacity, dist, hidden: dist > VISIBLE + 0.5 };
  };

  const focusedIndex = clamp(Math.round(offset), 0, flatItems.length - 1);

  return (
    <>
      {/* invisible cursor activation zone at the left edge (desktop) */}
      <div
        aria-hidden="true"
        onMouseEnter={() => setHovered(true)}
        className="fixed left-0 top-0 z-30 hidden h-full w-6 sm:block"
      />

      {/* click-outside collapse for touch */}
      {pinned && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-[2px] sm:hidden"
          onClick={() => setPinned(false)}
        />
      )}

      <nav
        ref={navRef}
        aria-label="QuickAI navigation dial"
        role="menu"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setPinned(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPinned(false);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'fixed left-3 top-1/2 z-40 flex h-[min(40rem,88svh)] -translate-y-1/2 flex-col overflow-hidden touch-none',
          'rounded-l-[1.5rem] rounded-r-full border-y border-r border-border/40 backdrop-blur-2xl',
          'transition-[width,box-shadow] duration-500 ease-out sm:left-5',
          expanded ? 'w-[17rem]' : 'w-[4.5rem]',
        )}
      >
        {/* Profile */}
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          className={cn(
            'flex shrink-0 items-center gap-3 px-3.5 pb-3 pt-7 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            expanded ? 'w-[13rem]' : 'w-[4.5rem]',
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-sm font-medium text-primary-soft">
            {user?.firstName?.charAt(0) || <UserRound className="size-4" />}
          </span>
          <span
            className={cn(
              'min-w-0 transition-opacity duration-200',
              expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <span className="block truncate text-sm font-medium text-foreground">
              {user?.fullName || 'Signed in'}
            </span>
            <span className="text-meta block">Free plan</span>
          </span>
        </button>

        <span className="hairline-glow mx-3 h-px shrink-0" aria-hidden="true" />

        {/* Radial dial */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* dial arc guide */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
            viewBox="0 0 300 600"
            preserveAspectRatio="none"
          >
            <path
              d="M20 20 Q 285 300 20 580"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-accent/25"
              strokeDasharray="2 6"
            />
          </svg>




          {/* items placed on the ellipse */}
          <div className="absolute inset-0">
            {flatItems.map((item, index) => {
              const { x, y, scale, opacity, hidden } = geometry(index);
              const isFocused = index === focusedIndex;
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.to}
                  type="button"
                  role="menuitem"
                  onClick={() => commit(index)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  title={expanded ? undefined : item.label}
                  tabIndex={isFocused ? 0 : -1}
                  style={{
                    transform: `translate3d(${expanded ? x * 0.5 : x * 0.1}px, calc(-50% + ${y}px), 0) scale(${reduced ? 1 : scale})`,
                    opacity: hidden ? 0 : opacity,
                    pointerEvents: hidden ? 'none' : 'auto',
                    transitionProperty: 'opacity, background-color, border-color, box-shadow',
                  }}
                  className={cn(
                    'absolute left-2 top-1/2 flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left outline-none',
                    'origin-left will-change-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
                    'focus-visible:ring-2 focus-visible:ring-ring/60',
                    expanded ? 'w-[14.5rem]' : 'w-[3.25rem] justify-center',
                  )}

                >
                  <item.Icon
                    className={cn(
                      'size-[1.15rem] shrink-0 transition-colors',
                      isFocused ? 'text-accent' : 'text-subtle-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'truncate text-sm transition-opacity duration-200',
                      expanded ? 'opacity-100' : 'pointer-events-none absolute opacity-0',
                      isFocused ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        <span className="hairline-glow mx-3 h-px w-[3.5rem] shrink-0" aria-hidden="true" />

        {/* Footer controls */}
        <div
          className={cn(
            'flex shrink-0 flex-col items-start gap-1 p-2 pb-6',
            expanded ? 'w-[13rem]' : 'w-[4.5rem]',
          )}
        >
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? 'Turn navigation sound off' : 'Turn navigation sound on'}
            title={sound ? 'Navigation sound: on' : 'Navigation sound: off'}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-subtle-foreground outline-none transition-colors hover:bg-surface-2/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface-2/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <LogOut className="size-4 shrink-0" />
            <span className="truncate">Sign out</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default FloatingNav;
