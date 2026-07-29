import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { Button } from './ui/button';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  return (
    <div className="fixed top-0 left-0 w-full z-50 backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32 border-b bg-background/80">
      <span
        onClick={() => navigate('/')}
        className="text-xl font-semibold tracking-tight cursor-pointer"
      >
        QuickAI
      </span>
      {user ? (
        <UserButton />
      ) : (
        <Button onClick={openSignIn} className="rounded-full">
          Get started
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default Navbar;
