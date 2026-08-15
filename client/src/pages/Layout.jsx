import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { SignIn, useUser } from '@clerk/clerk-react';
import AnimatedBackground from '../components/AnimatedBackground';

const Layout = () => {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const { user } = useUser();

  return user ? (
    <div className="flex flex-col h-screen bg-background text-foreground relative z-0">
      <AnimatedBackground />
      <div className="w-full h-12 flex items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer group">
          <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.2em] uppercase group-hover:text-foreground transition-colors">
            QuickAI
          </span>
        </button>
        <div className="sm:hidden">
          {sidebar ? (
            <X onClick={() => setSidebar(false)} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          ) : (
            <Menu onClick={() => setSidebar(true)} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden z-10">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <main className="flex-1 overflow-y-auto bg-transparent relative">
          <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center min-h-screen bg-background relative z-0">
      <AnimatedBackground />
      <div className="z-10 relative">
        <SignIn />
      </div>
    </div>
  );
};

export default Layout;
