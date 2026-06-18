import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Eye, UserPlus, Search, X, Edit, Trash2, EyeOff, Clock } from "lucide-react";
import { User } from "../types/types";
import { useApp } from "../context/AppContext";
import { useDynamicTime } from "../hooks/useDynamicTime";
// Removed duplicate import for Eye and EyeOff icons
import Pagination from "../components/Pagination";
import { getApiUrl, API_CONFIG } from "../config/api.js";
import { apiFetch } from "../utils/api.js";

const getLevelBadge = (level: User['role']) => {
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

const Superadmin = () => {
  const {
    currentAdmin,
    updateCurrentAdmin,
    users = [],
    userCount = 0,
    userPage = 1,
    userPageSize = 20,
    userTotalPages = 1,
    fetchUsers,
    setUserPage
  } = useApp();
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [admins, setAdmins] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [newAdmin, setNewAdmin] = useState<Partial<User>>({ username: "", email: "", phone_number: "", role: "Quarter Master" });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [adminPassword, setAdminPassword] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalAdmin, setPasswordModalAdmin] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Use backend-driven pagination state
  const currentPage = userPage;
  const itemsPerPage = userPageSize;

  // Define role hierarchy order
  const roleOrder = ["Super Admin", "Admin", "Employee", "Quarter Master"];

  // Helper function to sort users by role hierarchy
  const sortUsersByRole = (users: User[]): User[] => {
    return users.sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      return aIndex - bIndex;
    });
  };


  // Fetch users when page changes
  useEffect(() => {
    fetchUsers(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Backend-driven: users is already the current page's data
  // Filtering/searching should be done via backend for large datasets, but for now, filter current page
  const filteredUsers = users.filter((user: User) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.user_id && user.user_id.toLowerCase().includes(searchLower)) ||
      (user.phone_number && user.phone_number.toLowerCase().includes(searchLower)) ||
      (user.role && user.role.toLowerCase().includes(searchLower))
    );
  });
  const paginatedUsers = filteredUsers;
  const totalPages = userTotalPages;

  // Reset to first page on search
  useEffect(() => {
    setUserPage(1);
  }, [searchTerm, setUserPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAdmin((prev) => ({ ...prev, [name]: value } as Partial<User>));
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdmin.username && newPassword && newAdmin.email && newAdmin.phone_number && newAdmin.username.trim()) {
      // Check if username already exists
      const existingAdmin = admins.find(admin => admin.username.toLowerCase() === newAdmin.username!.toLowerCase());
      if (existingAdmin) {
        alert("Username already exists. Please choose a different name.");
        return;
      }
      // Check if email already exists
      const existingEmail = admins.find(admin => admin.email.toLowerCase() === newAdmin.email!.toLowerCase());
      if (existingEmail) {
        alert("Email already exists. Please choose a different email.");
        return;
      }
      try {
        const response = await apiFetch(getApiUrl(API_CONFIG.ENDPOINTS.USERS), {
          method: 'POST',
          body: JSON.stringify({
            ...newAdmin,
            password: newPassword
          }),
        });
        if (response.ok) {
          const newAdminData: User = await response.json();
          setAdmins((prev) => sortUsersByRole([...prev, newAdminData]));
          fetchUsers(currentPage, itemsPerPage);
          setIsModalOpen(false);
          setNewAdmin({ username: "", email: "", phone_number: "", role: "Quarter Master" });
          setNewPassword("");
        } else {
          const errorData = await response.json().catch(() => ({}));
          let errorMessage = "Failed to add user. Please try again.";
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            const errors = [];
            for (const field in errorData) {
              if (Array.isArray(errorData[field])) {
                errors.push(`${field}: ${errorData[field][0]}`);
              } else {
                errors.push(`${field}: ${errorData[field]}`);
              }
            }
            if (errors.length > 0) {
              errorMessage = errors.join('\n');
            }
          }
          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error adding user:', error);
        alert("An error occurred while adding the user.");
      }
    }
  };

  const handleEditAdmin = (admin: User) => {
    if (!currentAdmin || currentAdmin.level !== "Super Admin") {
      alert("Only Super Admin can edit users.");
      return;
    }
    setPasswordModalAdmin(admin);
    setPendingAction('edit');
    setIsPasswordModalOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdmin.username && newAdmin.email && newAdmin.phone_number && newAdmin.username.trim() && editingAdmin) {
      try {
        const updateData: any = {
          username: newAdmin.username,
          email: newAdmin.email,
          phone_number: newAdmin.phone_number,
          role: newAdmin.role
        };
        
        if (newPassword) {
          updateData.password = newPassword;
        }
        
        const response = await apiFetch(`${API_CONFIG.BASE_URL}/users/${editingAdmin.id}/`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        if (response.ok) {
          const updatedAdmin: User = await response.json();
          setAdmins((prev) => sortUsersByRole(prev.map((admin) => (admin.id === editingAdmin.id ? updatedAdmin : admin))));
          fetchUsers(currentPage, itemsPerPage);
          // Update currentAdmin in context if the edited admin is the current user
          if (currentAdmin && currentAdmin.id === editingAdmin.id) {
            updateCurrentAdmin({
              id: updatedAdmin.id,
              name: updatedAdmin.username,
              level: updatedAdmin.role,
              password: ''
            });
          }
          setIsModalOpen(false);
          setIsEditing(false);
          setEditingAdmin(null);
          setNewAdmin({ username: "", email: "", phone_number: "", role: "Quarter Master" });
          setNewPassword("");
        }
      } catch (error) {
        console.error('Error updating user:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingAdmin(null);
    setNewAdmin({ username: "", email: "", phone_number: "", role: "Quarter Master" });
    setNewPassword("");
  };

  const handleTogglePassword = (admin: User) => {
    if (!currentAdmin || currentAdmin.level !== "Super Admin") {
      alert("Only Super Admin can view passwords.");
      return;
    }

    if (visiblePasswords.has(admin.id)) {
      // Password is currently visible, hide it without verification
      setVisiblePasswords((prev) => {
        const newSet = new Set(prev);
        newSet.delete(admin.id);
        return newSet;
      });
    } else {
      // Password is hidden, require verification to show
      setPasswordModalAdmin(admin);
      setPendingAction('view');
      setIsPasswordModalOpen(true);
    }
  };

  const handleVerifyPassword = () => {
    if (adminPassword.trim() && passwordModalAdmin && currentAdmin && pendingAction) {
      if (adminPassword === currentAdmin.password && currentAdmin.level === "Super Admin") {
        if (pendingAction === 'view') {
          setVisiblePasswords((prev) => new Set([...prev, passwordModalAdmin.id]));
        } else if (pendingAction === 'edit') {
          setIsEditing(true);
          setEditingAdmin(passwordModalAdmin);
          setNewAdmin({ 
            username: passwordModalAdmin.username, 
            email: passwordModalAdmin.email,
            phone_number: passwordModalAdmin.phone_number,
            role: passwordModalAdmin.role 
          });
          // Set the password field to show the user's current password
          setNewPassword(passwordModalAdmin.plain_password || "");
          setIsModalOpen(true);
        } else if (pendingAction === 'delete') {
          // Open a centered confirmation modal instead of using window.confirm
          setUserToDelete(passwordModalAdmin);
          setIsDeleteUserConfirmOpen(true);
        }
        setIsPasswordModalOpen(false);
        setAdminPassword("");
        setPasswordModalAdmin(null);
        setPendingAction(null);
      } else {
        setValidationMessage('Incorrect superadmin password');
        setShowValidationModal(true);
      }
    }
  };

  const performDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/users/${userToDelete.id}/`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== userToDelete.id));
        fetchUsers(currentPage, itemsPerPage);
        setVisiblePasswords((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userToDelete.id);
          return newSet;
        });
      } else {
        console.error('Error deleting admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
    } finally {
      setIsDeleteUserConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const handlePasswordModalCancel = () => {
    setIsPasswordModalOpen(false);
    setAdminPassword("");
    setPasswordModalAdmin(null);
  };

  const handleDeleteAdmin = (admin: User) => {
    if (!currentAdmin || currentAdmin.level !== "Super Admin") {
      alert("Only Super Admin can delete users.");
      return;
    }
    setPasswordModalAdmin(admin);
    setPendingAction('delete');
    setIsPasswordModalOpen(true);
  };


  // Use context loading if available, otherwise fallback to local loading
  const { loading: contextLoading } = useApp();
  if (contextLoading) {
    return <div>Loading admins...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {isDeleteUserConfirmOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Confirm Delete User</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to delete user "{userToDelete.username}"?</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setIsDeleteUserConfirmOpen(false); setUserToDelete(null); }}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performDeleteUser}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showValidationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Validation Error</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{validationMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Users count: <span className="font-semibold">{userCount}</span>
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
      </div>

      <div className="card bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="SEARCH BY USER NAME, USER ID, PHONE NUMBER OR USER LEVEL..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary inline-flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PH NO</th>
                {/* Removed password column heading */}
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedUsers.map((admin, index) => (
                <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-blue-600 dark:text-blue-400">{admin.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900 dark:text-white">{admin.username}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{admin.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">{admin.phone_number}</div>
                  </td>
                  {/* Removed password column value */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getLevelBadge(admin.role)}>{admin.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button
                      onClick={() => handleEditAdmin(admin)}
                      className="btn-secondary-sm inline-flex items-center"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      className="btn-danger-sm inline-flex items-center"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="card bg-white dark:bg-slate-800 w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">{isEditing ? 'Edit Admin' : 'Add New User'}</h3>
              <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isEditing ? handleUpdateAdmin : handleAddAdmin}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label" htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" className="input w-full" value={newAdmin.username} onChange={handleInputChange} required autoComplete="off" />
                  
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" className="input w-full" value={newAdmin.email} onChange={handleInputChange} required autoComplete="off" />
                </div>
                <div>
                  <label className="label" htmlFor="phone_number">Phone Number</label>
                  <input type="text" id="phone_number" name="phone_number" className="input w-full" value={newAdmin.phone_number} onChange={handleInputChange} maxLength={10} required autoComplete="off"/>
                </div>
                <div>
                  <label className="label" htmlFor="password">Password {isEditing && "(leave blank to keep current)"} </label>
                  <input 
                    type="text" 
                    id="password" 
                    className="input w-full" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required={!isEditing}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="role">User Level</label>
                  <select id="role" name="role" className="input w-full" value={newAdmin.role} onChange={handleInputChange}>
                    <option>Quarter Master</option>
                    <option>Employee</option>
                    <option>Admin</option>
                    <option>Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Update' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Verification Modal */}
      {isPasswordModalOpen && passwordModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="card bg-white dark:bg-slate-800 w-full max-w-md m-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Verify Access</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter your superadmin password to {pendingAction === 'view' ? 'view' : pendingAction === 'edit' ? 'edit' : 'delete'} this User.
              </p>
              <input
                type="password"
                placeholder="Superadmin password"
                className="input w-full mb-4"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handlePasswordModalCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPassword}
                  className="btn btn-primary"
                  disabled={!adminPassword.trim()}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {userCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setUserPage}
          totalItems={userCount}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
};

export default Superadmin;
