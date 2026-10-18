"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { CATS, CAT_LABEL, CAT_TINT, normCat, isFund, num, fmtDay, allShares, Avatar } from "./shared";

const Box = ({ label, value, tone = "slate" }) => {
  const tones = { slate: "bg-slate-50 text-slate-800", green: "bg-emerald-50 text-emerald-700", red: "bg-rose-50 text-rose-600" };
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className={`text-xs ${tone === "slate" ? "text-slate-500" : ""}`}>{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
};

const Section = ({ title, right, children }) => (
  <section>
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

export default function MemberPage({ index, people, expenses, packing, monthLabels, curIdx, monthly, monthsOf, personTotal, fundShare, fmt, rateOf, homeEps, onSetPaid, onRename, onOpenMember, onOpenExpense, onBack }) {
  const [showPaid, setShowPaid] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [undo, setUndo] = useState(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const p = people[index];
  const name = p.name || `Orang ${index + 1}`;
  const nameOf = (i) => people[i]?.name || "Seseorang";
  const splitOf = (e) => e.split.filter((j) => j < people.length);
  const shareHome = (e) => {
    const s = splitOf(e);
    return s.includes(index) ? (num(e.amount) * rateOf(e.cur)) / s.length : 0;
  };

  // ── angka ──
  const saved = personTotal(p);
  const myShare = expenses.reduce((s, e) => s + shareHome(e), 0);
  const fundBal = saved - fundShare[index];
  const byCat = CATS.map((c) => ({ c, v: expenses.filter((e) => normCat(e.cat) === c).reduce((s, e) => s + shareHome(e), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const theirExpenses = [...expenses].reverse().filter((e) => num(e.amount) > 0 && (splitOf(e).includes(index) || e.paidBy === index));

  // ── utang ──
  const shares = allShares(expenses, people.length);
  const open = shares.filter((s) => !s.paid);
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
  const paid = shares.filter((s) => s.paid && (s.from === index || s.to === index));

  const payAll = (g) => {
    const items = g.items.map((d) => ({ id: d.e.id, j: d.from }));
    onSetPaid(items, true);
    setUndo(items);
  };
  const markText = (d) => {
    if (!d.mark) return "lunas dari sebelumnya";
    const who = d.mark.by != null && people[d.mark.by] ? `ditandai ${people[d.mark.by].name}` : "ditandai";
    return d.mark.at ? `${who}, ${fmtDay(d.mark.at)}` : who;
  };

  // ── bawaan ──
  const bringing = packing.filter((x) => x.who === p.name);
  const sharedItems = packing.filter((x) => x.who === "Everyone").length;

  const PersonBtn = ({ i }) => (
    <button onClick={() => onOpenMember(i)} className="inline-flex items-center gap-2 min-w-0 hover:text-indigo-600">
      <Avatar name={people[i].name} i={i} photo={people[i].photo} size="w-6 h-6 text-xs" />
      <span className="font-medium truncate">{people[i].name}</span>
    </button>
  );

  const DebtGroup = ({ g, out }) => (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 text-sm">
        <PersonBtn i={g.other} />
        <span className={`ml-auto font-semibold ${out ? "text-rose-600" : "text-emerald-700"}`}>{g.total}</span>
        <button onClick={() => payAll(g)} className="text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-md">
          Lunas
        </button>
      </div>
      <div className="mt-1.5 ml-8 space-y-0.5">
        {g.items.map((d) => (
          <button key={`${d.e.id}-${d.from}`} onClick={() => onOpenExpense(d.e.id)} className="w-full flex justify-between gap-3 text-xs text-slate-500 hover:text-indigo-600">
            <span className="truncate">{d.e.item || "Tanpa nama"}</span>
            <span className="shrink-0">{fmt(d.amount, d.cur)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-8">
      {/* Header */}
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 -ml-3 rounded-lg mb-3">
          <ArrowLeft size={15} /> Kembali
        </button>
        <div className="flex items-center gap-3">
          <Avatar name={p.name} i={index} photo={p.photo} size="w-12 h-12 text-lg" className={p.removed ? "grayscale opacity-60" : ""} />
          <input
            value={p.name}
            onChange={(e) => onRename(e.target.value)}
            className="flex-1 min-w-0 text-2xl font-bold text-slate-800 bg-transparent px-2 py-1 rounded-md hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        {p.removed && <p className="text-xs text-slate-400 mt-2">Udah keluar dari trip</p>}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Box label="Tabungan" value={fmt(saved)} />
        <Box label={`Bagian ${name}`} value={fmt(myShare)} />
        {Math.abs(fundBal) < homeEps ? <Box label="Kas" value="Pas" /> : fundBal > 0 ? <Box tone="green" label="Sisa di kas" value={`+${fmt(fundBal)}`} /> : <Box tone="red" label="Perlu nambah ke kas" value={fmt(-fundBal)} />}
      </div>

      {/* Utang */}
      {iPay.length === 0 && theyPay.length === 0 ? (
        <div className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center">Nggak ada utang</div>
      ) : (
        <div className="space-y-5">
          {iPay.length > 0 && (
            <Section title={`${name} bayar ke`}>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                {iPay.map((g) => (
                  <DebtGroup key={g.other} g={g} out />
                ))}
              </div>
            </Section>
          )}
          {theyPay.length > 0 && (
            <Section title={`Bayar ke ${name}`}>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                {theyPay.map((g) => (
                  <DebtGroup key={g.other} g={g} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {undo && (
        <div className="flex items-center gap-3 text-sm bg-slate-800 text-white rounded-lg px-4 py-2.5 -mt-4">
          <Check size={15} className="text-emerald-300" /> Ditandai lunas
          <button
            onClick={() => {
              onSetPaid(undo, false);
              setUndo(null);
            }}
            className="ml-auto font-medium text-amber-300 hover:text-amber-200"
          >
            Batalkan
          </button>
        </div>
      )}

      {paid.length > 0 && (
        <div className="-mt-4">
          <button onClick={() => setShowPaid((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <Check size={14} className="text-emerald-500" /> {paid.length} udah lunas
            <ChevronDown size={14} className={`transition ${showPaid ? "rotate-180" : ""}`} />
          </button>
          {showPaid && (
            <div className="mt-2 divide-y divide-slate-100">
              {paid.map((d) => (
                <div key={`${d.e.id}-${d.from}`} className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="font-medium text-slate-700">{nameOf(d.from)}</span> ke <span className="font-medium text-slate-700">{nameOf(d.to)}</span>
                      <button onClick={() => onOpenExpense(d.e.id)} className="ml-1.5 hover:text-indigo-600">
                        · {d.e.item || "Tanpa nama"}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400">{markText(d)}</div>
                  </div>
                  <span className="shrink-0">{fmt(d.amount, d.cur)}</span>
                  {d.mark && (
                    <button
                      onClick={() => {
                        if (confirm(`${nameOf(d.from)} belum bayar?`)) onSetPaid([{ id: d.e.id, j: d.from }], false);
                      }}
                      className="text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-md"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pengeluaran */}
      <Section title="Pengeluaran">
        {byCat.length === 0 ? (
          <div className="text-sm text-slate-400">Belum ada pengeluaran yang melibatkan {name}.</div>
        ) : (
          <>
            <div className="space-y-2">
              {byCat.map(({ c, v }) => (
                <div key={c} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md w-28 text-center ${CAT_TINT[c]}`}>{CAT_LABEL[c]}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${myShare ? (v / myShare) * 100 : 0}%` }} />
                  </div>
                  <span className="w-28 text-right font-medium">{fmt(v)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAll((v) => !v)} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mt-3">
              {showAll ? "Sembunyikan" : `Lihat semua (${theirExpenses.length})`}
              <ChevronDown size={14} className={`transition ${showAll ? "rotate-180" : ""}`} />
            </button>
            {showAll && (
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 mt-2">
                {theirExpenses.map((e) => {
                  const s = splitOf(e);
                  const inSplit = s.includes(index);
                  const payer = isFund(e) ? "Pakai kas" : e.paidBy === index ? `${name} yang bayar` : `${nameOf(e.paidBy)} yang bayar`;
                  return (
                    <button key={e.id} onClick={() => onOpenExpense(e.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">{e.item || "Tanpa nama"}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {payer}, total {fmt(e.amount, e.cur)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-slate-700">{inSplit ? fmt(num(e.amount) / s.length, e.cur) : "–"}</div>
                        <div className="text-[11px] text-slate-400">{inSplit ? "bagiannya" : "nalangin"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Tabungan per bulan */}
      <Section title="Tabungan per bulan" right={monthly > 0 && <span className="text-xs text-slate-400">Minimal {fmt(monthly)}/bulan</span>}>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {monthsOf(p).map((v, k) => {
            const amt = num(v);
            const state = amt > 0 ? (monthly > 0 && amt < monthly ? "low" : "paid") : k < curIdx ? "missed" : "upcoming";
            const style = {
              paid: "bg-emerald-50 text-emerald-700",
              low: "bg-amber-50 text-amber-700",
              missed: "bg-rose-50 text-rose-600",
              upcoming: "bg-slate-50 text-slate-400",
            }[state];
            return (
              <div key={k} className={`rounded-lg px-2.5 py-2 ${style} ${k === curIdx ? "ring-2 ring-emerald-300" : ""}`}>
                <div className="text-[11px] opacity-80">
                  {monthLabels[k].short} '{monthLabels[k].year}
                </div>
                <div className="text-sm font-semibold">{amt > 0 ? fmt(amt) : state === "missed" ? "Bolong" : "–"}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bawaan */}
      <Section title="Bawaan">
        {bringing.length === 0 ? (
          <div className="text-sm text-slate-400">Belum ada{sharedItems ? `, selain ${sharedItems} barang yang dibawa semua orang` : ""}.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bringing.map((x) => (
              <span key={x.id || x.item} className={`text-sm px-3 py-1 rounded-full ${x.done ? "bg-sky-50 text-sky-700 line-through" : "bg-slate-100 text-slate-700"}`}>
                {x.item || "Tanpa nama"}
              </span>
            ))}
            {sharedItems > 0 && <span className="text-sm text-slate-400 px-1 py-1">+ {sharedItems} barang bareng</span>}
          </div>
        )}
      </Section>
    </div>
  );
}
