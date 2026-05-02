import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

export const BillingContext = React.createContext({ isPro: false, refresh: () => {}, packages: {}, limits: {} });

export function BillingProvider({ children }) {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState(null);
  const [packages, setPackages] = useState({});
  const [limits, setLimits] = useState({});

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/billing/me");
      setIsPro(!!r.data.is_pro);
      setProExpiresAt(r.data.pro_expires_at || null);
      setPackages(r.data.packages || {});
      setLimits(r.data.limits || {});
    } catch (e) { if (process.env.NODE_ENV !== "production") console.warn("billing/me failed (likely unauth)", e); }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else { setIsPro(false); setProExpiresAt(null); setLimits({}); }
  }, [user, refresh]);

  return (
    <BillingContext.Provider value={{ isPro, proExpiresAt, packages, limits, refresh }}>
      {children}
    </BillingContext.Provider>
  );
}

export const useBilling = () => React.useContext(BillingContext);
