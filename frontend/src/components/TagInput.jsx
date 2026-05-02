import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "./ui/input";

export default function TagInput({ value = [], onChange, placeholder = "Add tag, press Enter", testId = "tags-input" }) {
  const [draft, setDraft] = useState("");
  const ref = useRef(null);

  const commit = (raw) => {
    const t = (raw || draft).trim().toLowerCase();
    if (!t) return;
    if ((value || []).includes(t)) {
      setDraft("");
      return;
    }
    onChange([...(value || []), t]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value?.length) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div
      className="mt-1.5 min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-md border border-white/10 bg-[#0A0A0A] px-2 py-1.5 focus-within:border-[#FF3B30]/60 transition"
      onClick={() => ref.current?.focus()}
      data-testid={testId}
    >
      {(value || []).map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1 text-xs bg-[#007AFF]/10 text-[#4aa3ff] border border-[#007AFF]/20 px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold">
          {t}
          <button type="button" onClick={(e) => { e.stopPropagation(); removeAt(i); }} className="hover:text-white" data-testid={`${testId}-remove-${i}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit()}
        placeholder={(value?.length || 0) === 0 ? placeholder : ""}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-white placeholder:text-neutral-500 py-1"
        data-testid={`${testId}-field`}
      />
    </div>
  );
}
