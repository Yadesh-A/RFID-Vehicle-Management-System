// @ts-nocheck
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { GlobalTimeProvider } from "./context/GlobalTimeContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import VehicleEntries from "./pages/VehicleEntries";
import VehicleDetails from "./pages/VehicleDetails";
import PlateScanner from "./components/PlateScanner";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import Superadmin from "./pages/Superadmin";
import PersonnelDetails from "./pages/PersonnelDetails";
import PersonnelDetail from "./pages/PersonnelDetail";
import Profile from "./pages/Profile";


import NotificationCenter from "./pages/NotificationCenter";
import AllNotifications from "./pages/AllNotifications";
import VehicleFlags from "./pages/VehicleFlags";
import VehicleHistory from "./pages/VehicleHistory";


const AppContent = () => {
  const { sharedInitialTime } = useApp();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userLevel, setUserLevel] = useState<string | null>(null);

  // Clear session every time the site is reopened (no auto login)
  useEffect(() => {
    sessionStorage.removeItem("loggedIn");
    sessionStorage.removeItem("userLevel");
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const stored = sessionStorage.getItem("loggedIn");
    const level = sessionStorage.getItem("userLevel");
    if (stored === "true" && level) {
      setIsLoggedIn(true);
      setUserLevel(level);
    }
  }, []);

  return (
    <GlobalTimeProvider initialTime={sharedInitialTime}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {isLoggedIn ? (
          <Layout userLevel={userLevel}>
            <Routes>
              {/* Dashboard (main page after login) */}
              <Route path="/" element={<Dashboard />} />

              {/* Admin Dashboard page */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/superadmin" element={<Superadmin />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/personnel" element={<PersonnelDetails />} />
              <Route path="/personnel/:id" element={<PersonnelDetail />} />


              {/* Notification pages */}
              <Route path="/notifications" element={<NotificationCenter />} />
              <Route path="/notifications/all" element={<AllNotifications />} />

              {/* Other site pages */}
              <Route path="/entries" element={<VehicleEntries />} />
              <Route path="/vehicles/:id" element={<VehicleDetails />} />
              <Route path="/vehicle-flags" element={<VehicleFlags />} />
              <Route path="/vehicle-history/:id" element={<VehicleHistory />} />
              <Route
                path="/scan"
                element={<PlateScanner />}
              />

              {/* Redirect any wrong URL to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            {/* Show login page first */}
            <Route path="/" element={<AdminLogin setIsLoggedIn={setIsLoggedIn} setUserLevel={setUserLevel} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Router>
    </GlobalTimeProvider>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
