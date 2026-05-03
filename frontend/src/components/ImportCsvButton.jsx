import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Upload, Lock, HelpCircle } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function ImportCsvButton({ onImported, isPro = true, onLockedClick }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/cards/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { imported = 0, skipped = 0 } = r.data || {};
      toast.success(`Imported ${imported} card${imported === 1 ? "" : "s"}${skipped ? ` · ${skipped} skipped` : ""}`);
      onImported?.();
    } catch (err) {
      if (err?.response?.status === 402) {
        toast.error("Pro required for CSV import");
        onLockedClick?.();
      } else {
        toast.error(err?.response?.data?.detail || "Import failed");
      }
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="inline-flex items-stretch rounded-md overflow-hidden border border-white/20 bg-transparent" data-testid="import-csv-group">
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={onChange} data-testid="import-csv-file-input" />
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => isPro ? ref.current?.click() : onLockedClick?.()}
        className="bg-transparent border-0 text-white hover:bg-white/5 rounded-none"
        data-testid="import-csv-button"
      >
        {isPro ? <Upload className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />} {busy ? "Importing…" : "Import CSV"}
      </Button>
      <Link
        to="/help/csv-import"
        className="px-2.5 grid place-items-center border-l border-white/15 text-neutral-400 hover:text-white hover:bg-white/5 transition"
        title="How to format your CSV"
        data-testid="import-csv-help-link"
      >
        <HelpCircle className="h-4 w-4" />
      </Link>
    </div>
  );
}
