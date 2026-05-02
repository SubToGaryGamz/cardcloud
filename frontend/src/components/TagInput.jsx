import React, { useRef, useState } from "react";
import { X, Lock } from "lucide-react";

export default function TagInput({
  value = [],
  onChange,
  placeholder = "Add tag, press Enter",
  testId = "tags-input",
  maxTags = null, // null = unlimited
  upgradeHint = null, // optional ReactNode shown when limit reached
}) {
  const [draft, setDraft] = useState("");
  const ref = useRef(null);

  const tags = value || [];
  const limitReached = maxTags !== null && tags.length >= maxTags;

  const commit = (raw) => {
    const t = (raw || draft).trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) {
      setDraft("");
      return;
    }
    if (limitReached) {
      setDraft("");
      return;
    }
    onChange([...tags, t]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeAt = (i) => onChange(tags.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      <div
        className={`mt-1.5 min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-md border bg-[#0A0A0A] px-2 py-1.5 transition ${limitReached ? "border-[#FFD60A]/40" : "border-white/10 focus-within:border-[#FF3B30]/60"}`}
        onClick={() => !limitReached && ref.current?.focus()}
        data-testid={testId}
      >
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-1 text-xs bg-[#007AFF]/10 text-[#4aa3ff] border border-[#007AFF]/20 px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold">
            {t}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeAt(i); }} className="hover:text-white" data-testid={`${testId}-remove-${i}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!limitReached && (
          <input
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => commit()}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-white placeholder:text-neutral-500 py-1"
            data-testid={`${testId}-field`}
          />
        )}
      </div>
      {limitReached && upgradeHint && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#FFD60A] uppercase tracking-widest font-semibold" data-testid={`${testId}-limit-hint`}>
          <Lock className="h-3 w-3" /> {upgradeHint}
        </div>
      )}
    </div>
  );
}
