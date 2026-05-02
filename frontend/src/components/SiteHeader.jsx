import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Cloud, LogOut, LayoutDashboard, Eye, User as UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    let revoked = false;
    let url = null;
    (async () => {
      if (!user?.avatar_path) { setAvatarUrl(null); return; }
      try {
        const res = await api.get(`/files/${user.avatar_path}`, { responseType: "blob" });
        url = URL.createObjectURL(res.data);
        if (!revoked) setAvatarUrl(url);
      } catch (e) { /* noop */ }
    })();
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
  }, [user?.avatar_path]);

  const NavLink = ({ to, icon: Icon, label, testId }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        data-testid={testId}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold uppercase tracking-wider transition ${
          active ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" data-testid="brand-logo">
          <div className="relative h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
            <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
          </div>
          <span className="font-display text-xl tracking-tight font-black uppercase hidden sm:inline">CardCloud</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/dashboard" icon={LayoutDashboard} label="Vault" testId="nav-vault" />
          <NavLink to="/watchlist" icon={Eye} label="Watchlist" testId="nav-watchlist" />
          <NavLink to="/profile" icon={UserIcon} label="Profile" testId="nav-profile" />
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/profile" className="hidden sm:flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition" data-testid="user-chip">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-[#141414] ring-1 ring-white/10 grid place-items-center text-xs font-bold text-neutral-300">
                {(user?.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span data-testid="user-name">{user?.name}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { logout(); nav("/login"); }} className="text-neutral-400 hover:text-white hover:bg-white/5" data-testid="logout-button">
            <LogOut className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
