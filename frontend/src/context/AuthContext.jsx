import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("cv_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch (e) {
      localStorage.removeItem("cv_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const setToken = (token, userData) => {
    localStorage.setItem("cv_token", token);
    setUser(userData);
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); }
    catch (e) { if (process.env.NODE_ENV !== "production") console.warn("logout endpoint failed", e); }
    localStorage.removeItem("cv_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setToken, logout, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
