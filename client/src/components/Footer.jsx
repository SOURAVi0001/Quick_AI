import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative bg-[hsl(0,0%,4%)] dot-grid-dark bg-noise-dark border-t border-white/5">
      <div className="absolute inset-0 bg-glow-dark pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-base font-semibold tracking-tight text-white/90">
                QuickAI
              </span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Making creators unstoppable, one AI tool at a time. Cut the busywork, keep the craft.
            </p>
          </div>
          <div className="md:col-span-1">
            <h3 className="font-medium text-sm text-white/70 mb-4">Company</h3>
            <ul className="space-y-2.5">
              {['Home', 'About us', 'Contact us', 'Privacy policy'].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-1">
            <h3 className="font-medium text-sm text-white/70 mb-4">Stay in the loop</h3>
            <p className="text-sm text-white/40 mb-4">
              Product updates, AI tips, and creator stories &mdash; no spam, ever.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                className="flex-1 bg-white/5 border-white/10 text-white/80 placeholder:text-white/30"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-white/20">
          &copy; 2025 QuickAI. Create without limits.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
