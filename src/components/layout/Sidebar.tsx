import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Search,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Settings,
  LogOut,
  Grid3X3,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Heart, label: 'Notifications', path: '/notifications' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: Grid3X3, label: 'Posts', path: '/posts' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col p-4">
      <div className="mb-8 px-3">
        <h1 className="text-xl font-semibold text-foreground">ChatApp</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'nav-item',
              isActive(item.path) && 'nav-item-active'
            )}
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={cn(
              'nav-item text-primary',
              isActive('/admin') && 'nav-item-active'
            )}
          >
            <Shield className="w-6 h-6" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="border-t border-sidebar-border pt-4 space-y-1">
        <NavLink
          to="/settings"
          className={cn(
            'nav-item',
            isActive('/settings') && 'nav-item-active'
          )}
        >
          <Settings className="w-6 h-6" />
          <span>Settings</span>
        </NavLink>

        <button onClick={signOut} className="nav-item w-full">
          <LogOut className="w-6 h-6" />
          <span>Log out</span>
        </button>
      </div>

      {profile && (
        <div className="border-t border-sidebar-border pt-4 mt-4">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            </div>
          </NavLink>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
