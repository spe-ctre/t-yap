import React from 'react';
import Sidebar from './Sidebar';
import SessionWarningModal from '../SessionWarningModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <SessionWarningModal />
      
      {/* Main Content Area */}
      <div className="ml-64 p-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;