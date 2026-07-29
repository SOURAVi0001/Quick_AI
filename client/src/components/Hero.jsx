import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 sm:px-20 xl:px-32 relative inline-flex flex-col w-full justify-center min-h-[calc(100vh-80px)]">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-5xl md:text-6xl 2xl:text-7xl font-semibold mx-auto leading-[1.2] tracking-tight">
          Create amazing content <br /> with <span className="text-foreground">AI tools</span>
        </h1>
        <p className="mt-4 max-w-xs sm:max-w-lg 2xl:max-w-xl m-auto max-sm:text-xs text-muted-foreground">
          Transform your content creation with our suite of premium AI tools. Write articles,
          generate images, and enhance your workflow.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm max-sm:text-xs">
        <Button onClick={() => navigate('/ai')} size="lg">
          Start creating now
        </Button>
        <Button variant="outline" size="lg">
          Watch demo
        </Button>
      </div>
    </div>
  );
};

export default Hero;
