import { Outlet, useNavigate } from 'react-router-dom';
import FloatingNav from '../components/FloatingNav';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';
import AnimatedBackground from '../components/AnimatedBackground';
import { SignIn, useUser } from '@clerk/clerk-react';

const Layout = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <Spinner className="size-6" label="Loading workspace" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
        <AnimatedBackground stars={60} />
        <div className="relative w-full max-w-[26rem]">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo className="mb-6" />
            <h1 className="text-display-sm text-foreground">
              Welcome <span className="display-accent">back.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Pick up where you left off — resumes, outreach and interview prep.
            </p>
          </div>
          <SignIn />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="z-40 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-1/60 px-4 backdrop-blur-2xl sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="QuickAI home"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Logo size="sm" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <FloatingNav />
        <main className="relative flex-1 overflow-y-auto">
          <div className="relative mx-auto w-full max-w-7xl pl-[5.5rem] pr-4 py-10 sm:pl-[7rem] sm:pr-8 sm:py-12 lg:pr-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
