import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Cloud, Tag as TagIcon, Image as ImageIcon } from "lucide-react";
import Lightbox from "../components/Lightbox";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function publicImageUrl(token, path) {
  return `${BACKEND_URL}/api/public/image/${token}/${path}`;
}

export default function PublicCard() {
  const { token } = useParams();
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

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#0A0A0A] text-neutral-500 font-display tracking-widest uppercase text-sm">Loading…</div>;
  if (error || !data) return (
    <div className="min-h-screen grid place-items-center bg-[#0A0A0A] p-8 text-center">
      <div>
        <div className="font-display text-3xl tracking-tighter font-black uppercase">Link not found</div>
        <p className="text-neutral-400 mt-2">This share link is invalid or was revoked.</p>
      </div>
    </div>
  );

  const { card, owner } = data;
  const paths = (card.image_path ? [card.image_path] : []).concat(card.images || []);
  const urls = paths.map((p) => publicImageUrl(token, p));

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
            <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
          </div>
          <span className="font-display text-xl tracking-tight font-black uppercase">CardCloud</span>
          <span className="ml-auto text-xs text-neutral-500 uppercase tracking-widest">Public Showcase</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 relative z-10" data-testid="public-card-page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            className="aspect-[3/4] rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] border border-white/10 overflow-hidden cursor-pointer"
            onClick={() => urls.length && setLb(true)}
            data-testid="public-card-image"
          >
            {urls.length > 0 ? (
              <img src={urls[0]} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-neutral-700"><ImageIcon className="h-16 w-16" strokeWidth={1.5} /></div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">{card.year}{card.sport ? ` · ${card.sport}` : ""}</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-1 leading-[0.95]">{card.name}</h1>

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
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-white/5 border border-white/10 text-neutral-300 px-2 py-1 rounded-sm uppercase tracking-wider font-semibold">
                    <TagIcon className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            )}

            {urls.length > 1 && (
              <div className="mt-6 grid grid-cols-4 gap-2">
                {urls.slice(1).map((u, i) => (
                  <button key={u} onClick={() => setLb(true)} className="aspect-square rounded-md overflow-hidden border border-white/10 hover:border-white/30 transition" data-testid={`public-thumb-${i}`}>
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto pt-8 flex items-center gap-3 text-sm text-neutral-400 border-t border-white/10 pt-5">
              <span className="h-8 w-8 rounded-full bg-[#0A0A0A] ring-1 ring-white/10 grid place-items-center text-xs font-bold text-neutral-300">
                {(owner?.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <span>Shared by <span className="text-white font-semibold">{owner?.name || "Anonymous"}</span></span>
            </div>
          </div>
        </div>
      </main>

      {lb && <Lightbox images={urls} startIndex={0} onClose={() => setLb(false)} />}
    </div>
  );
}
