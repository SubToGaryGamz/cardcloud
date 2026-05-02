import React from "react";
import { Link } from "react-router-dom";
import { Cloud, ArrowRight } from "lucide-react";

/** Small image-overlay watermark (bottom-right of any image). */
export function CardCloudStamp({ className = "" }) {
  return (
    <div
      className={`absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-black/55 backdrop-blur-sm text-white text-[9px] uppercase tracking-[0.25em] font-bold pointer-events-none select-none ${className}`}
      data-testid="cardcloud-watermark"
    >
      <Cloud className="h-2.5 w-2.5" strokeWidth={2.5} fill="white" fillOpacity={0.2} />
      CardCloud
    </div>
  );
}

/** Larger CTA button that drives un-logged-in viewers to start their own vault. */
export function TrackYoursCTA({ className = "", testId = "track-yours-cta", referrer = "showcase" }) {
  return (
    <Link
      to={`/?ref=${encodeURIComponent(referrer)}`}
      className={`group inline-flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition border bg-gradient-to-r from-[#FF3B30] to-[#B3261E] hover:from-[#FF3B30]/90 hover:to-[#B3261E]/90 border-[#FF3B30]/40 text-white shadow-glow-red ${className}`}
      data-testid={testId}
    >
      <span className="flex items-center gap-2">
        <Cloud className="h-4 w-4" strokeWidth={2.5} fill="white" fillOpacity={0.2} />
        <span className="text-sm font-bold uppercase tracking-wide">Track yours on CardCloud</span>
      </span>
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
