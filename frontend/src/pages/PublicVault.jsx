import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Cloud, Image as ImageIcon, Tag as TagIcon } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const imgUrl = (token, p) => `${BACKEND_URL}/api/public/image/${token}/${p}`;

export default function PublicVault() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${BACKEND_URL}/api/public/vault/${token}`);
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
        <p className="text-neutral-400 mt-2">This vault is private or the link was revoked.</p>
      </div>
    </div>
  );

  const { owner, cards = [] } = data;

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
            <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
          </div>
          <span className="font-display text-xl tracking-tight font-black uppercase">CardCloud</span>
          <span className="ml-auto text-xs text-neutral-500 uppercase tracking-widest">Public Vault</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 relative z-10" data-testid="public-vault-page">
        <div className="mb-10">
          <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">Showcase</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-1">
            {owner?.name ? `${owner.name}’s Cloud` : "Collection"}
          </h1>
          <p className="text-neutral-400 mt-3 text-sm">{cards.length} card{cards.length !== 1 ? "s" : ""}</p>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#141414] p-10 text-center">
            <div className="font-display text-2xl uppercase tracking-tight font-bold">Nothing yet</div>
            <p className="text-neutral-400 text-sm mt-2">This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {cards.map((c) => (
              <div key={c.id} className="card-tile rounded-lg bg-[#141414] border border-white/10 overflow-hidden flex flex-col" data-testid={`public-card-${c.id}`}>
                <div className="aspect-[3/4] relative bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c]">
                  {c.image_path ? (
                    <img src={imgUrl(token, c.image_path)} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-neutral-700"><ImageIcon className="h-12 w-12" strokeWidth={1.5} /></div>
                  )}
                  {c.sport && (
                    <span className="absolute top-3 right-3 text-[10px] px-2 py-1 uppercase tracking-[0.18em] font-bold rounded-sm bg-black/60 text-white border border-white/10">
                      {c.sport}
                    </span>
                  )}
                  <span className={`absolute top-3 left-3 text-[10px] px-2 py-1 uppercase tracking-[0.18em] font-bold rounded-sm border ${
                    c.status === "sold"
                      ? "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30"
                      : "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30"
                  }`}>
                    {c.status === "sold" ? "Sold" : "In Collection"}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{c.year}</div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white leading-tight mt-0.5 line-clamp-2">{c.name}</h3>
                  {(c.tags || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(c.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 text-neutral-300 px-1.5 py-0.5 rounded-sm font-semibold">
                          <TagIcon className="h-2.5 w-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
