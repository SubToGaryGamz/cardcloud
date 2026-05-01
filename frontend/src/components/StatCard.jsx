import React from "react";

export default function StatCard({ label, value, icon, sub, highlight, testId }) {
  const valueColor =
    highlight === "green" ? "text-[#34C759]" :
    highlight === "red" ? "text-[#FF3B30]" :
    "text-white";
  return (
    <div className="card-tile rounded-lg bg-[#141414] border border-white/10 p-5 fade-up" data-testid={testId}>
      <div className="flex items-center justify-between text-neutral-500">
        <span className="text-xs tracking-[0.2em] uppercase font-semibold">{label}</span>
        <span className="text-neutral-400">{icon}</span>
      </div>
      <div className={`mt-3 font-display text-3xl lg:text-4xl tracking-tight font-black ${valueColor}`} data-testid={`${testId}-value`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-neutral-500 uppercase tracking-wider">{sub}</div>}
    </div>
  );
}
