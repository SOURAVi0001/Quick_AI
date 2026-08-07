import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { SignIn, useUser } from '@clerk/clerk-react';

const Layout = () => {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const { user } = useUser();

  return user ? (
    <div className="flex flex-col h-screen bg-[#000]">
      <div className="w-full h-9 flex items-center justify-between px-4 border-b border-[#222] bg-[#000]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
          <span className="text-[11px] font-semibold text-[#666] tracking-[0.2em] uppercase">
            QuickAI
          </span>
        </button>
        <div className="sm:hidden">
          {sidebar ? (
            <X onClick={() => setSidebar(false)} className="w-4 h-4 text-[#555] cursor-pointer" />
          ) : (
            <Menu onClick={() => setSidebar(true)} className="w-4 h-4 text-[#555] cursor-pointer" />
          )}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <main className="flex-1 overflow-hidden bg-[#000]">
          <Outlet />
        </main>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center min-h-screen bg-[#000]">
      <SignIn />
    </div>
  );
};

export default Layout;
