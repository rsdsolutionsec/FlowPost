import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { clsx } from 'clsx';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
      
      <main className={clsx(
        "flex-1 pt-[64px] transition-all duration-300",
        isSidebarOpen ? "lg:ml-[260px]" : "ml-0"
      )}>
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
