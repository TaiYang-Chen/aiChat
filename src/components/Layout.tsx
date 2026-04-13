import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarContext } from '../lib/SidebarContext';

export function Layout({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="flex h-screen w-full bg-white overflow-hidden relative">
        {/* Mobile Sidebar Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar user={user} onClose={() => setIsOpen(false)} />
        </div>

        <main className="flex-1 flex flex-col min-w-0 w-full relative">
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
