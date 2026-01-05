import { Home, Search, PlusCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCreate?: boolean;
}

function NavItem({ to, icon, label, isCreate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 transition-colors',
          isCreate
            ? 'relative -mt-4'
            : isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {isCreate ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/30">
          {icon}
        </div>
      ) : (
        <>
          <div className="h-6 w-6">{icon}</div>
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function MobileNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <NavItem to="/" icon={<Home className="h-6 w-6" />} label="Inicio" />
      <NavItem to="/create" icon={<PlusCircle className="h-7 w-7" />} label="" isCreate />
      <NavItem to="/discover" icon={<Search className="h-6 w-6" />} label="Buscar" />
    </nav>
  );
}
