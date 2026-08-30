import { Quote } from 'lucide-react';

const testimonials = [
  {
    image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200',
    name: 'Marcus Chen',
    title: 'Founder, Pixel & Ink',
    content:
      'I used to spend a whole evening tailoring one resume. QuickAI does it in ten minutes, and the bullets actually sound like me.',
  },
  {
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
    name: 'Sophia Ramirez',
    title: 'Product Marketer, GrowthLabs',
    content:
      'The LinkedIn optimizer rewrote my headline and about section, and recruiter replies went from rare to weekly.',
  },
  {
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200',
    name: 'Alex Kim',
    title: 'Freelance Creator',
    content:
      'The interview coach is brutally honest. Practising with it before onsites was the difference between rambling and landing the offer.',
  },
];

const Testimonial = () => {
  return (
    <section id="reviews" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mx-auto mb-16 max-w-2xl text-center animate-reveal">
          <span className="text-eyebrow text-primary">Real people, real results</span>
          <h2 className="text-h1 mt-3 text-foreground">
            Trusted by <span className="display-accent">job seekers</span> like you
          </h2>
        </div>

        <div className="grid gap-x-10 gap-y-14 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <figure
              key={testimonial.name}
              className="animate-reveal flex flex-col"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Quote className="size-7 text-primary/50" strokeWidth={1.5} />
              <blockquote
                className="text-h1 mt-5 flex-1 text-balance text-foreground"
                style={{ fontSize: 'clamp(1.35rem, 2vw, 1.65rem)' }}
              >
                &ldquo;{testimonial.content}&rdquo;
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                <img
                  src={testimonial.image}
                  className="size-10 rounded-full object-cover ring-1 ring-border"
                  alt={`Portrait of ${testimonial.name}`}
                />
                <div className="text-sm">
                  <div className="font-medium text-foreground">{testimonial.name}</div>
                  <div className="text-meta">{testimonial.title}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
