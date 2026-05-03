import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, ArrowLeft, ArrowRight, FileSpreadsheet, CheckCircle2, Copy, Download, Upload, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const CSV_COLUMNS = [
  { name: "Year", required: true, type: "Number", example: "2003", note: "4-digit year. Required." },
  { name: "Name", required: true, type: "Text", example: "LeBron James Topps RC", note: "Card title — player + set + variation. Required." },
  { name: "Sport", required: false, type: "Text", example: "Basketball", note: "One of Basketball, Baseball, Football, Hockey, Soccer, Pokemon, Other." },
  { name: "Condition", required: false, type: "Text", example: "Raw", note: "Raw, PSA, BGS, SGC, CGC, or Other." },
  { name: "Grade", required: false, type: "Number", example: "10", note: "1.0 – 10.0. Leave blank for Raw." },
  { name: "Tags", required: false, type: "Text", example: "lakers,rookie,topps", note: "Comma-separated, lowercase. Free plan = 1 tag, Pro = unlimited." },
  { name: "Where Bought", required: false, type: "Text", example: "eBay", note: "Where you sourced the card." },
  { name: "Price Paid", required: false, type: "Number", example: "120.50", note: "USD. No $ sign or commas." },
  { name: "Price Sold", required: false, type: "Number", example: "350.00", note: "Leave blank if In Collection." },
  { name: "Expenses", required: false, type: "Number", example: "12.50", note: "Shipping + fees combined." },
  { name: "Status", required: false, type: "Text", example: "in_collection", note: "in_collection or sold. Defaults to In Collection." },
  { name: "Purchased Date", required: false, type: "Date", example: "2024-01-15", note: "YYYY-MM-DD format." },
  { name: "Sold Date", required: false, type: "Date", example: "2024-09-22", note: "YYYY-MM-DD format. Required if Status = sold." },
];

const SAMPLE_CSV = `Year,Name,Sport,Condition,Grade,Tags,Where Bought,Price Paid,Price Sold,Expenses,Status,Purchased Date,Sold Date
2003,LeBron James Topps RC,Basketball,Raw,,"cavaliers,rookie,topps",eBay,120.50,,12.50,in_collection,2024-01-15,
2018,Luka Doncic Prizm RC,Basketball,PSA,10,"mavericks,rookie,prizm",COMC,650,1450,45,sold,2023-08-02,2024-11-10
2011,Mike Trout Topps Update RC,Baseball,Raw,,"angels,rookie",Card Shop,200,,8,in_collection,2024-03-12,
1999,Charizard 1st Edition Holo,Pokemon,PSA,9,"pokemon,charizard,1st-edition",Heritage,4500,,0,in_collection,2023-12-20,
`;

export default function CsvImportHelp() {
  const [copied, setCopied] = useState(false);

  const copySample = async () => {
    const { copyText } = await import("../lib/clipboard");
    if (await copyText(SAMPLE_CSV)) {
      setCopied(true);
      toast.success("Sample CSV copied to clipboard");
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error("Couldn't copy — long-press to copy manually");
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cardcloud_sample_import.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sample CSV downloaded");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="csvhelp-brand">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-lg tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition" data-testid="csvhelp-back">
            <ArrowLeft className="h-4 w-4" /> Back to Vault
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 lg:py-16 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FFD60A] font-bold border border-[#FFD60A]/30 bg-[#FFD60A]/10 px-3 py-1.5 rounded-full">
          <FileSpreadsheet className="h-3 w-3" /> CSV Import Guide
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-4 leading-[0.95]">
          Move 1,000 cards<br />in 30 seconds.
        </h1>
        <p className="text-neutral-400 mt-4 max-w-2xl">
          Already tracking your collection in Excel, Google Sheets, or another app? Export it as CSV, match the columns below, and CardCloud will ingest the whole vault in one upload. Pro feature.
        </p>

        {/* Quick start */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: 1, title: "Get the template", body: "Download the sample CSV below — it has all the columns and 4 example cards.", icon: Download },
            { n: 2, title: "Fill with your cards", body: "Open in Excel, Google Sheets, Numbers — paste your data and match the headers exactly.", icon: FileSpreadsheet },
            { n: 3, title: "Upload on the Vault", body: "Open Vault → Import button → choose your file. We'll show you how many imported and any errors.", icon: Upload },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border border-white/10 bg-[#141414] p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-black text-[#FFD60A]">
                <span className="h-5 w-5 grid place-items-center rounded-sm bg-[#FFD60A] text-black">{s.n}</span>
                Step {s.n}
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight mt-3">{s.title}</h3>
              <p className="text-sm text-neutral-400 mt-1.5">{s.body}</p>
            </div>
          ))}
        </section>

        {/* Sample download */}
        <section className="mt-12 rounded-xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] font-black text-[#FFD60A]">Sample CSV</div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase mt-1">Start with the template</h2>
              <p className="text-sm text-neutral-400 mt-1.5 max-w-lg">
                Already filled with 4 example rows (LeBron rookie, Luka rookie sold flip, Trout, and a 1999 Charizard) so you can see exactly how every column should look.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={downloadSample} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="csvhelp-download">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button onClick={copySample} variant="outline" className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="csvhelp-copy">
                <Copy className="h-4 w-4 mr-2" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-md bg-black/40 border border-white/5 p-4 text-[11px] text-neutral-300 font-mono leading-relaxed" data-testid="csvhelp-sample-preview">
{SAMPLE_CSV}
          </pre>
        </section>

        {/* Column reference */}
        <section className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase">Column reference</h2>
          <p className="text-sm text-neutral-400 mt-2">Headers are case-insensitive. Underscored variants (<code className="text-neutral-300">price_paid</code>) work too.</p>

          <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-[#141414]">
            <table className="w-full text-sm" data-testid="csvhelp-columns-table">
              <thead className="bg-black/40 text-neutral-500 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Column</th>
                  <th className="text-left font-bold px-4 py-3 hidden sm:table-cell">Type</th>
                  <th className="text-left font-bold px-4 py-3">Example</th>
                  <th className="text-left font-bold px-4 py-3 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {CSV_COLUMNS.map((c) => (
                  <tr key={c.name} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-white font-semibold">{c.name}</div>
                      {c.required && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-black bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 px-1.5 py-0.5 rounded-sm mt-1">Required</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-400 hidden sm:table-cell">{c.type}</td>
                    <td className="px-4 py-3 align-top">
                      <code className="text-[12px] bg-black/40 border border-white/10 px-2 py-0.5 rounded-sm text-neutral-200">{c.example}</code>
                    </td>
                    <td className="px-4 py-3 align-top text-neutral-400 hidden md:table-cell">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tips */}
        <section className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#34C759]/30 bg-[#34C759]/5 p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-black text-[#34C759]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Do this
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-300 list-disc pl-5">
              <li>Save your sheet as <span className="text-white font-semibold">CSV UTF-8</span> (handles é, ñ, &amp;, etc.).</li>
              <li>Keep the header row exactly as in the template.</li>
              <li>Use <code className="text-neutral-200 bg-black/40 px-1 rounded">2024-09-22</code> format for dates.</li>
              <li>Wrap the <code className="text-neutral-200 bg-black/40 px-1 rounded">Tags</code> field in quotes if it contains commas: <code className="text-neutral-200 bg-black/40 px-1 rounded">"lakers,rookie,topps"</code>.</li>
              <li>Pro caps imports at <span className="text-white font-semibold">2,000 rows per file</span> — split larger sheets.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-black text-[#FF3B30]">
              <AlertCircle className="h-3.5 w-3.5" /> Don't do this
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-300 list-disc pl-5">
              <li>Don't include a <span className="text-white font-semibold">$</span> sign or commas inside number fields.</li>
              <li>Don't paste images — only the text fields. (Add images one-tap inside the app after import, or use the AI Scan button.)</li>
              <li>Don't leave <code className="text-neutral-200 bg-black/40 px-1 rounded">Year</code> or <code className="text-neutral-200 bg-black/40 px-1 rounded">Name</code> empty — those rows are skipped.</li>
              <li>Don't use Excel's "Save As .xlsx" — must be plain <span className="text-white font-semibold">.csv</span>.</li>
            </ul>
          </div>
        </section>

        {/* Round-trip tip */}
        <section className="mt-12 rounded-lg border border-white/10 bg-[#141414] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-[#007AFF]/20 border border-[#007AFF]/30 grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4 text-[#4aa3ff]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight">Pro tip — round-trip</h3>
              <p className="text-sm text-neutral-400 mt-1">
                Export your existing CardCloud collection from <span className="text-white">Vault → Export</span>, edit it in your spreadsheet of choice, then re-import. Headers will already match.
              </p>
            </div>
          </div>
          <Link to="/dashboard" className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide text-sm shadow-glow-red transition" data-testid="csvhelp-go-vault">
            Go to Vault <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500">
          <Link to="/" className="hover:text-white transition" data-testid="csvhelp-home-link">Home</Link>
          <Link to="/privacy" className="hover:text-white transition" data-testid="csvhelp-privacy-link">Privacy</Link>
        </div>
      </main>
    </div>
  );
}
