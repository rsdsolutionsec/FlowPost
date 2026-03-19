import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <Topbar />
      <main className="flex-1 ml-[280px] pt-[72px]">
        <div className="p-12 lg:p-16 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
