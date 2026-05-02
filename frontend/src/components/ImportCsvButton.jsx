import React, { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function ImportCsvButton({ onImported }) {
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
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={onChange} data-testid="import-csv-file-input" />
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="bg-transparent border-white/20 text-white hover:bg-white/5"
        data-testid="import-csv-button"
      >
        <Upload className="h-4 w-4 mr-2" /> {busy ? "Importing…" : "Import CSV"}
      </Button>
    </>
  );
}
