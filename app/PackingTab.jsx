"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Sheet } from "./MobileViews";
import { Avatar } from "./shared";

const uid = () => Math.random().toString(36).slice(2, 9);
const PACK_CATS = ["docs", "clothes", "toiletries", "electronics", "meds", "food", "other"];
const PACK_LABEL = { docs: "Dokumen", clothes: "Pakaian", toiletries: "Perlengkapan mandi", electronics: "Elektronik", meds: "Obat", food: "Makanan", other: "Lainnya" };
const catOf = (x) => (PACK_CATS.includes(x.cat) ? x.cat : "other");

const field = "w-full text-base bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400";
const lbl = "block text-sm font-medium text-slate-600 mb-1.5";

export default function PackingTab({ people, activeIdx, isActive, packing, setPacking, meIdx, setMe }) {
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  const meActive = meIdx !== null && isActive(meIdx);
  const assignees = (x) => (x.who === "all" ? activeIdx : (Array.isArray(x.who) ? x.who : []).filter((j) => isActive(j)));
  const isDone = (x, j) => !!(x.done && x.done[j]);
  const doneCount = (x) => assignees(x).filter((j) => isDone(x, j)).length;
  const allDone = (x) => {
    const a = assignees(x);
    return a.length > 0 && a.every((j) => isDone(x, j));
  };

  const toggleMine = (x) =>
    setPacking((ps) =>
      ps.map((p) => {
        if (p.id !== x.id) return p;
        const done = { ...(p.done || {}) };
        if (done[meIdx]) delete done[meIdx];
        else done[meIdx] = true;
        return { ...p, done };
      }),
    );

  const names = (list) => {
    const n = list.map((j) => people[j].name);
    return n.length <= 2 ? n.join(", ") : `${n.slice(0, 2).join(", ")} +${n.length - 2}`;
  };
  const subOf = (x) => {
    const a = assignees(x);
    const k = doneCount(x);
    if (!a.length) return { text: "Belum ada yang bawa", warn: true };
    if (x.type === "shared") return { text: `${names(a)} yang bawa${a.length > 1 ? ` · ${k}/${a.length} udah` : k ? " · udah" : ""}` };
    return { text: `${x.who === "all" ? "Semua orang" : names(a)} · ${k}/${a.length} udah` };
  };

  // ── progres ──
  const slots = packing.reduce((s, x) => s + assignees(x).length, 0);
  const packedSlots = packing.reduce((s, x) => s + doneCount(x), 0);
  const mine = meActive ? packing.filter((x) => assignees(x).includes(meIdx)) : [];
  const mineDone = mine.filter((x) => isDone(x, meIdx)).length;

  const list = packing.filter((x) => filter === "all" || (filter === "personal" ? x.type !== "shared" : x.type === "shared"));
  const groups = PACK_CATS.map((c) => ({ c, items: list.filter((x) => catOf(x) === c).sort((a, b) => Number(allDone(a)) - Number(allDone(b))) })).filter((g) => g.items.length);

  // ── form ──
  const openNew = () => {
    setError("");
    setDraft({ id: uid(), item: "", type: "personal", who: "all", cat: "", done: {}, isNew: true });
  };
  const openEdit = (x) => {
    setError("");
    setDraft({ ...x, who: x.who === "all" ? "all" : [...(x.who || [])] });
  };
  const setD = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const setType = (t) =>
    setDraft((d) => ({
      ...d,
      type: t,
      who: t === "personal" ? (d.who === "all" || d.who.length ? d.who : "all") : d.who === "all" ? [] : d.who,
    }));
  const togglePerson = (j) =>
    setDraft((d) => {
      const cur = d.who === "all" ? [] : d.who;
      return { ...d, who: cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort((a, b) => a - b) };
    });
  const save = () => {
    const name = draft.item.trim();
    if (!name) return setError("Isi nama barangnya dulu.");
    if (draft.type === "personal" && Array.isArray(draft.who) && !draft.who.length) return setError("Pilih siapa yang bawa.");
    const { isNew, ...x } = { ...draft, item: name };
    // Centang orang lain yang masuk selama form kebuka tetap dipertahankan
    setPacking((ps) => (ps.some((p) => p.id === x.id) ? ps.map((p) => (p.id === x.id ? { ...x, done: p.done || {} } : p)) : [...ps, x]));
    setDraft(null);
  };
  const remove = () => {
    if (!confirm(`Hapus "${draft.item || "barang ini"}"?`)) return;
    setPacking((ps) => ps.filter((p) => p.id !== draft.id));
    setDraft(null);
  };

  const filters = [
    { id: "all", label: "Semua" },
    { id: "personal", label: "Pribadi" },
    { id: "shared", label: "Bersama" },
  ];
  const shown = draft ? people.map((_, j) => j).filter((j) => isActive(j) || (Array.isArray(draft.who) && draft.who.includes(j))) : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-600">
            {packedSlots} dari {slots} udah masuk tas
          </span>
          <span className="font-semibold text-sky-600">{slots ? Math.round((packedSlots / slots) * 100) : 0}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${slots ? (packedSlots / slots) * 100 : 0}%` }} />
        </div>
        {meActive ? (
          <div className="text-xs text-slate-400 mt-2">
            Punya {people[meIdx].name}: {mineDone}/{mine.length}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
            <span className="text-slate-500">Pilih nama dulu buat nyentang</span>
            <select value="" onChange={(e) => e.target.value !== "" && setMe(Number(e.target.value))} className="text-sm rounded-md px-2 py-1.5 bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-300">
              <option value="">Pilih nama</option>
              {activeIdx.map((i) => (
                <option key={i} value={i}>
                  {people[i].name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`text-sm px-3.5 py-1.5 rounded-full border transition ${filter === f.id ? "bg-sky-500 border-sky-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-600">
          <Plus size={16} /> Tambah barang
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-10">Kosong.</div>
      ) : (
        groups.map(({ c, items }) => (
          <div key={c}>
            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">{PACK_LABEL[c]}</div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {items.map((x) => {
                const canTick = meActive && assignees(x).includes(meIdx);
                const myDone = canTick && isDone(x, meIdx);
                const all = allDone(x);
                const struck = canTick ? myDone : all;
                const sub = subOf(x);
                return (
                  <div key={x.id} className="flex items-center gap-3 px-3 py-2.5">
                    {canTick ? (
                      <button
                        onClick={() => toggleMine(x)}
                        aria-label={myDone ? "Belum" : "Udah"}
                        className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition ${myDone ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300"}`}
                      >
                        {myDone && <Check size={16} strokeWidth={3} />}
                      </button>
                    ) : (
                      <span className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center ${all ? "bg-slate-200 border-slate-200 text-white" : "border-dashed border-slate-200"}`}>
                        {all && <Check size={16} strokeWidth={3} />}
                      </span>
                    )}
                    <button onClick={() => openEdit(x)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[15px] truncate ${struck ? "line-through text-slate-400" : "text-slate-800"}`}>{x.item || "Tanpa nama"}</span>
                        {x.type === "shared" && <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Bersama</span>}
                      </div>
                      <div className={`text-xs truncate ${sub.warn ? "text-rose-500" : "text-slate-400"}`}>{sub.text}</div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {draft && (
        <Sheet
          title={draft.isNew ? "Tambah barang" : "Ubah barang"}
          onClose={() => setDraft(null)}
          footer={
            <div className="flex items-center gap-2">
              {!draft.isNew && (
                <button onClick={remove} className="text-sm text-slate-400 hover:text-rose-500 active:text-rose-500 px-2 py-2.5">
                  Hapus
                </button>
              )}
              <button onClick={() => setDraft(null)} className="ml-auto text-sm text-slate-500 px-4 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-100">
                Batal
              </button>
              <button onClick={save} className="text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-600 px-6 py-2.5 rounded-lg">
                Simpan
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className={lbl}>Nama barang</label>
              <input autoFocus={draft.isNew} value={draft.item} onChange={(e) => setD("item", e.target.value)} placeholder="Colokan T" className={field} />
            </div>

            <div>
              <label className={lbl}>Buat</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { t: "personal", title: "Pribadi", hint: "Tiap orang bawa sendiri" },
                  { t: "shared", title: "Bersama", hint: "Satu buat semua" },
                ].map((o) => (
                  <button key={o.t} onClick={() => setType(o.t)} className={`text-left rounded-xl border-2 px-3 py-2.5 transition ${draft.type === o.t ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}>
                    <div className={`text-sm font-semibold ${draft.type === o.t ? "text-sky-700" : "text-slate-700"}`}>{o.title}</div>
                    <div className="text-xs text-slate-400">{o.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={lbl}>Siapa yang bawa?</label>
              <div className="flex flex-wrap gap-2">
                {draft.type === "personal" && (
                  <button onClick={() => setD("who", "all")} className={`text-sm px-3 py-1.5 rounded-full border transition ${draft.who === "all" ? "border-sky-300 bg-sky-50 text-sky-700 font-medium" : "border-slate-200 text-slate-500"}`}>
                    Semua orang
                  </button>
                )}
                {shown.map((j) => {
                  const on = Array.isArray(draft.who) && draft.who.includes(j);
                  return (
                    <button
                      key={j}
                      onClick={() => togglePerson(j)}
                      className={`inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border text-sm transition ${on ? "border-sky-300 bg-sky-50 text-slate-800" : "border-slate-200 text-slate-400"}`}
                    >
                      <Avatar name={people[j].name} i={j} photo={people[j].photo} size="w-6 h-6 text-xs" className={on ? "" : "opacity-40 grayscale"} />
                      {people[j].name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={lbl}>
                Kategori <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PACK_CATS.filter((c) => c !== "other").map((c) => (
                  <button
                    key={c}
                    onClick={() => setD("cat", draft.cat === c ? "" : c)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${draft.cat === c ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300 font-medium" : "bg-slate-50 text-slate-500"}`}
                  >
                    {PACK_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
