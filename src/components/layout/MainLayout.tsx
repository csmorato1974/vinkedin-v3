import { ReactNode } from 'react';
import { MobileNavigation } from './MobileNavigation';
import { DesktopSidebar } from './DesktopSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <DesktopSidebar />
      <main className="min-h-screen pb-20 md:ml-[72px] md:pb-0 lg:ml-[220px]">
        {children}
      </main>
      <MobileNavigation />
    </div>
  );
}
