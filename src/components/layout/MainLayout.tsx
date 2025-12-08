import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <main className={`${isMobile ? 'ml-0 pb-16' : 'ml-64'} flex-1`}>
        {children}
      </main>
      {/* Footer - hidden on mobile */}
      {!isMobile && (
        <footer className="ml-64 py-3 px-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
          <span>Last updated 12/7/25</span>
          <span>Made by Potato_guy79 on Instagram</span>
          <span>version 2.0</span>
        </footer>
      )}
    </div>
  );
};

export default MainLayout;
