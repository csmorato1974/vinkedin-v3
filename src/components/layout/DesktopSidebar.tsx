import { Home, Search, PlusCircle, MessageCircle, User, LogOut } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <div className="h-6 w-6 flex-shrink-0">{icon}</div>
      <span className="hidden font-medium lg:block">{label}</span>
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { signOut, profile } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[72px] flex-col border-r border-border bg-card md:flex lg:w-[220px]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center px-4 lg:justify-start">
        <img src={logo} alt="VinkedIn" className="h-10 w-10 object-contain" />
        <span className="ml-2 hidden text-xl font-bold text-gradient-brand lg:block">
          VinkedIn
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        <NavItem to="/" icon={<Home className="h-6 w-6" />} label="Inicio" />
        <NavItem to="/discover" icon={<Search className="h-6 w-6" />} label="Descubrir" />
        <NavItem to="/create" icon={<PlusCircle className="h-6 w-6" />} label="Crear" />
        <NavItem to="/chat" icon={<MessageCircle className="h-6 w-6" />} label="Mensajes" />
        <NavItem to="/profile" icon={<User className="h-6 w-6" />} label="Perfil" />
      </nav>

      {/* User section */}
      <div className="border-t border-border p-3">
        {profile && (
          <div className="mb-2 hidden items-center gap-3 rounded-xl p-2 lg:flex">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-brand">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 text-muted-foreground hover:text-destructive lg:justify-start"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span className="hidden lg:inline">Cerrar sesión</span>
        </Button>
      </div>
    </aside>
  );
}
