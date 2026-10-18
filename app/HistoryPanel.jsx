"use client";

import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";

const fmtTime = (ms) => new Date(ms).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (ymd) => new Date(ymd + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const titleOf = (s) => (s.type === "daily" ? `Start of ${fmtDay(s.day)}` : s.type === "reset" ? `Before reset · ${fmtTime(s.at)}` : `Before restore · ${fmtTime(s.at)}`);

export default function HistoryPanel({ onRestore, onClose }) {
  const [snaps, setSnaps] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    fetch("/api/trip/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setSnaps(b.snapshots || []))
      .catch(() => setError("Couldn't load backups. Try again in a moment."));
  }, []);

  const restore = async (s) => {
    if (!confirm(`Restore the trip to "${titleOf(s)}"?\n\nThis changes it for everyone. The current version is backed up first, so you can undo this.`)) return;
    setBusy(s.id);
    setError("");
    try {
      const r = await fetch(`/api/trip/history?id=${encodeURIComponent(s.id)}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok || !b.data) throw new Error(b.error);
      onRestore(b.data);
      onClose();
    } catch (e) {
      setError(e?.message || "Couldn't restore that backup. Try again.");
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-700">
          History <span className="font-normal text-slate-400">· backups from the last 30 days</span>
        </div>
        <button onClick={onClose} title="Close" className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <X size={15} />
        </button>
      </div>
      {error && <div className="text-xs text-rose-500 mb-2">{error}</div>}
      {snaps === null && !error && <div className="text-sm text-slate-400 py-4">Loading backups…</div>}
      {snaps && snaps.length === 0 && <div className="text-sm text-slate-400 py-4">No backups yet. One is saved automatically each day someone edits the trip, and before every reset.</div>}
      {snaps && snaps.length > 0 && (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {snaps.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.type === "daily" ? "bg-slate-300" : "bg-amber-400"}`} />
              <span className="text-slate-700">{titleOf(s)}</span>
              <button onClick={() => restore(s)} disabled={busy !== null} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-md disabled:opacity-50">
                <RotateCcw size={13} /> {busy === s.id ? "Restoring…" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
