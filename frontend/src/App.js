import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { BillingProvider } from "./context/BillingContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Profile from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import PublicCard from "./pages/PublicCard";
import PublicVault from "./pages/PublicVault";
import BillingSuccess from "./pages/BillingSuccess";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import CsvImportHelp from "./pages/CsvImportHelp";
import Leaderboard from "./pages/Leaderboard";
import { Toaster } from "./components/ui/sonner";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0A0A0A]">
        <div className="text-neutral-500 font-display tracking-widest uppercase text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Synchronous check for OAuth callback - prevents race conditions
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/help/csv-import" element={<CsvImportHelp />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/s/c/:token" element={<PublicCard />} />
      <Route path="/s/v/:token" element={<PublicVault />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <BillingProvider>
              <AppRouter />
              <Toaster theme="dark" richColors position="top-right" />
            </BillingProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
