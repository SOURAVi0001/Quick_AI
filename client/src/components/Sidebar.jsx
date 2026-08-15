import { useClerk, useUser } from '@clerk/clerk-react';
import {
  Eraser,
  FileText,
  Hash,
  House,
  Image,
  LogOut,
  Scissors,
  SquarePen,
  Users,
  Brain,
  Send,
  BarChart3,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/ai', label: 'Dashboard', Icon: House },
  { to: '/ai/write-email', label: 'Write Email', Icon: SquarePen },
  // { to: '/ai/blog-titles', label: 'Blog Titles', Icon: Hash },
  // { to: '/ai/generate-images', label: 'Generate Images', Icon: Image },
  // { to: '/ai/remove-background', label: 'Remove Background', Icon: Eraser },
  // { to: '/ai/remove-object', label: 'Remove Object', Icon: Scissors },
  { to: '/ai/review-resume', label: 'Review Resume', Icon: FileText },
  { to: '/ai/resume-tailor', label: 'Resume Tailor', Icon: FileText },
  { to: '/ai/linkedin-optimizer', label: 'LinkedIn Optimizer', Icon: SquarePen },
  { to: '/ai/interview-coach', label: 'AI Interview Coach', Icon: Brain },
  { to: '/ai/recruiter-outreach', label: 'Recruiter Outreach', Icon: Send },
  { to: '/ai/career-score', label: 'Career Score', Icon: BarChart3 },
  // { to: '/ai/community', label: 'Community', Icon: Users },
];

const Sidebar = ({ sidebar, setSidebar }) => {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div
      className={`w-60 bg-[#000] border-r border-[#222] flex flex-col justify-between max-sm:absolute top-14 bottom-0 z-30 ${
        sidebar ? 'translate-x-0' : 'max-sm:-translate-x-full'
      } transition-all duration-300 ease-in-out`}
    >
      <div className="flex-1 flex flex-col pt-6">
        <div className="px-4 pb-5 mb-2 border-b border-[#222]">
          <p className="text-[11px] font-semibold text-[#555] tracking-[0.15em] uppercase">
            {user?.fullName}
          </p>
          <p className="text-[10px] text-[#444] tracking-wider uppercase mt-0.5">Free Plan</p>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/ai'}
              onClick={() => setSidebar(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-l-2 transition-colors ${
                  isActive
                    ? 'border-white text-white bg-[#111]'
                    : 'border-transparent text-[#555] hover:text-[#888] hover:bg-[#0a0a0a]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="border-t border-[#222] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-none bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-xs font-medium text-white shrink-0">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <button
            onClick={signOut}
            className="text-[11px] text-[#555] hover:text-[#888] tracking-wider uppercase transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
