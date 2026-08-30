import { assets } from '../assets/assets';
import { Card, CardContent } from './ui/card';

const testimonials = [
  {
    image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200',
    name: 'Marcus Chen',
    title: 'Founder, Pixel & Ink',
    content:
      'I used to spend 6 hours writing a single blog post. Now QuickAI does the heavy lifting in 20 minutes. It is like having a copywriter on staff 24/7.',
    rating: 5,
  },
  {
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
    name: 'Sophia Ramirez',
    title: 'Content Lead, GrowthLabs',
    content:
      'The image generation alone is worth it. We cut our design budget by 60% and our team can iterate on visuals in real time. Game-changer.',
    rating: 5,
  },
  {
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200',
    name: 'Alex Kim',
    title: 'Freelance Creator',
    content:
      'Finally, an AI tool that actually understands context. The article writer nails tone every time, and the object removal saves me hours of Photoshop work.',
    rating: 4,
  },
];

const Testimonial = () => {
  return (
    <section className="relative py-28 bg-[hsl(0,0%,4%)] dot-grid-dark bg-noise-dark overflow-hidden">
      <div className="absolute inset-0 bg-glow-dark pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-white/[0.015] blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-white/[0.015] blur-3xl" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-medium text-white/40 tracking-widest uppercase">
            Real people, real results
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-4">
            Trusted by creators like you
          </h2>
          <div className="mx-auto mt-4 w-12 h-0.5 bg-white/10 rounded-full" />
          <p className="mt-4 text-white/50 leading-relaxed max-w-lg mx-auto">
            Hundreds of creators, marketers, and founders use QuickAI daily. Here is what they have
            to say.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-white/[0.04] border-white/[0.06] backdrop-blur-sm hover:-translate-y-1.5 transition-all duration-300 hover:bg-white/[0.06]"
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-1 mb-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <img
                        key={i}
                        src={i < testimonial.rating ? assets.star_icon : assets.star_dull_icon}
                        className="w-4 h-4"
                        alt="star"
                      />
                    ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/10">
                  <img
                    src={testimonial.image}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                    alt=""
                  />
                  <div className="text-sm">
                    <h3 className="font-medium text-white/90">{testimonial.name}</h3>
                    <p className="text-white/40 text-xs">{testimonial.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
};

export default Testimonial;
