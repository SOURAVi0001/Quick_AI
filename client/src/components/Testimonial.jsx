import { assets } from '../assets/assets';
import { Card, CardContent } from './ui/card';

const testimonials = [
  {
    image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200',
    name: 'John Doe',
    title: 'Marketing Director, TechCorp',
    content:
      'QuickAI has revolutionized our content workflow. The quality of the articles is outstanding, and it saves us hours of work every week.',
    rating: 4,
  },
  {
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
    name: 'Jane Smith',
    title: 'Content Creator, TechCorp',
    content:
      'QuickAI has made our content creation process effortless. The AI tools have helped us produce high-quality content faster than ever before.',
    rating: 5,
  },
  {
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop',
    name: 'David Lee',
    title: 'Content Writer, TechCorp',
    content:
      'QuickAI has transformed our content creation process. The AI tools have helped us produce high-quality content faster than ever before.',
    rating: 4,
  },
];

const Testimonial = () => {
  return (
    <div className="px-4 sm:px-20 xl:px-32 py-24 bg-muted/50">
      <div className="text-center">
        <h2 className="text-foreground text-[42px] font-semibold tracking-tight">
          Loved by Creators
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Don&apos;t just take our word for it. Here&apos;s what our users are saying.
        </p>
      </div>
      <div className="flex flex-wrap mt-10 justify-center gap-6">
        {testimonials.map((testimonial, index) => (
          <Card
            key={index}
            className="max-w-xs hover:-translate-y-1 transition duration-300"
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
              <p className="text-muted-foreground text-sm leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t">
                <img
                  src={testimonial.image}
                  className="w-10 h-10 object-contain rounded-full"
                  alt=""
                />
                <div className="text-sm">
                  <h3 className="font-medium text-foreground">{testimonial.name}</h3>
                  <p className="text-muted-foreground text-xs">{testimonial.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Testimonial;
