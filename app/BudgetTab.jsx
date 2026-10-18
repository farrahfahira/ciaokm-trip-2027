"use client";

import { useEffect, useState } from "react";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import ExpensePage from "./ExpensePage";
import { CATS, CAT_LABEL, CAT_TINT, FUND, num, isFund, normCat, sharesOf, Avatar, MoneyInput } from "./shared";

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Form tambah / ubah pengeluaran ──
function ExpenseEditor({ draft, setDraft, error, people, activeIdx, isActive, currencies, fmt, onSave, onDelete, onClose }) {
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const set = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const split = draft.split.filter((j) => j < people.length);
  const shown = people.map((_, j) => j).filter((j) => isActive(j) || draft.split.includes(j));
  const payers = people.map((_, j) => j).filter((j) => isActive(j) || draft.paidBy === j);
  const toggle = (j) => setDraft((d) => ({ ...d, split: d.split.includes(j) ? d.split.filter((x) => x !== j) : [...d.split, j].sort((a, b) => a - b) }));
  const everyone = () => setDraft((d) => ({ ...d, split: [...new Set([...d.split.filter((x) => !isActive(x)), ...activeIdx])].sort((a, b) => a - b) }));
  const label = "block text-sm font-medium text-slate-600 mb-1.5";
  const field = "w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-5 space-y-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-800">{draft.isNew ? "Tambah pengeluaran" : "Ubah pengeluaran"}</div>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className={label}>Buat apa?</label>
          <input autoFocus={draft.isNew} value={draft.item} onChange={(ev) => set("item", ev.target.value)} placeholder="Makan malam di pasar malam" className={field} />
        </div>

        <div>
          <label className={label}>Kategori</label>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => set("cat", c)}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${normCat(draft.cat) === c ? `${CAT_TINT[c]} ring-1 ring-current font-medium` : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
              >
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Berapa?</label>
          <div className="flex gap-2">
            <select value={draft.cur} onChange={(ev) => set("cur", ev.target.value)} className="text-sm font-semibold bg-slate-100 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer">
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code || "?"}
                </option>
              ))}
            </select>
            <MoneyInput value={draft.amount} onChange={(v) => set("amount", v)} placeholder="0" className={field} />
          </div>
        </div>

        <div>
          <label className={label}>Siapa yang bayar?</label>
          <select value={draft.paidBy} onChange={(ev) => set("paidBy", Number(ev.target.value))} className={`${field} cursor-pointer`}>
            <option value={FUND}>Kas (tabungan bareng)</option>
            {payers.map((j) => (
              <option key={j} value={j}>
                {people[j].name}
                {people[j].removed ? " (udah keluar)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-600">Dibagi ke siapa?</span>
            <div className="flex gap-1 text-xs">
              <button onClick={everyone} className="px-2 py-1 rounded-md text-amber-700 hover:bg-amber-50">
                Semua
              </button>
              <button onClick={() => set("split", [])} className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100">
                Kosongkan
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {shown.map((j) => {
              const on = draft.split.includes(j);
              return (
                <button
                  key={j}
                  onClick={() => toggle(j)}
                  className={`inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border text-sm transition ${on ? "border-amber-300 bg-amber-50 text-slate-800" : "border-slate-200 text-slate-400"}`}
                >
                  <Avatar name={people[j].name} i={j} photo={people[j].photo} size="w-6 h-6 text-xs" className={on ? "" : "opacity-40 grayscale"} />
                  {people[j].name}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-500 mt-2">{split.length ? `${split.length} orang, ${fmt(num(draft.amount) / split.length, draft.cur)} per orang` : "Belum ada yang dipilih"}</div>
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {!draft.isNew && (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg">
              <Trash2 size={15} /> Hapus
            </button>
          )}
          <button onClick={onClose} className="ml-auto text-sm text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg">
            Batal
          </button>
          <button onClick={onSave} className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 px-5 py-2 rounded-lg">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetTab({
  people,
  expenses,
  currencies,
  home,
  fmt,
  rateOf,
  activeIdx,
  isActive,
  totalHome,
  fundSpent,
  fundLeft,
  missingRate,
  meIdx,
  setData,
  updCur,
  delCur,
  expenseId,
  openExpense,
  closeExpense,
  openMember,
  onSetPaid,
}) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const meActive = meIdx !== null && isActive(meIdx);
  const homeOf = (e) => num(e.amount) * rateOf(e.cur);

  // ── form ──
  const blank = () => ({
    id: uid(),
    cat: "Food",
    item: "",
    amount: "",
    cur: currencies[currencies.length > 1 ? 1 : 0].code,
    paidBy: meActive ? meIdx : (activeIdx[0] ?? 0),
    split: [...activeIdx],
    settled: false,
    paid: {},
    isNew: true,
  });
  const openEditor = (exp) => {
    setError("");
    setEditing(exp);
  };
  const saveExpense = () => {
    const d = editing;
    if (!String(d.item || "").trim()) return setError("Isi namanya dulu.");
    if (num(d.amount) <= 0) return setError("Isi jumlahnya.");
    if (!d.split.filter((j) => j < people.length).length) return setError("Pilih minimal satu orang.");
    const { isNew, ...exp } = d;
    const before = expenses.find((x) => x.id === exp.id);
    if (before && before.paidBy !== exp.paidBy) {
      exp.paid = {};
      exp.settled = false;
    } // ganti yang bayar = tanda lunas direset
    setData((s) => ({
      ...s,
      expenses: s.expenses.some((x) => x.id === exp.id) ? s.expenses.map((x) => (x.id === exp.id ? exp : x)) : [...s.expenses, exp],
    }));
    setEditing(null);
  };
  const removeExpense = (exp) => {
    if (!confirm(`Hapus "${exp.item || "pengeluaran ini"}"?`)) return false;
    setData((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== exp.id) }));
    return true;
  };
  const deleteFromEditor = () => {
    const id = editing.id;
    if (!removeExpense(editing)) return;
    setEditing(null);
    if (expenseId === id) closeExpense();
  };

  const editor = editing && (
    <ExpenseEditor
      draft={editing}
      setDraft={setEditing}
      error={error}
      people={people}
      activeIdx={activeIdx}
      isActive={isActive}
      currencies={currencies}
      fmt={fmt}
      onSave={saveExpense}
      onDelete={deleteFromEditor}
      onClose={() => setEditing(null)}
    />
  );

  // ── halaman satu pengeluaran ──
  if (expenseId) {
    const exp = expenses.find((x) => x.id === expenseId);
    return (
      <>
        {exp ? (
          <ExpensePage
            expense={exp}
            people={people}
            fmt={fmt}
            onBack={closeExpense}
            onEdit={() => openEditor({ ...exp, paid: { ...(exp.paid || {}) } })}
            onDelete={() => {
              if (removeExpense(exp)) closeExpense();
            }}
            onSetPaid={onSetPaid}
            onOpenMember={openMember}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">Pengeluaran ini udah dihapus.</p>
            <button onClick={closeExpense} className="text-sm font-medium text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg">
              Kembali
            </button>
          </div>
        )}
        {editor}
      </>
    );
  }

  // ── daftar ──
  const groups = CATS.map((c) => ({ c, items: [...expenses].reverse().filter((e) => normCat(e.cat) === c) })).filter((g) => g.items.length);
  const statusOf = (e) => {
    if (isFund(e)) return { text: "Kas", cls: "text-emerald-600" };
    const sh = sharesOf(e, people.length);
    if (!sh.length) return null;
    const k = sh.filter((x) => x.paid).length;
    return k === sh.length ? { text: "Lunas", cls: "text-emerald-600" } : { text: `${k}/${sh.length} lunas`, cls: "text-amber-600" };
  };
  const subOf = (e) => {
    const split = e.split.filter((j) => j < people.length);
    const payer = isFund(e) ? "Pakai kas" : `${people[e.paidBy]?.name || "?"} bayar`;
    const everyone = activeIdx.length > 1 && activeIdx.every((j) => split.includes(j)) && split.length === activeIdx.length;
    return `${payer}, ${everyone ? "dibagi semua" : `dibagi ${split.length} orang`}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Total pengeluaran</div>
            <div className="text-3xl font-bold text-slate-800 mt-0.5">{fmt(totalHome)}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400 mt-1">
              <span>Dari kas {fmt(fundSpent)}</span>
              <span className={fundLeft < 0 ? "text-rose-500" : ""}>{fundLeft < 0 ? `Kas kurang ${fmt(-fundLeft)}` : `Sisa kas ${fmt(fundLeft)}`}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => openEditor(blank())} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600">
              <Plus size={16} /> Tambah
            </button>
            <button onClick={() => setShowSettings((v) => !v)} title="Mata uang" className={`p-2 rounded-lg transition ${showSettings ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <div className="text-sm font-medium text-slate-600 mb-1">Mata uang & kurs</div>
            {currencies.map((c, ci) => (
              <div key={c.id || ci} className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  value={c.code}
                  onChange={(ev) => updCur(ci, "code", ev.target.value.toUpperCase())}
                  placeholder="KODE"
                  className="w-16 font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <input
                  value={c.symbol}
                  onChange={(ev) => updCur(ci, "symbol", ev.target.value)}
                  placeholder="Simbol"
                  className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {ci === 0 ? (
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">Mata uang utama</span>
                ) : (
                  <>
                    <span className="text-xs text-slate-500">1 {c.code || "?"} =</span>
                    <MoneyInput value={c.rate} onChange={(v) => updCur(ci, "rate", v)} placeholder="kurs" className="w-28 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    <span className="text-xs text-slate-500">{home.code}</span>
                    <button onClick={() => delCur(ci)} title="Hapus" className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={() => setData((d) => ({ ...d, currencies: [...d.currencies, { id: uid(), code: "", symbol: "", rate: "" }] }))}
              className="inline-flex items-center gap-1 text-sm text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-md"
            >
              <Plus size={14} /> Tambah mata uang
            </button>
          </div>
        )}
        {missingRate && <p className="text-xs text-rose-500 mt-3">Ada mata uang yang belum ada kursnya, jadi totalnya belum akurat.</p>}
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-400 mb-3">Belum ada pengeluaran.</p>
          <button onClick={() => openEditor(blank())} className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg">
            <Plus size={15} /> Tambah pengeluaran
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-6">
          {groups.map(({ c, items }) => (
            <div key={c}>
              <div className="flex items-baseline justify-between pb-1.5 border-b border-slate-100">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${CAT_TINT[c]}`}>{CAT_LABEL[c]}</span>
                <span className="text-sm text-slate-400">{fmt(items.reduce((s, e) => s + homeOf(e), 0))}</span>
              </div>
              {items.map((e) => {
                const st = statusOf(e);
                const n = e.split.filter((j) => j < people.length).length;
                return (
                  <button key={e.id} onClick={() => openExpense(e.id)} className="w-full flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{e.item || "Tanpa nama"}</div>
                      <div className="text-xs text-slate-400 truncate">{subOf(e)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-slate-800">{fmt(e.amount, e.cur)}</div>
                      <div className="text-[11px]">{st ? <span className={st.cls}>{st.text}</span> : n > 1 && <span className="text-slate-400">{fmt(num(e.amount) / n, e.cur)} per orang</span>}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {editor}
    </div>
  );
}
