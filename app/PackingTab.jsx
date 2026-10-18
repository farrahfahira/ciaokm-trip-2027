"use client";

import { useState } from "react";
import { Plus, Check, ChevronRight } from "lucide-react";
import { Sheet } from "./MobileViews";
import { Avatar } from "./shared";

const uid = () => Math.random().toString(36).slice(2, 9);
const field = "w-full text-base bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400";
const lbl = "block text-sm font-medium text-slate-600 mb-1.5";

// mode "personal": daftar bawaan sendiri (di Profil). mode "shared": barang bersama (tab Bawaan).
export default function PackingTab({ mode = "shared", people, activeIdx, isActive, packing, packCats, setData, meIdx }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [newCat, setNewCat] = useState(null);
  const [catEdit, setCatEdit] = useState(null); // { scope, id, name }

  const personal = mode === "personal";
  const meActive = meIdx !== null && isActive(meIdx);
  const cats = packCats || { shared: [], personal: {} };
  const sharedCats = cats.shared || [];
  const myCats = meActive ? (cats.personal || {})[meIdx] || [] : [];

  const setPacking = (fn) => setData((d) => ({ ...d, packing: fn(d.packing) }));
  const setCats = (fn) => setData((d) => ({ ...d, packCats: fn(d.packCats || { shared: [], personal: {} }) }));

  // ── status ──
  const bringers = (x) => (Array.isArray(x.who) ? x.who : []).filter((j) => isActive(j));
  const sharedDone = (x, j) => !!(x.done && x.done[j]);
  const sharedAllDone = (x) => {
    const a = bringers(x);
    return a.length > 0 && a.every((j) => sharedDone(x, j));
  };
  const mineDone = (x) => (x.type === "shared" ? sharedDone(x, meIdx) : !!x.done);
  const names = (list) => {
    const n = list.map((j) => people[j].name);
    return n.length <= 2 ? n.join(", ") : `${n.slice(0, 2).join(", ")} +${n.length - 2}`;
  };

  const toggle = (x) =>
    setPacking((ps) =>
      ps.map((p) => {
        if (p.id !== x.id) return p;
        if (p.type !== "shared") return { ...p, done: !p.done };
        const done = { ...(p.done || {}) };
        if (done[meIdx]) delete done[meIdx];
        else done[meIdx] = true;
        return { ...p, done };
      }),
    );

  // ── daftar ──
  const groupBy = (items, catList) => {
    const groups = catList.map((c) => ({ cat: c, items: items.filter((x) => x.cat === c.id) })).filter((g) => g.items.length);
    const known = new Set(catList.map((c) => c.id));
    const none = items.filter((x) => !known.has(x.cat));
    if (none.length) groups.push({ cat: null, items: none });
    return groups;
  };
  const byMine = (a, b) => Number(mineDone(a)) - Number(mineDone(b));
  const byAll = (a, b) => Number(sharedAllDone(a)) - Number(sharedAllDone(b));

  const myShared = meActive ? packing.filter((x) => x.type === "shared" && bringers(x).includes(meIdx)).sort(byMine) : [];
  const myPersonal = meActive ? packing.filter((x) => x.type !== "shared" && x.owner === meIdx) : [];
  const sharedItems = packing.filter((x) => x.type === "shared");
  const personalGroups = groupBy(myPersonal, myCats).map((g) => ({ ...g, items: g.items.sort(byMine) }));
  const sharedGroups = groupBy(sharedItems, sharedCats).map((g) => ({ ...g, items: g.items.sort(byAll) }));

  const mineAll = [...myShared, ...myPersonal];
  const mineDoneCount = mineAll.filter(mineDone).length;
  const sharedReady = sharedItems.filter(sharedAllDone).length;

  // ── form barang ──
  const openNew = () => {
    setError("");
    setNewCat(null);
    setDraft({ id: uid(), item: "", type: personal ? "personal" : "shared", who: [], catSel: "", isNew: true });
  };
  const openEdit = (x) => {
    setError("");
    setNewCat(null);
    setDraft({ ...x, who: Array.isArray(x.who) ? [...x.who] : [], catSel: x.cat || "", isNew: false });
  };
  const setD = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const togglePerson = (j) => setDraft((d) => ({ ...d, who: d.who.includes(j) ? d.who.filter((x) => x !== j) : [...d.who, j].sort((a, b) => a - b) }));
  const draftCats = draft ? (draft.type === "shared" ? sharedCats : myCats) : [];

  const createCat = () => {
    const name = (newCat || "").trim();
    if (!name) {
      setNewCat(null);
      return;
    }
    const c = { id: uid(), name };
    if (draft.type === "shared") setCats((pc) => ({ ...pc, shared: [...(pc.shared || []), c] }));
    else setCats((pc) => ({ ...pc, personal: { ...(pc.personal || {}), [meIdx]: [...((pc.personal || {})[meIdx] || []), c] } }));
    setDraft((d) => ({ ...d, catSel: c.id }));
    setNewCat(null);
  };

  const save = () => {
    const name = draft.item.trim();
    if (!name) return setError("Nama barang belum diisi.");
    const x =
      draft.type === "shared"
        ? { id: draft.id, item: name, type: "shared", who: draft.who, cat: draft.catSel || "", done: {} }
        : { id: draft.id, item: name, type: "personal", owner: draft.isNew ? meIdx : draft.owner, cat: draft.catSel || "", done: false };
    setPacking((ps) => {
      const cur = ps.find((p) => p.id === x.id);
      if (!cur) return [...ps, x];
      return ps.map((p) => (p.id === x.id ? { ...x, done: cur.done ?? x.done } : p));
    });
    setDraft(null);
  };
  const remove = () => {
    if (!confirm(`Hapus "${draft.item || "barang ini"}"?`)) return;
    setPacking((ps) => ps.filter((p) => p.id !== draft.id));
    setDraft(null);
  };

  // ── ubah / hapus kategori ──
  const saveCat = () => {
    const name = catEdit.name.trim();
    if (!name) return;
    if (catEdit.scope === "shared") {
      setCats((pc) => ({ ...pc, shared: (pc.shared || []).map((c) => (c.id === catEdit.id ? { ...c, name } : c)) }));
    } else {
      setCats((pc) => ({ ...pc, personal: { ...(pc.personal || {}), [meIdx]: ((pc.personal || {})[meIdx] || []).map((c) => (c.id === catEdit.id ? { ...c, name } : c)) } }));
    }
    setCatEdit(null);
  };
  const deleteCat = () => {
    if (!confirm(`Hapus kategori "${catEdit.name}"?\n\nBarangnya akan dipindahkan ke Belum ada kategori.`)) return;
    const { scope, id } = catEdit;
    setData((d) => {
      const pc = d.packCats || { shared: [], personal: {} };
      if (scope === "shared") {
        return {
          ...d,
          packCats: { ...pc, shared: (pc.shared || []).filter((c) => c.id !== id) },
          packing: d.packing.map((p) => (p.type === "shared" && p.cat === id ? { ...p, cat: "" } : p)),
        };
      }
      return {
        ...d,
        packCats: { ...pc, personal: { ...(pc.personal || {}), [meIdx]: ((pc.personal || {})[meIdx] || []).filter((c) => c.id !== id) } },
        packing: d.packing.map((p) => (p.type !== "shared" && p.owner === meIdx && p.cat === id ? { ...p, cat: "" } : p)),
      };
    });
    setCatEdit(null);
  };

  // ── tampilan ──
  const Progress = ({ text, k, n }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-600">{text}</span>
        <span className="font-semibold text-sky-600">{n ? Math.round((k / n) * 100) : 0}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${n ? (k / n) * 100 : 0}%` }} />
      </div>
    </div>
  );

  const Header = ({ cat, scope, title }) =>
    cat ? (
      <button onClick={() => setCatEdit({ scope, id: cat.id, name: cat.name })} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-1.5 px-1">
        {cat.name} <ChevronRight size={12} className="text-slate-300" />
      </button>
    ) : (
      <div className="text-xs font-semibold text-slate-400 mb-1.5 px-1">{title || "Belum ada kategori"}</div>
    );

  const Row = ({ x }) => {
    const shared = x.type === "shared";
    const canTick = meActive && (shared ? bringers(x).includes(meIdx) : x.owner === meIdx);
    const checked = canTick ? mineDone(x) : shared && sharedAllDone(x);
    let sub = null;
    let warn = false;
    if (shared) {
      const a = bringers(x);
      const k = a.filter((j) => sharedDone(x, j)).length;
      if (!a.length) {
        sub = "Belum ada yang membawa";
        warn = true;
      } else sub = `${names(a)} yang membawa${a.length > 1 ? ` · ${k}/${a.length} sudah` : ""}`;
    }
    return (
      <div className="flex items-center gap-3 px-3 py-2.5">
        {canTick ? (
          <button
            onClick={() => toggle(x)}
            aria-label={checked ? "Belum" : "Sudah"}
            className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition ${checked ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300"}`}
          >
            {checked && <Check size={16} strokeWidth={3} />}
          </button>
        ) : (
          <span className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center ${checked ? "bg-slate-200 border-slate-200 text-white" : "border-dashed border-slate-200"}`}>
            {checked && <Check size={16} strokeWidth={3} />}
          </span>
        )}
        <button onClick={() => openEdit(x)} className="flex-1 min-w-0 text-left">
          <div className={`text-[15px] truncate ${checked ? "line-through text-slate-400" : "text-slate-800"}`}>{x.item || "Tanpa nama"}</div>
          {sub && <div className={`text-xs truncate ${warn ? "text-rose-500" : "text-slate-400"}`}>{sub}</div>}
        </button>
      </div>
    );
  };

  const List = ({ items }) => (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {items.map((x) => (
        <Row key={x.id} x={x} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {personal ? (
        <Progress text={`${mineDoneCount} dari ${mineAll.length} sudah masuk tas`} k={mineDoneCount} n={mineAll.length} />
      ) : (
        <Progress text={`${sharedReady} dari ${sharedItems.length} barang bersama siap`} k={sharedReady} n={sharedItems.length} />
      )}

      <div className="flex justify-end">
        <button onClick={openNew} disabled={personal && !meActive} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-600 disabled:opacity-40">
          <Plus size={16} /> Tambah barang
        </button>
      </div>

      {personal ? (
        <>
          {mineAll.length === 0 && <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-10">Belum ada barang.</div>}
          {myShared.length > 0 && (
            <div>
              <Header title="Barang bersama" />
              <List items={myShared} />
            </div>
          )}
          {personalGroups.map((g) => (
            <div key={g.cat ? g.cat.id : "none"}>
              <Header cat={g.cat} scope="personal" />
              <List items={g.items} />
            </div>
          ))}
        </>
      ) : (
        <>
          {sharedItems.length === 0 && <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-10">Belum ada barang bersama.</div>}
          {sharedGroups.map((g) => (
            <div key={g.cat ? g.cat.id : "none"}>
              <Header cat={g.cat} scope="shared" />
              <List items={g.items} />
            </div>
          ))}
        </>
      )}

      {/* Form barang */}
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
              <input autoFocus={draft.isNew} value={draft.item} onChange={(e) => setD("item", e.target.value)} placeholder="Nama barang" className={field} />
            </div>

            {draft.type === "shared" && (
              <div>
                <label className={lbl}>Siapa yang membawa?</label>
                <div className="flex flex-wrap gap-2">
                  {people
                    .map((_, j) => j)
                    .filter((j) => isActive(j) || draft.who.includes(j))
                    .map((j) => {
                      const on = draft.who.includes(j);
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
            )}

            {(draft.type === "shared" || meActive) && (
              <div>
                <label className={lbl}>
                  Kategori <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {draftCats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setD("catSel", draft.catSel === c.id ? "" : c.id)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition ${draft.catSel === c.id ? "bg-sky-50 text-sky-700 ring-1 ring-sky-300 font-medium" : "bg-slate-50 text-slate-500"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {newCat === null ? (
                    <button onClick={() => setNewCat("")} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-dashed border-sky-300 text-sky-600">
                      <Plus size={14} /> Kategori baru
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        autoFocus
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                        placeholder="Nama kategori"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            createCat();
                          }
                          if (e.key === "Escape") setNewCat(null);
                        }}
                        className={field}
                      />
                      <button onClick={createCat} className="shrink-0 text-sm font-medium text-sky-700 bg-sky-50 px-3 py-2.5 rounded-lg">
                        Tambah
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </Sheet>
      )}

      {/* Ubah kategori */}
      {catEdit && (
        <Sheet
          title="Kategori"
          onClose={() => setCatEdit(null)}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={deleteCat} className="text-sm text-slate-400 hover:text-rose-500 active:text-rose-500 px-2 py-2.5">
                Hapus
              </button>
              <button onClick={() => setCatEdit(null)} className="ml-auto text-sm text-slate-500 px-4 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-100">
                Batal
              </button>
              <button onClick={saveCat} className="text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-600 px-6 py-2.5 rounded-lg">
                Simpan
              </button>
            </div>
          }
        >
          <label className={lbl}>Nama kategori</label>
          <input autoFocus value={catEdit.name} onChange={(e) => setCatEdit((c) => ({ ...c, name: e.target.value }))} className={field} />
        </Sheet>
      )}
    </div>
  );
}
