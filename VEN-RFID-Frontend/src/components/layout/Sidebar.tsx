import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, X, UserCog, LogOut, Settings, Shield, Users, Bell, Flag, CreditCard } from "lucide-react";
import { useApp } from "../../context/AppContext";

import { clearAuthTokens } from '../../utils/auth';



const Sidebar = ({ open, setOpen, userLevel }: { open: boolean; setOpen: (open: boolean) => void; userLevel: string | null }) => {
  const { currentAdmin } = useApp();
  const navigate = useNavigate();

  const allNavigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Vehicle Management", href: "/admin/dashboard", icon: UserCog },
    { name: 'User Management', href: '/superadmin', icon: Shield },
    { name: 'Notification Center', href: '/notifications', icon: Bell },
    { name: "Vehicle Logs", href: "/entries", icon: FileText },
    { name: 'Personnel Details', href: '/personnel', icon: Users },
    { name: 'Vehicle Flags', href: '/vehicle-flags', icon: Flag },
  ];

  // Filter navigation based on current admin level from context
  const navigation = allNavigation.filter(item => {
    const adminLevel = currentAdmin?.level || userLevel;
    if (adminLevel === 'Super Admin') return true; // Access to all
    if (adminLevel === 'Admin') return ['Dashboard', 'Vehicle Management', 'Personnel Details', 'Vehicle Logs', 'Vehicle Flags'].includes(item.name);
    if (adminLevel === 'Employee') return ['Dashboard', 'Personnel Details', 'Vehicle Logs', 'Vehicle Flags'].includes(item.name);
    if (adminLevel === 'Quarter Master') return ['Dashboard', 'Vehicle Logs', 'Vehicle Flags'].includes(item.name);
    return false;
  });

  // ✅ Logout function (clears sessionStorage)
  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    sessionStorage.removeItem("userLevel");
    sessionStorage.removeItem("userName");
    clearAuthTokens(); // Clear auth cookies
    window.location.reload(); // Force page reload to reset state
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-md transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header with logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <img
              src="src/img/VEN-logo2.png"
              alt="Vehicle Monitor Logo"
              style={{
                height: "65px",
                width: "170px",
                marginLeft: "25px",
                paddingTop: "5px",
                paddingBottom: "5px",
              }}
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 flex flex-col justify-between h-[calc(100%-4rem)]">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                    }`
                  }
                  end={item.href === "/"}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
          <hr className="my-4 border-slate-200 dark:border-slate-700" />

          <div>
            {/* ✅ System Status */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="px-3 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  System Status
                </h4>
                <div className="mt-2 flex items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    All systems operational
                  </span>
                </div>
              </div>
            </div>
            {/* ✅ Settings & Logout Buttons */}
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center w-full px-3 py-2 mt-2 rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50 transition"
              >
                <Settings className="mr-3 h-5 w-5" />
                Profile Settings
              </button>
              <button
                 onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 mt-2 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
