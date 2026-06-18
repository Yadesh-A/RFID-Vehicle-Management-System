import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, User, Settings, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  openSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  const { currentAdmin, notifications, markNotificationAsRead, getUnreadNotificationsCount } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const handleNotificationClick = async (notificationId: number, isRead: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRead) {
      await markNotificationAsRead(notificationId);
    }
    setNotificationsOpen(false);
    navigate('/notifications/all');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = getUnreadNotificationsCount();
  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Menu button (mobile) and Logo */}
        <div className="flex items-center">
          <button
            onClick={openSidebar}
            className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="ml-2 md:ml-0 text-xl font-semibold text-blue-600 dark:text-blue-500">
            Vehicle Monitor
          </Link>
        </div>

        {/* Center: Search */}
        {/* <div className="hidden sm:block flex-1 max-w-lg mx-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-700">
              <div className="pl-3 text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search vehicles, entries..."
                className="w-full py-2 px-3 focus:outline-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div> */}

        <div className="flex items-center">
          {/* Hide bell icon for Super Admin since they only send notifications */}
          {currentAdmin?.level !== 'Super Admin' && (
            <div className="relative" ref={notificationRef}>
              <button
                className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20 border border-slate-200 dark:border-slate-700 max-h-[500px] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                
                <div className="overflow-y-auto flex-1">
                  {recentNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
                    </div>
                  ) : (
                    recentNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={(e) => handleNotificationClick(notif.id, notif.is_read || false, e)}
                        className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition ${
                          notif.is_read
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                            notif.is_read ? 'bg-slate-300' : 'bg-blue-600'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium mb-1 ${
                              notif.is_read
                                ? 'text-slate-900 dark:text-white'
                                : 'text-blue-900 dark:text-blue-100'
                            }`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-1">
                              {notif.message}
                            </p>
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                              <Clock size={12} className="mr-1" />
                              {formatDate(notif.sent_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-center">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/notifications/all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
                </div>
              )}
            </div>
          )}

          <div className="relative ml-2" ref={userMenuRef}>
            <button
              className="flex items-center p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <User size={16} />
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20 border border-slate-200 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {currentAdmin?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{currentAdmin?.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{currentAdmin?.level}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    Profile Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile search - shown only on small screens */}
      <div className="sm:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-700">
            <div className="pl-3 text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full py-2 px-3 focus:outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>
    </header>
  );
};

export default Header;