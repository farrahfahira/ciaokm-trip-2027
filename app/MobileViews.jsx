"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, Check, ChevronRight, ExternalLink } from "lucide-react";
import { num, Avatar, MoneyInput } from "./shared";

const uid = () => Math.random().toString(36).slice(2, 9);
const isUrl = (s) => /^https?:\/\//i.test(String(s || "").trim());
const weekday = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" }) : "");
const weekdayShort = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short" }) : "");
const dayMonth = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nextDate = (date) => {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const blankRow = () => ({ id: uid(), time: "", place: "", link: "", activity: "", price: "", notes: "" });
const isBlank = (r) => !r.time && !r.place && !r.link && !r.activity && !r.price && !r.notes;

const field = "w-full text-base bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400";
const lbl = "block text-sm font-medium text-slate-600 mb-1.5";

// ── Lembar yang muncul dari bawah ──
export function Sheet({ title, onClose, children, footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="text-base font-semibold text-slate-800 truncate">{title}</div>
          <button onClick={onClose} aria-label="Tutup" className="p-2 -mr-2 rounded-lg text-slate-400 active:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
}

// ── Itinerary versi HP ──
export function ItineraryMobile({ days, setDays }) {
  const [sel, setSel] = useState(() => days.find((d) => d.date === todayISO())?.id ?? null);
  const [edit, setEdit] = useState(null); // { dayId, rowId }
  const chipsRef = useRef(null);

  const day = days.find((d) => d.id === sel) || days[0];
  const di = day ? days.indexOf(day) : -1;

  useEffect(() => {
    if (!day) return;
    chipsRef.current?.querySelector(`[data-id="${day.id}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [day?.id]);

  const updDay = (f, v) => setDays((ds) => ds.map((d) => (d.id === day.id ? { ...d, [f]: v } : d)));
  const addDay = () => {
    const id = uid();
    setDays((ds) => [...ds, { id, label: "", date: nextDate(ds.length ? ds[ds.length - 1].date : ""), rows: [] }]);
    setSel(id);
  };
  const delDay = () => {
    if (day.rows.some((r) => !isBlank(r)) && !confirm(`Hapus Hari ${di + 1} beserta isinya?`)) return;
    const next = days[di + 1] || days[di - 1];
    setDays((ds) => ds.filter((d) => d.id !== day.id));
    setSel(next ? next.id : null);
  };
  const addStop = () => {
    const row = blankRow();
    setDays((ds) => ds.map((d) => (d.id === day.id ? { ...d, rows: [...d.rows, row] } : d)));
    setEdit({ dayId: day.id, rowId: row.id });
  };

  const editDay = edit && days.find((d) => d.id === edit.dayId);
  const editRow = editDay && editDay.rows.find((r) => r.id === edit.rowId);
  const updRow = (f, v) => setDays((ds) => ds.map((d) => (d.id !== edit.dayId ? d : { ...d, rows: d.rows.map((r) => (r.id === edit.rowId ? { ...r, [f]: v } : r)) })));
  const removeRow = () => setDays((ds) => ds.map((d) => (d.id !== edit.dayId ? d : { ...d, rows: d.rows.filter((r) => r.id !== edit.rowId) })));
  const delRow = () => {
    if (!confirm("Hapus tempat ini?")) return;
    removeRow();
    setEdit(null);
  };
  const closeEdit = () => {
    if (editRow && isBlank(editRow)) removeRow();
    setEdit(null);
  };

  if (!day) {
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-10">Belum ada hari.</div>
        <button onClick={addDay} className="w-full rounded-xl bg-indigo-500 text-white font-medium py-3.5 inline-flex items-center justify-center gap-1.5 active:bg-indigo-600">
          <Plus size={18} /> Tambah hari
        </button>
      </div>
    );
  }

  const stops = day.rows.filter((r) => !isBlank(r));

  return (
    <div className="space-y-3">
      {/* Pilih hari */}
      <div ref={chipsRef} className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
        {days.map((d, i) => {
          const on = d.id === day.id;
          return (
            <button
              key={d.id}
              data-id={d.id}
              onClick={() => setSel(d.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-left border transition ${on ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}
            >
              <div className="text-sm font-semibold">Hari {i + 1}</div>
              <div className={`text-[11px] ${on ? "text-indigo-100" : "text-slate-400"}`}>{d.date ? `${weekdayShort(d.date)}, ${dayMonth(d.date)}` : "Tanpa tanggal"}</div>
            </button>
          );
        })}
        <button onClick={addDay} className="shrink-0 rounded-xl px-3.5 border border-dashed border-indigo-300 text-indigo-600 text-sm font-medium inline-flex items-center gap-1">
          <Plus size={15} /> Hari
        </button>
      </div>

      {/* Info hari */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-slate-800 capitalize">{day.date ? weekday(day.date) : `Hari ${di + 1}`}</div>
            <input value={day.label} onChange={(e) => updDay("label", e.target.value)} placeholder="Judul (opsional)" className="w-full text-sm text-slate-500 bg-transparent focus:outline-none mt-0.5 placeholder:text-slate-300" />
          </div>
          <button onClick={delDay} aria-label="Hapus hari" className="p-2 -m-1 rounded-lg text-slate-300 active:text-rose-500 active:bg-rose-50">
            <Trash2 size={18} />
          </button>
        </div>
        <input type="date" value={day.date} onChange={(e) => updDay("date", e.target.value)} className="mt-3 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>

      {/* Tempat */}
      {stops.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Belum ada tempat.</p>}
      {stops.map((r) => (
        <div key={r.id} role="button" tabIndex={0} onClick={() => setEdit({ dayId: day.id, rowId: r.id })} className="bg-white rounded-xl border border-slate-200 p-3.5 active:bg-slate-50 cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="w-16 shrink-0 text-xs font-semibold text-indigo-600 tabular-nums pt-0.5 break-words">{r.time || "–"}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-slate-800 break-words">{r.place || <span className="text-slate-300 font-normal">Tanpa nama</span>}</div>
              {r.activity && <div className="text-sm text-slate-600 mt-0.5">{r.activity}</div>}
              {(r.price || r.notes) && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{[r.price, r.notes].filter(Boolean).join(" · ")}</div>}
            </div>
            {isUrl(r.link) && (
              <a href={r.link.trim()} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Buka link" className="p-2 -m-1 rounded-lg text-indigo-500 active:bg-indigo-50">
                <ExternalLink size={18} />
              </a>
            )}
          </div>
        </div>
      ))}
      <button onClick={addStop} className="w-full rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-medium py-3.5 inline-flex items-center justify-center gap-1.5 active:bg-indigo-50">
        <Plus size={18} /> Tambah tempat
      </button>

      {editRow && (
        <Sheet
          title={editRow.place || "Tempat baru"}
          onClose={closeEdit}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={delRow} className="inline-flex items-center gap-1.5 text-sm text-slate-400 active:text-rose-500 px-3 py-2.5 rounded-lg">
                <Trash2 size={16} /> Hapus
              </button>
              <button onClick={closeEdit} className="ml-auto text-base font-medium text-white bg-indigo-500 active:bg-indigo-600 px-6 py-2.5 rounded-lg">
                Selesai
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={lbl}>Tempat</label>
              <input autoFocus={!editRow.place} value={editRow.place} onChange={(e) => updRow("place", e.target.value)} placeholder="Nama tempat" className={field} />
            </div>
            <div>
              <label className={lbl}>Jam</label>
              <input value={editRow.time} onChange={(e) => updRow("time", e.target.value)} placeholder="11.00 - 13.30" className={field} />
            </div>
            <div>
              <label className={lbl}>Kegiatan</label>
              <input value={editRow.activity} onChange={(e) => updRow("activity", e.target.value)} placeholder="Makan siang" className={field} />
            </div>
            <div>
              <label className={lbl}>Kira-kira harga</label>
              <input value={editRow.price} onChange={(e) => updRow("price", e.target.value)} placeholder="RM20-40" className={field} />
            </div>
            <div>
              <label className={lbl}>Link</label>
              <input type="url" inputMode="url" value={editRow.link} onChange={(e) => updRow("link", e.target.value.trim())} placeholder="Tempel link Google Maps" className={field} />
            </div>
            <div>
              <label className={lbl}>Catatan</label>
              <textarea rows={3} value={editRow.notes} onChange={(e) => updRow("notes", e.target.value)} className={`${field} resize-none`} />
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Nabung versi HP ──
// ── Kotak isi setoran (muncul di tengah) ──
// ── Kotak isi setoran (muncul di tengah) ──
export function AmountDialog({ title, subtitle, value, monthly, fmt, onSave, onClose }) {
  const [v, setV] = useState(value === "" || value == null ? "" : Number(value));
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const n = num(v);
  const had = num(value) > 0;
  const save = () => {
    onSave(n > 0 ? n : "");
    onClose();
  };
  const remove = () => {
    if (confirm("Hapus setoran ini?")) {
      onSave("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4"
      >
        <div>
          <div className="text-base font-semibold text-slate-800">{title}</div>
          <div className="text-sm text-slate-500">{subtitle}</div>
        </div>

        <div className="text-3xl font-bold text-slate-800 tabular-nums">{n > 0 ? fmt(n) : <span className="text-slate-300">{fmt(0)}</span>}</div>

        <MoneyInput
          autoFocus
          value={v}
          onChange={setV}
          placeholder="Ketik jumlahnya"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400"
        />

        {monthly > 0 && n !== monthly && (
          <button type="button" onClick={() => setV(monthly)} className="text-sm font-medium text-emerald-700 bg-emerald-50 active:bg-emerald-100 px-3 py-2 rounded-lg">
            Minimal {fmt(monthly)}
          </button>
        )}

        <div className="flex items-center gap-2 pt-1">
          {had && (
            <button type="button" onClick={remove} className="text-sm text-slate-400 active:text-rose-500 px-2 py-2.5">
              Hapus
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto text-sm text-slate-500 px-4 py-2.5 rounded-lg active:bg-slate-100">
            Batal
          </button>
          <button type="submit" className="text-sm font-medium text-white bg-emerald-500 active:bg-emerald-600 px-6 py-2.5 rounded-lg">
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
// ── Nabung versi HP ──
export function SaveMobile({ people, activeIdx, monthLabels, curIdx, monthly, monthsOf, personTotal, updMonth, fmt }) {
  const [open, setOpen] = useState(null); // orang yang bulan-bulannya lagi dibuka
  const [amountEdit, setAmountEdit] = useState(null); // { i, k } yang lagi diisi
  const inPeriod = curIdx >= 0 && curIdx < monthLabels.length;
  const monthName = (k) => `${monthLabels[k].short} '${monthLabels[k].year}`;

  const state = (v, k) => {
    const a = num(v);
    if (a > 0) return monthly > 0 && a < monthly ? "low" : "paid";
    return k < curIdx ? "missed" : "upcoming";
  };
  const dot = { paid: "bg-emerald-400", low: "bg-amber-400", missed: "bg-rose-300", upcoming: "bg-slate-200" };
  const textTint = { paid: "text-emerald-700", low: "text-amber-700", missed: "text-rose-500", upcoming: "text-slate-300" };

  const AmountText = ({ i, k }) => {
    const v = people[i].months[k];
    const st = state(v, k);
    return <span className={`text-sm font-semibold tabular-nums text-right ${textTint[st]}`}>{num(v) > 0 ? fmt(v) : st === "missed" ? "Bolong" : "–"}</span>;
  };
  const EditBtn = ({ i, k }) => {
    const has = num(people[i].months[k]) > 0;
    return (
      <button onClick={() => setAmountEdit({ i, k })} className={`w-16 shrink-0 text-xs font-medium py-2 rounded-lg ${has ? "text-slate-500 bg-slate-100 active:bg-slate-200" : "text-emerald-700 bg-emerald-50 active:bg-emerald-100"}`}>
        {has ? "Ubah" : "Isi"}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {inPeriod && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">Setoran {monthName(curIdx)}</div>
            {monthly > 0 && <div className="text-xs text-slate-400">Minimal {fmt(monthly)}</div>}
          </div>
          <div className="space-y-2.5">
            {activeIdx.map((i) => (
              <div key={people[i].id || i} className="flex items-center gap-3">
                <Avatar name={people[i].name} i={i} photo={people[i].photo} size="w-8 h-8 text-xs" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700">{people[i].name}</span>
                <AmountText i={i} k={curIdx} />
                <EditBtn i={i} k={curIdx} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-700">Semua bulan</div>
        <div className="divide-y divide-slate-100">
          {activeIdx.map((i) => {
            const p = people[i];
            return (
              <button key={p.id || i} onClick={() => setOpen(i)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
                <Avatar name={p.name} i={i} photo={p.photo} size="w-9 h-9 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                  <div className="flex gap-0.5 mt-1.5">
                    {monthsOf(p).map((v, k) => (
                      <span key={k} className={`h-1.5 flex-1 rounded-full ${dot[state(v, k)]} ${k === curIdx ? "ring-1 ring-offset-1 ring-emerald-400" : ""}`} />
                    ))}
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700 shrink-0">{fmt(personTotal(p))}</div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {open !== null && people[open] && (
        <Sheet
          title={people[open].name}
          onClose={() => setOpen(null)}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-base font-semibold text-emerald-700">{fmt(personTotal(people[open]))}</span>
            </div>
          }
        >
          <div className="space-y-1">
            {monthLabels.map((_, k) => (
              <div key={k} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${k === curIdx ? "bg-emerald-50/60" : ""}`}>
                <div className="flex-1 text-sm text-slate-600">
                  {monthName(k)}
                  {k === curIdx && <span className="ml-2 text-[11px] font-medium text-emerald-700">bulan ini</span>}
                </div>
                <AmountText i={open} k={k} />
                <EditBtn i={open} k={k} />
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {amountEdit && people[amountEdit.i] && (
        <AmountDialog
          title={`Setoran ${people[amountEdit.i].name}`}
          subtitle={monthName(amountEdit.k)}
          value={people[amountEdit.i].months[amountEdit.k] ?? ""}
          monthly={monthly}
          fmt={fmt}
          onSave={(nv) => updMonth(amountEdit.i, amountEdit.k, nv)}
          onClose={() => setAmountEdit(null)}
        />
      )}
    </div>
  );
}

// ── Bawaan versi HP ──
export function PackingMobile({ packing, setPacking, activeNames, meName }) {
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const upd = (id, f, v) => setPacking((ps) => ps.map((p) => (p.id === id ? { ...p, [f]: v } : p)));
  const del = (id) => setPacking((ps) => ps.filter((p) => p.id !== id));
  const add = () => {
    const item = draft.trim();
    if (!item) return;
    setPacking((ps) => [...ps, { id: uid(), item, who: filter === "mine" && meName ? meName : "Everyone", done: false }]);
    setDraft("");
  };

  const filters = [{ id: "all", label: "Semua" }, ...(meName ? [{ id: "mine", label: "Punyaku" }] : []), { id: "shared", label: "Bareng" }];
  const list = packing.filter((p) => filter === "all" || (filter === "mine" ? p.who === meName : p.who === "Everyone")).sort((a, b) => Number(!!a.done) - Number(!!b.done));

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tambah barang" className={field} />
        <button type="submit" aria-label="Tambah" className="shrink-0 w-12 rounded-lg bg-sky-500 active:bg-sky-600 text-white flex items-center justify-center">
          <Plus size={20} />
        </button>
      </form>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`text-sm px-3.5 py-1.5 rounded-full border transition ${filter === f.id ? "bg-sky-500 border-sky-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {list.length === 0 && <div className="text-sm text-slate-400 text-center py-8">Kosong.</div>}
        {list.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2">
            <button
              onClick={() => upd(r.id, "done", !r.done)}
              aria-label={r.done ? "Belum" : "Udah"}
              className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition ${r.done ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300"}`}
            >
              {r.done && <Check size={16} strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <input value={r.item} onChange={(e) => upd(r.id, "item", e.target.value)} placeholder="Barang" className={`w-full bg-transparent focus:outline-none py-0.5 ${r.done ? "line-through text-slate-400" : "text-slate-800"}`} />
              <select value={r.who} onChange={(e) => upd(r.id, "who", e.target.value)} className="text-xs text-slate-400 bg-transparent -ml-0.5 focus:outline-none">
                <option value="Everyone">Semua orang</option>
                {activeNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                {r.who !== "Everyone" && !activeNames.includes(r.who) && <option value={r.who}>{r.who}</option>}
              </select>
            </div>
            <button onClick={() => del(r.id)} aria-label="Hapus" className="p-2 -mr-1 rounded-lg text-slate-300 active:text-rose-500 active:bg-rose-50">
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
