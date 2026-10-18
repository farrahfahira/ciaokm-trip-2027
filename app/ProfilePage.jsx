"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { CATS, CAT_LABEL, normCat, isFund, num, allShares, Avatar } from "./shared";
import { AmountDialog } from "./MobileViews";
import PackingTab from "./PackingTab";

export default function ProfilePage({
  index,
  isMe,
  people,
  expenses,
  packing,
  packCats,
  activeIdx,
  isActive,
  meIdx,
  monthLabels,
  curIdx,
  monthly,
  personTotal,
  fundShare,
  fmt,
  rateOf,
  homeEps,
  updMonth,
  onSetPaid,
  setData,
  onOpenExpense,
  onSwitchProfile,
  onBack,
}) {
  const [tab, setTab] = useState("save");
  const [amountEdit, setAmountEdit] = useState(null);
  const [undo, setUndo] = useState(null);
  useEffect(() => {
    setTab("save");
  }, [index]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const p = people[index];
  const name = p.name || `Orang ${index + 1}`;
  const splitOf = (e) => e.split.filter((j) => j < people.length);
  const shareHome = (e) => {
    const s = splitOf(e);
    return s.includes(index) ? (num(e.amount) * rateOf(e.cur)) / s.length : 0;
  };

  // ── tabungan ──
  const saved = personTotal(p);
  const fundBal = saved - fundShare[index];
  const state = (v, k) => {
    const a = num(v);
    if (a > 0) return monthly > 0 && a < monthly ? "low" : "paid";
    return k < curIdx ? "missed" : "upcoming";
  };
  const tint = { paid: "text-emerald-700", low: "text-amber-700", missed: "text-rose-500", upcoming: "text-slate-300" };

  // ── pengeluaran ──
  const myShare = expenses.reduce((s, e) => s + shareHome(e), 0);
  const byCat = CATS.map((c) => ({ c, v: expenses.filter((e) => normCat(e.cat) === c).reduce((s, e) => s + shareHome(e), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const theirExpenses = [...expenses].reverse().filter((e) => num(e.amount) > 0 && (splitOf(e).includes(index) || e.paidBy === index));
  const open = allShares(expenses, people.length).filter((s) => !s.paid);
  const totalText = (items) => {
    const t = {};
    items.forEach((d) => (t[d.cur] = (t[d.cur] || 0) + d.amount));
    return Object.entries(t)
      .map(([c, a]) => fmt(a, c))
      .join(" + ");
  };
  const group = (list, key) => {
    const m = new Map();
    list.forEach((d) => {
      if (!m.has(d[key])) m.set(d[key], []);
      m.get(d[key]).push(d);
    });
    return [...m.entries()].map(([other, items]) => ({ other, items, total: totalText(items) }));
  };
  const iPay = group(
    open.filter((d) => d.from === index),
    "to",
  );
  const theyPay = group(
    open.filter((d) => d.to === index),
    "from",
  );
  const payAll = (g) => {
    const items = g.items.map((d) => ({ id: d.e.id, j: d.from }));
    onSetPaid(items, true);
    setUndo(items);
  };

  // ── bawaan ──
  const bringingShared = packing.filter((x) => x.type === "shared" && Array.isArray(x.who) && x.who.includes(index));
  const personalItems = packing.filter((x) => x.type !== "shared" && x.owner === index);
  const packTotal = bringingShared.length + personalItems.length;
  const packDone = bringingShared.filter((x) => x.done && x.done[index]).length + personalItems.filter((x) => x.done).length;

  const tabs = [
    { id: "save", label: "Tabungan", on: "bg-emerald-500 text-white" },
    { id: "spend", label: "Pengeluaran", on: "bg-amber-500 text-white", badge: iPay.length + theyPay.length },
    { id: "pack", label: "Bawaan", on: "bg-sky-500 text-white", progress: packTotal ? `${packDone}/${packTotal}` : "" },
  ];

  const DebtCard = ({ title, groups, out, empty }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-600 mb-2">{title}</div>
      {groups.length === 0 ? (
        <div className="text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map((g) => (
            <div key={g.other} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 text-sm">
                <Avatar name={people[g.other].name} i={g.other} photo={people[g.other].photo} size="w-6 h-6 text-xs" />
                <span className="font-medium text-slate-800 truncate">{people[g.other].name}</span>
                <span className={`ml-auto font-semibold ${out ? "text-rose-600" : "text-emerald-700"}`}>{g.total}</span>
                {isMe && (
                  <button onClick={() => payAll(g)} className="text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 active:bg-emerald-50 px-2.5 py-1.5 rounded-md">
                    Lunas
                  </button>
                )}
              </div>
              <div className="mt-1 ml-8 space-y-0.5">
                {g.items.map((d) => (
                  <button key={`${d.e.id}-${d.from}`} onClick={() => onOpenExpense(d.e.id)} className="w-full flex justify-between gap-3 text-xs text-slate-500 hover:text-indigo-600">
                    <span className="truncate">{d.e.item || "Tanpa nama"}</span>
                    <span className="shrink-0">{fmt(d.amount, d.cur)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {onBack && (
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-2 -ml-3 rounded-lg">
          <ArrowLeft size={15} /> Kembali
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar name={p.name} i={index} photo={p.photo} size="w-14 h-14 text-xl" className={p.removed ? "grayscale opacity-60" : ""} />
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold text-slate-800 truncate">{name}</div>
          <div className={`text-sm ${Math.abs(fundBal) < homeEps ? "text-slate-400" : fundBal > 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {Math.abs(fundBal) < homeEps ? "Saldo kas pas" : fundBal > 0 ? `Sisa di kas +${fmt(fundBal)}` : `Perlu menambah ${fmt(-fundBal)} ke kas`}
          </div>
          {p.removed && <div className="text-xs text-slate-400">Sudah keluar dari trip</div>}
        </div>
        {isMe && (
          <button onClick={onSwitchProfile} className="shrink-0 text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 active:bg-slate-50 px-3 py-2 rounded-lg">
            Ganti profil
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? t.on : "text-slate-500 hover:bg-slate-50"}`}>
            {t.label}
            {t.badge > 0 && <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? "bg-white/25" : "bg-rose-100 text-rose-600"}`}>{t.badge}</span>}
            {t.progress && <span className={`text-[11px] ${tab === t.id ? "text-white/80" : "text-slate-400"}`}>{t.progress}</span>}
          </button>
        ))}
      </div>

      {/* ── Tabungan ── */}
      {tab === "save" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Total tabungan</div>
            <div className="text-3xl font-bold text-slate-800 mt-0.5">{fmt(saved)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 divide-y divide-slate-100">
            {monthLabels.map((m, k) => {
              const v = p.months[k];
              const st = state(v, k);
              const has = num(v) > 0;
              return (
                <div key={k} className={`flex items-center gap-3 py-3 ${k === curIdx ? "bg-emerald-50/70 -mx-4 px-4" : ""}`}>
                  <div className="flex-1 text-sm text-slate-600">
                    {m.short} '{m.year}
                    {k === curIdx && <span className="ml-2 text-[11px] font-medium text-emerald-700">bulan ini</span>}
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${tint[st]}`}>{has ? fmt(v) : st === "missed" ? "Terlewat" : "–"}</span>
                  {isMe && (
                    <button
                      onClick={() => setAmountEdit(k)}
                      className={`w-16 shrink-0 text-xs font-medium py-2 rounded-lg ${has ? "text-slate-500 bg-slate-100 active:bg-slate-200" : "text-emerald-700 bg-emerald-50 active:bg-emerald-100"}`}
                    >
                      {has ? "Ubah" : "Isi"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pengeluaran ── */}
      {tab === "spend" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Total pengeluaran</div>
            <div className="text-3xl font-bold text-slate-800 mt-0.5">{fmt(myShare)}</div>
            {byCat.length > 0 && (
              <div className="space-y-2 mt-4">
                {byCat.map(({ c, v }) => (
                  <div key={c} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-slate-500 truncate">{CAT_LABEL[c]}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${myShare ? (v / myShare) * 100 : 0}%` }} />
                    </div>
                    <span className="w-28 text-right font-medium text-slate-700">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DebtCard title={`${name} bayar ke`} groups={iPay} out empty="Tidak ada utang" />
          <DebtCard title={`Bayar ke ${name}`} groups={theyPay} empty={`Tidak ada yang berutang ke ${name}`} />

          {undo && (
            <div className="flex items-center gap-3 text-sm bg-slate-800 text-white rounded-lg px-4 py-2.5">
              <Check size={15} className="text-emerald-300" /> Ditandai lunas
              <button
                onClick={() => {
                  onSetPaid(undo, false);
                  setUndo(null);
                }}
                className="ml-auto font-medium text-amber-300"
              >
                Batalkan
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-4 pt-4 pb-1 text-sm font-semibold text-slate-600">Semua pengeluaran {name}</div>
            {theirExpenses.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-slate-400">Belum ada pengeluaran.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {theirExpenses.map((e) => {
                  const s = splitOf(e);
                  const inSplit = s.includes(index);
                  const payer = isFund(e) ? "Dibayar dengan kas" : e.paidBy === index ? `${name} yang membayar` : `${people[e.paidBy]?.name || "?"} yang membayar`;
                  return (
                    <button key={e.id} onClick={() => onOpenExpense(e.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">{e.item || "Tanpa nama"}</div>
                        <div className="text-xs text-slate-400 truncate">{payer}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-slate-700">{inSplit ? fmt(num(e.amount) / s.length, e.cur) : "–"}</div>
                        {!inSplit && <div className="text-[11px] text-slate-400">menalangi</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bawaan ── */}
      {tab === "pack" &&
        (isMe ? (
          <PackingTab mode="personal" people={people} activeIdx={activeIdx} isActive={isActive} packing={packing} packCats={packCats} setData={setData} meIdx={meIdx} />
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-2">Barang bersama</div>
              {bringingShared.length === 0 ? (
                <div className="text-sm text-slate-400">Tidak ada.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bringingShared.map((x) => {
                    const done = !!(x.done && x.done[index]);
                    return (
                      <span key={x.id} className={`text-sm px-3 py-1 rounded-full ${done ? "bg-sky-50 text-sky-700 line-through" : "bg-slate-100 text-slate-700"}`}>
                        {x.item || "Tanpa nama"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
              {personalItems.length ? `${personalItems.filter((x) => x.done).length} dari ${personalItems.length} barang pribadi sudah masuk tas` : "Belum ada barang pribadi."}
            </div>
          </div>
        ))}

      {amountEdit !== null && (
        <AmountDialog
          title={`Setoran ${name}`}
          subtitle={`${monthLabels[amountEdit].short} '${monthLabels[amountEdit].year}`}
          value={p.months[amountEdit] ?? ""}
          monthly={monthly}
          fmt={fmt}
          onSave={(nv) => updMonth(index, amountEdit, nv)}
          onClose={() => setAmountEdit(null)}
        />
      )}
    </div>
  );
}
