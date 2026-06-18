import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Pagination from '../components/Pagination';

const AllNotifications: React.FC = () => {
  const { notifications, markNotificationAsRead, fetchNotifications } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      await markNotificationAsRead(notificationId);
      // Refresh to update the list and badge
      await fetchNotifications();
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  // Paginated notifications
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">All Notifications</h1>
          {unreadCount > 0 && (
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      <div className="card bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No notifications
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                  ? "No read notifications yet."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            paginatedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id, notif.is_read || false)}
                className={`p-6 cursor-pointer transition ${
                  notif.is_read
                    ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.is_read
                      ? 'bg-slate-200 dark:bg-slate-700'
                      : 'bg-blue-500'
                  }`}>
                    <Bell size={20} className={notif.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-white'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={`font-semibold ${
                        notif.is_read
                          ? 'text-slate-900 dark:text-white'
                          : 'text-blue-900 dark:text-blue-100'
                      }`}>
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                    </div>

                    <p className={`text-sm mb-2 ${
                      notif.is_read
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {formatDate(notif.sent_at)}
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">From: {notif.sender_name}</span>
                      </div>
                      {notif.is_read && (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle size={14} className="mr-1" />
                          Read
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {paginatedNotifications.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredNotifications.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </div>
  );
};

export default AllNotifications;
