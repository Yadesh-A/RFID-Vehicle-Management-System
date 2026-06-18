import React, { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomePopup from '../WelcomePopup';

interface LayoutProps {
  children: ReactNode;
  userLevel: string | null;
}

const Layout: React.FC<LayoutProps> = ({ children, userLevel }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Get user name from session storage
    const storedUserName = sessionStorage.getItem('userName');
    if (storedUserName) {
      setUserName(storedUserName);
      // Show welcome popup on mount (every login)
      setShowWelcome(true);
    }
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Welcome Popup */}
      {showWelcome && (
        <WelcomePopup 
          userName={userName} 
          onClose={() => setShowWelcome(false)} 
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} userLevel={userLevel} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header openSidebar={() => setSidebarOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
