import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Cloud, Tag as TagIcon, Image as ImageIcon } from "lucide-react";
import Lightbox from "../components/Lightbox";
import { CardCloudStamp, TrackYoursCTA } from "../components/CardCloudStamp";
import usePublicTheme from "../hooks/usePublicTheme";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function publicImageUrl(token, path) {
  return `${BACKEND_URL}/api/public/image/${token}/${path}`;
}

export default function PublicCard() {
  const { token } = useParams();
  const theme = usePublicTheme();
  const isLight = theme === "light";
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lb, setLb] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${BACKEND_URL}/api/public/card/${token}`);
        setData(r.data);
      } catch (e) { setError(true); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const bg = isLight ? "bg-white" : "bg-[#0A0A0A] bg-grain";
  const headerBg = isLight ? "bg-white/80 border-black/10" : "bg-black/60 border-white/10";
  const muted = isLight ? "text-neutral-500" : "text-neutral-500";
  const headline = isLight ? "text-neutral-900" : "text-white";
  const labelMuted = isLight ? "text-neutral-500" : "text-neutral-500";
  const subtleBorder = isLight ? "border-black/10" : "border-white/10";
  const tagPill = isLight
    ? "bg-black/[0.04] border-black/10 text-neutral-700"
    : "bg-white/5 border-white/10 text-neutral-300";

  if (loading) return <div className={`min-h-screen grid place-items-center font-display tracking-widest uppercase text-sm ${bg} ${muted}`}>Loading…</div>;
  if (error || !data) return (
    <div className={`min-h-screen grid place-items-center p-8 text-center ${bg}`}>
      <div>
        <div className={`font-display text-3xl tracking-tighter font-black uppercase ${headline}`}>Link not found</div>
        <p className={`mt-2 ${labelMuted}`}>This share link is invalid or was revoked.</p>
      </div>
    </div>
  );

  const { card, owner } = data;
  const paths = (card.image_path ? [card.image_path] : []).concat(card.images || []);
  const urls = paths.map((p) => publicImageUrl(token, p));

  return (
    <div className={`min-h-screen ${bg}`}>
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${headerBg}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
            <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
          </div>
          <span className={`font-display text-xl tracking-tight font-black uppercase ${headline}`}>CardCloud</span>
          <span className={`ml-auto text-xs uppercase tracking-widest ${labelMuted}`}>Public Showcase</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 relative z-10" data-testid="public-card-page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            className={`relative aspect-[3/4] rounded-lg ${isLight ? "bg-gradient-to-br from-neutral-100 to-neutral-200 border border-black/10" : "bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] border border-white/10"} overflow-hidden cursor-pointer`}
            onClick={() => urls.length && setLb(true)}
            data-testid="public-card-image"
          >
            {urls.length > 0 ? (
              <img src={urls[0]} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full grid place-items-center ${isLight ? "text-neutral-300" : "text-neutral-700"}`}><ImageIcon className="h-16 w-16" strokeWidth={1.5} /></div>
            )}
            <CardCloudStamp />
          </div>

          <div className="flex flex-col">
            <div className={`text-xs tracking-[0.3em] uppercase font-semibold ${labelMuted}`}>{card.year}{card.sport ? ` · ${card.sport}` : ""}</div>
            <h1 className={`font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-1 leading-[0.95] ${headline}`}>{card.name}</h1>

            <span className={`mt-4 inline-flex w-max items-center text-[10px] px-2 py-1 uppercase tracking-[0.2em] font-bold rounded-sm border ${
              card.status === "sold"
                ? "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30"
                : "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30"
            }`}>
              {card.status === "sold" ? "Sold" : "In Collection"}
            </span>

            {(card.tags || []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5" data-testid="public-card-tags">
                {(card.tags || []).map((t) => (
                  <span key={t} className={`inline-flex items-center gap-1 text-xs border px-2 py-1 rounded-sm uppercase tracking-wider font-semibold ${tagPill}`}>
                    <TagIcon className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            )}

            {urls.length > 1 && (
              <div className="mt-6 grid grid-cols-4 gap-2">
                {urls.slice(1).map((u, i) => (
                  <button key={u} onClick={() => setLb(true)} className={`relative aspect-square rounded-md overflow-hidden border transition ${isLight ? "border-black/10 hover:border-black/30" : "border-white/10 hover:border-white/30"}`} data-testid={`public-thumb-${i}`}>
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <TrackYoursCTA className="mt-8" referrer="public-card" />

            <div className={`mt-6 pt-5 flex items-center gap-3 text-sm border-t ${subtleBorder} ${labelMuted}`}>
              <span className={`h-8 w-8 rounded-full ring-1 grid place-items-center text-xs font-bold ${isLight ? "bg-white ring-black/10 text-neutral-700" : "bg-[#0A0A0A] ring-white/10 text-neutral-300"}`}>
                {(owner?.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <span>Shared by <span className={isLight ? "text-neutral-900 font-semibold" : "text-white font-semibold"}>{owner?.name || "Anonymous"}</span></span>
            </div>
          </div>
        </div>
      </main>

      {lb && <Lightbox images={urls} startIndex={0} onClose={() => setLb(false)} />}
    </div>
  );
}
