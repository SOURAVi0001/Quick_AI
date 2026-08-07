import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from './ui/button';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-[hsl(0,0%,4%)]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6 sm:px-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <Sparkles className="w-5 h-5 text-white/80" />
          <span className="text-lg font-semibold tracking-tight text-white/90">QuickAI</span>
        </button>
        {user ? (
          <UserButton />
        ) : (
          <Button
            onClick={openSignIn}
            className="rounded-full h-9 px-5 text-sm bg-white text-[hsl(0,0%,4%)] hover:bg-white/90 shadow-subtle"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
