import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from './ui/button';
import Logo from './Logo';

const NAV_LINKS = [
  { label: 'Tools', href: '#tools' },
  { label: 'Platform', href: '#platform' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Pricing', href: '#pricing' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleNavigateHome = () => {
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-border bg-surface-1/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <button
          onClick={handleNavigateHome}
          className="focus-ring rounded-sm"
          aria-label="QuickAI home"
        >
          <Logo />
        </button>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="focus-ring rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <UserButton />
          ) : (
            <Button onClick={openSignIn} size="sm" className="rounded-full px-5">
              Get started
              <ArrowRight />
            </Button>
          )}
        </div>

        <button
          type="button"
          className="focus-ring inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 top-[65px] z-40 bg-background/70 md:hidden"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="relative z-50 flex flex-col gap-1 border-t border-border bg-surface-1 px-6 py-4 md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 border-t border-border pt-3">
              {user ? (
                <UserButton />
              ) : (
                <Button
                  onClick={() => {
                    setOpen(false);
                    openSignIn();
                  }}
                  className="w-full rounded-full"
                >
                  Get started
                  <ArrowRight />
                </Button>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
};

export default Navbar;
