import { Button } from './ui/button';
import { Input } from './ui/input';
import Logo from './Logo';

const LINK_COLUMNS = [
  {
    title: 'Company',
    links: ['Home', 'About us', 'Contact us', 'Privacy policy'],
  },
];

const Footer = () => {
  return (
    <footer className="relative border-t border-border bg-surface-1">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo />
            <p className="text-h1 mt-8 max-w-md text-balance text-foreground">
              Making creators <span className="display-accent">unstoppable</span>, one AI tool at
              a time.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Cut the busywork, keep the craft.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
            {LINK_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-h3 text-foreground">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="focus-ring rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="sm:col-span-2 lg:col-span-2">
              <h3 className="text-h3 text-foreground">Stay in the loop</h3>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                Product updates, hiring insights, and interview tips — no spam, ever.
              </p>
              <form className="mt-4 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <Input id="footer-email" type="email" placeholder="you@example.com" className="flex-1" />
                <Button type="submit" variant="outline">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-6 text-meta sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} QuickAI. Apply with confidence.</span>
          <span>Built for the job search.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
