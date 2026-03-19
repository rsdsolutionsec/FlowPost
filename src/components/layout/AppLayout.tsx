import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="transition-all duration-300 lg:pl-80">
        <Topbar />
        <main className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
