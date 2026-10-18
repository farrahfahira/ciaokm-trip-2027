"use client";

import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";

const fmtTime = (ms) => new Date(ms).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (ymd) => new Date(ymd + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const titleOf = (s) => (s.type === "daily" ? `Awal hari ${fmtDay(s.day)}` : s.type === "reset" ? `Sebelum reset, ${fmtTime(s.at)}` : `Sebelum dipulihkan, ${fmtTime(s.at)}`);

export default function HistoryPanel({ onRestore, onClose }) {
  const [snaps, setSnaps] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    fetch("/api/trip/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setSnaps(b.snapshots || []))
      .catch(() => setError("Gagal memuat cadangan."));
  }, []);

  const restore = async (s) => {
    if (!confirm(`Pulihkan trip ke "${titleOf(s)}"?\n\nIni akan mengubah data untuk semua orang. Versi saat ini akan dicadangkan terlebih dahulu.`)) return;
    setBusy(s.id);
    setError("");
    try {
      const r = await fetch(`/api/trip/history?id=${encodeURIComponent(s.id)}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok || !b.data) throw new Error();
      onRestore(b.data);
      onClose();
    } catch {
      setError("Gagal memulihkan cadangan ini.");
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-700">
          Riwayat <span className="font-normal text-slate-400">30 hari terakhir</span>
        </div>
        <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <X size={16} />
        </button>
      </div>
      {error && <div className="text-xs text-rose-500 mb-2">{error}</div>}
      {snaps === null && !error && <div className="text-sm text-slate-400 py-4">Memuat…</div>}
      {snaps && snaps.length === 0 && <div className="text-sm text-slate-400 py-4">Belum ada cadangan.</div>}
      {snaps && snaps.length > 0 && (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {snaps.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.type === "daily" ? "bg-slate-300" : "bg-amber-400"}`} />
              <span className="text-slate-700">{titleOf(s)}</span>
              <button onClick={() => restore(s)} disabled={busy !== null} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-md disabled:opacity-50">
                <RotateCcw size={13} /> {busy === s.id ? "Memulihkan…" : "Pulihkan"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
