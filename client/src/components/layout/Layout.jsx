import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex pt-14 sm:pt-16"> {/* Add padding-top here */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="w-full md:ml-56 min-h-[calc(100vh-3.5rem)] p-3 sm:p-5 md:p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;