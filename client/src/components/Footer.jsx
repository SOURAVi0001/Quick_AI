import { Button } from './ui/button';
import { Input } from './ui/input';

const footerLinks = [
  { heading: 'Company', links: ['Home', 'About us', 'Contact us', 'Privacy policy'] },
];

export default function Footer() {
  return (
    <footer className="px-6 md:px-16 lg:px-24 xl:px-32 pt-8 w-full text-muted-foreground mt-20 border-t">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 pb-6">
        <div className="md:max-w-96">
          <span className="text-lg font-semibold tracking-tight text-foreground">QuickAI</span>
          <p className="mt-4 text-sm">
            Experience the power of AI with QuickAI. Transform your content creation with our suite
            of premium AI tools.
          </p>
        </div>
        <div className="flex-1 flex items-start md:justify-end gap-20">
          {footerLinks.map((section) => (
            <div key={section.heading}>
              <h2 className="font-semibold mb-4 text-foreground text-sm">{section.heading}</h2>
              <ul className="text-sm space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="font-semibold text-foreground mb-4 text-sm">Subscribe</h2>
            <div className="text-sm space-y-2">
              <p>The latest news and resources, sent to your inbox weekly.</p>
              <div className="flex items-center gap-2 pt-2">
                <Input type="email" placeholder="Enter your email" className="max-w-56" />
                <Button variant="outline" size="sm">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="pt-4 pb-5 text-center text-xs border-t text-muted-foreground/60">
        Copyright 2025 &copy; QuickAI. All rights reserved.
      </p>
    </footer>
  );
}
