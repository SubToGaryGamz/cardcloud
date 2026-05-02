import React, { useEffect, useRef, useState } from "react";
import { Upload, Star, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

// Renders existing images with controls to delete / promote-to-primary,
// plus an "add more" button. Uses the backend endpoints directly.
export default function MultiImageManager({ card, onChange }) {
  const [previews, setPreviews] = useState({}); // path -> blob URL
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const allPaths = ((card?.image_path ? [card.image_path] : []).concat(card?.images || []));

  useEffect(() => {
    let revoked = false;
    const urls = [];
    (async () => {
      const next = {};
      for (const p of allPaths) {
        try {
          const res = await api.get(`/files/${p}`, { responseType: "blob" });
          const url = URL.createObjectURL(res.data);
          urls.push(url);
          if (!revoked) next[p] = url;
        } catch (e) { if (process.env.NODE_ENV !== "production") console.warn("multi-image load failed", e); }
      }
      if (!revoked) setPreviews(next);
    })();
    return () => { revoked = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.image_path, (card?.images || []).join("|")]);

  if (!card?.id) return null;

  const onAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      let updated = null;
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await api.post(`/cards/${card.id}/image?replace=${!card.image_path ? "true" : "false"}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        updated = r.data;
      }
      toast.success(`Added ${files.length} image${files.length > 1 ? "s" : ""}`);
      onChange?.(updated);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (path) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await api.delete(`/cards/${card.id}/image`, { params: { path } });
      const r = await api.get(`/cards/${card.id}`);
      onChange?.(r.data);
      toast.success("Image removed");
    } catch (e) { toast.error("Delete failed"); }
  };

  const onMakePrimary = async (path) => {
    try {
      const r = await api.put(`/cards/${card.id}/primary-image`, null, { params: { path } });
      onChange?.(r.data);
      toast.success("Primary image updated");
    } catch (e) { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-2" data-testid="multi-image-manager">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {allPaths.map((p, i) => {
          const isPrimary = p === card.image_path;
          return (
            <div key={p} className="relative aspect-square rounded-md overflow-hidden bg-[#0A0A0A] border border-white/10 group" data-testid={`manager-img-${i}`}>
              {previews[p] ? (
                <img src={previews[p]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-neutral-700"><ImageIcon className="h-8 w-8" /></div>
              )}
              {isPrimary && (
                <span className="absolute top-1 left-1 text-[9px] uppercase tracking-widest bg-[#FF3B30] text-white font-bold px-1.5 py-0.5 rounded-sm">Primary</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {!isPrimary && (
                  <button type="button" onClick={() => onMakePrimary(p)} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white" title="Make primary" data-testid={`manager-primary-${i}`}>
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => onDelete(p)} className="h-8 w-8 rounded-full bg-white/10 hover:bg-[#FF3B30]/30 grid place-items-center text-white" title="Delete image" data-testid={`manager-delete-${i}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        <label htmlFor="multi-img-input" className="cursor-pointer aspect-square rounded-md border border-dashed border-white/15 bg-[#0A0A0A] hover:border-white/30 transition grid place-items-center text-neutral-400 hover:text-white" data-testid="manager-add">
          <div className="text-center">
            <Plus className="h-5 w-5 mx-auto" />
            <div className="text-[10px] uppercase tracking-widest mt-1 font-semibold">{busy ? "Uploading…" : "Add"}</div>
          </div>
          <input id="multi-img-input" ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
        </label>
      </div>
      <p className="text-[11px] text-neutral-500">Hover an image for options. First image is the primary (shown on the card tile).</p>
    </div>
  );
}
