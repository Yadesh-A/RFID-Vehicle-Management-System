import React, { useState } from 'react';
import { User, Shield, Key, Save, X, Clock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDynamicTime } from '../hooks/useDynamicTime';
import { API_CONFIG } from '../config/api.js';
import { apiFetch } from '../utils/api.js';

const Profile = () => {
  const { currentAdmin, updateCurrentAdmin, users } = useApp();
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Verify the old password matches the stored plain_password
    if (currentUser?.plain_password && oldPassword !== currentUser.plain_password) {
      setError('Current password is incorrect.');
      return;
    }

    // Update the password using the change-password endpoint
    try {
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/users/${currentAdmin?.id}/change-password/`, {
        method: 'PATCH',
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        updateCurrentAdmin({
          id: currentAdmin.id,
          name: currentAdmin.name,
          level: currentAdmin.level,
          password: newPassword
        });
        setSuccess(result.message || 'Password updated successfully.');
        setShowSuccessModal(true);
        setIsEditingPassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccess(null);
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || errorData.detail || 'Failed to update password. Please try again.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError('An error occurred while updating the password.');
    }
  };

  const getLevelBadge = (level: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (level) {
      case "Super Admin":
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400`;
      case "Admin":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
      case "Employee":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`;
      case "Quarter Master":
        return `${baseClasses} bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Find the current user details
  const currentUser = users.find(user => user.id === currentAdmin?.id);

  if (!currentAdmin) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <User className="h-6 w-6 text-slate-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Profile</h1>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock size={14} />
          <span>{formattedDay}</span>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
          <span className="mx-2">•</span>
          <span>{formatTime('p')}</span>
        </div>
      </div>

      <div className="card bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-100 dark:bg-slate-700 p-4 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-900 dark:text-white text-2xl font-bold">
              {currentAdmin.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser?.username || 'N/A'}</h2>
              <div className="flex items-center mt-1">
                <Shield className="h-4 w-4 mr-1 text-slate-500" />
                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                  {currentAdmin.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            {/* Account Information Section */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Account Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Username
                  </label>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {currentUser?.username || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    User Level
                  </label>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {currentAdmin.level}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    User ID
                  </label>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {currentUser?.user_id || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {currentUser?.email || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {currentUser?.phone_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Key className="h-6 w-6 text-purple-600 mr-3" />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Security Settings</h3>
                </div>
                {!isEditingPassword && (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center shadow-md hover:shadow-lg"
                  >
                    <Key size={18} className="mr-2" />
                    Change Password
                  </button>
                )}
              </div>

              {isEditingPassword && (
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors duration-200"
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors duration-200"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-colors duration-200"
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <X className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-200 font-medium">{error}</span>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-green-800 dark:text-green-200 font-medium">{success}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="px-8 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
                    >
                      <X size={20} className="mr-2" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center shadow-md hover:shadow-lg"
                    >
                      <Save size={18} className="mr-2" />
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {success}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                }}
                className="btn btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
