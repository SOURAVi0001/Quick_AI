import { Protect, useClerk, useUser } from '@clerk/clerk-react';
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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';

const navItems = [
  { to: '/ai', label: 'Dashboard', Icon: House },
  { to: '/ai/write-article', label: 'Write Article', Icon: SquarePen },
  { to: '/ai/blog-titles', label: 'Blog Titles', Icon: Hash },
  { to: '/ai/generate-images', label: 'Generate Images', Icon: Image },
  { to: '/ai/remove-background', label: 'Remove Background', Icon: Eraser },
  { to: '/ai/remove-object', label: 'Remove Object', Icon: Scissors },
  { to: '/ai/review-resume', label: 'Review Resume', Icon: FileText },
  { to: '/ai/community', label: 'Community', Icon: Users },
];

const NavItemContent = (props) => {
  const IconComponent = props.Icon;
  return (
    <>
      <IconComponent className={`w-4 h-4 ${props.isActive ? 'text-primary-foreground' : ''}`} />
      {props.label}
    </>
  );
};

const Sidebar = ({ sidebar, setSidebar }) => {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();

  return (
    <div
      className={`w-60 bg-card border-r flex flex-col justify-between items-center max:sm:absolute top-14 bottom-0 ${
        sidebar ? 'translate-x-0' : 'max-sm:-translate-x-full'
      } transition-all duration-300 ease-in-out`}
    >
      <div className="my-7 w-full">
        <Avatar className="w-13 h-13 mx-auto">
          <AvatarImage src={user.imageUrl} alt={user.fullName} />
          <AvatarFallback className="text-lg">{user.fullName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-1 text-center text-foreground font-medium">{user.fullName}</h1>
        <div className="px-4 mt-5 text-sm font-medium">
          {navItems.map(({ to, label, Icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/ai'}
              onClick={() => setSidebar(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-foreground text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              {({ isActive }) => (
                <NavItemContent Icon={ItemIcon} label={label} isActive={isActive} />
              )}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="w-full border-t p-4 px-5 flex items-center justify-between">
        <div onClick={openUserProfile} className="flex gap-2 items-center cursor-pointer">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.imageUrl} alt={user.fullName} />
            <AvatarFallback className="text-xs">{user.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">
              <Protect plan="premium" fallback="Free">
                Premium
              </Protect>
              Plan
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
