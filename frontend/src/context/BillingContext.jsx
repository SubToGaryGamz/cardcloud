import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

export const BillingContext = React.createContext({ isPro: false, refresh: () => {}, packages: {} });

export function BillingProvider({ children }) {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState(null);
  const [packages, setPackages] = useState({});

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/billing/me");
      setIsPro(!!r.data.is_pro);
      setProExpiresAt(r.data.pro_expires_at || null);
      setPackages(r.data.packages || {});
    } catch (e) { /* unauth */ }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else { setIsPro(false); setProExpiresAt(null); }
  }, [user, refresh]);

  return (
    <BillingContext.Provider value={{ isPro, proExpiresAt, packages, refresh }}>
      {children}
    </BillingContext.Provider>
  );
}

export const useBilling = () => React.useContext(BillingContext);
