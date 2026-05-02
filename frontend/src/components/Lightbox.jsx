import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Lightbox({ images = [], startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => setIdx(startIndex), [startIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!images.length) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm grid place-items-center p-4" onClick={onClose} data-testid="lightbox">
      <button onClick={onClose} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white" data-testid="lightbox-close">
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white" data-testid="lightbox-prev">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white" data-testid="lightbox-next">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <img
        src={images[idx]}
        alt={`image ${idx + 1}`}
        className="max-h-[90vh] max-w-[92vw] object-contain rounded-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid={`lightbox-image-${idx}`}
      />
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
