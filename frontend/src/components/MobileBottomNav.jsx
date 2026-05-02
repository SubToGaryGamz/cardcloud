import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Eye, Plus, User as UserIcon, Lock } from "lucide-react";
import { useBilling } from "../context/BillingContext";

/**
 * Sticky bottom tab bar for small screens. Hidden on md+ (≥768px).
 * Tabs: Vault · Watchlist · (+) · Profile.
 * The center "+" button always navigates to /dashboard with ?add=1 so the
 * Dashboard can open the Add Card modal regardless of which page you came from.
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPro } = useBilling();

  const Tab = ({ to, icon: Icon, label, locked = false, active, testId, onClick }) => {
    const cls = `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition ${
      active ? "text-white" : "text-neutral-500"
    }`;
    const inner = (
      <>
        <div className="relative">
          <Icon className={`h-5 w-5 ${active ? "" : ""}`} strokeWidth={active ? 2.5 : 2} />
          {locked && <Lock className="h-2.5 w-2.5 text-[#FFD60A] absolute -top-1 -right-1.5 bg-[#0A0A0A] rounded-full p-px" />}
        </div>
        <span className={`text-[10px] uppercase tracking-widest ${active ? "font-black" : "font-semibold"}`}>{label}</span>
        {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#FF3B30]" />}
      </>
    );
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={cls + " relative"} data-testid={testId}>
          {inner}
        </button>
      );
    }
    return (
      <Link to={to} className={cls + " relative"} data-testid={testId}>
        {inner}
      </Link>
    );
  };

  const onAdd = () => {
    if (location.pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("cardcloud:open-add-card"));
    } else {
      navigate("/dashboard?add=1");
    }
  };

  const isVault = location.pathname.startsWith("/dashboard");
  const isWatch = location.pathname.startsWith("/watchlist");
  const isProfile = location.pathname.startsWith("/profile");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/85 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="mobile-bottom-nav"
    >
      <div className="grid grid-cols-4 items-stretch">
        <Tab to="/dashboard" icon={LayoutDashboard} label="Vault" active={isVault} testId="mobile-nav-vault" />
        <Tab to="/watchlist" icon={Eye} label="Watchlist" active={isWatch} locked={!isPro} testId="mobile-nav-watchlist" />
        <div className="relative flex items-end justify-center">
          <button
            type="button"
            onClick={onAdd}
            className="absolute -top-5 h-12 w-12 rounded-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 grid place-items-center shadow-glow-red transition active:scale-95"
            data-testid="mobile-nav-add"
            aria-label="Add card"
          >
            <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold pb-2">Add</span>
        </div>
        <Tab to="/profile" icon={UserIcon} label="Profile" active={isProfile} testId="mobile-nav-profile" />
      </div>
    </nav>
  );
}
