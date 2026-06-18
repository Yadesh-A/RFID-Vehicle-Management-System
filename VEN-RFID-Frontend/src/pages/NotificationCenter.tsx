import React, { useState } from 'react';
import { Bell, Send, CheckCircle, Clock, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NotificationCenter: React.FC = () => {
  const { currentAdmin, notifications, sendNotification, fetchNotifications } = useApp();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const handleTargetRoleChange = (role: string) => {
    setTargetRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim() || targetRoles.length === 0) {
      alert('Please fill in all fields and select at least one target level');
      return;
    }

    setSending(true);
    try {
      await sendNotification({ title, message, target_roles: targetRoles });
      setTitle('');
      setMessage('');
      setTargetRoles([]);
      alert('Notification sent successfully!');
      // Refresh notifications to update the sent list
      await fetchNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  // Get sent notifications (only those sent by current admin)
  const sentNotifications = notifications.filter(
    notif => notif.sender === currentAdmin?.id
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (currentAdmin?.level !== 'Super Admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">Only Super Admin can access the Notification Center.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notification Center</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div className="card bg-white dark:bg-slate-800 shadow-lg rounded-lg">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
              <Send className="mr-2" size={20} />
              Send New Notification
            </h2>
          </div>

          <form onSubmit={handleSendNotification} className="p-6 space-y-4">
            <div>
              <label className="label" htmlFor="title">
                Title
              </label>
              <input
                type="text"
                id="title"
                className="input w-full"
                placeholder="Enter notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                className="input w-full"
                rows={5}
                placeholder="Enter notification message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label mb-3">
                Target User Levels
              </label>
              <div className="space-y-2">
                {['Quarter Master', 'Employee', 'Admin'].map((role) => (
                  <div key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={targetRoles.includes(role)}
                      onChange={() => handleTargetRoleChange(role)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <label
                      htmlFor={`role-${role}`}
                      className="ml-2 block text-sm text-slate-700 dark:text-slate-300"
                    >
                      {role}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>

        {/* Sent Notifications List */}
        <div className="card bg-white dark:bg-slate-800 shadow-lg rounded-lg">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
              <Clock className="mr-2" size={20} />
              Sent Notifications ({sentNotifications.length})
            </h2>
          </div>

          <div className="p-6 max-h-[600px] overflow-y-auto">
            {sentNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No notifications sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {notif.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(notif.sent_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-slate-500 dark:text-slate-400">
                        <Users size={14} className="mr-1" />
                        Target: {notif.target_roles ? notif.target_roles.join(', ') : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
