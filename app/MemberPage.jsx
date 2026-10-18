"use client";

import { ArrowLeft, Check } from "lucide-react";
import { CATS, CAT_TINT, normCat, isFund, num, Avatar } from "./shared";

const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

const Section = ({ title, right, children }) => (
  <section>
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const Box = ({ label, value, sub, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-50 text-slate-800",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-600",
  };
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className={`text-xs ${tone === "slate" ? "text-slate-500" : ""}`}>{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${tone === "slate" ? "text-slate-400" : "opacity-80"}`}>{sub}</div>}
    </div>
  );
};

export default function MemberPage({
  index,
  people,
  expenses,
  packing,
  payments,
  monthLabels,
  curIdx,
  monthly,
  monthsOf,
  personTotal,
  fundShare,
  fmt,
  rateOf,
  homeEps,
  settleData,
  onMarkPaid,
  onDeletePayment,
  onRename,
  onOpenMember,
  onBack,
}) {
  const p = people[index];
  const name = p.name || `Person ${index + 1}`;
  const nameOf = (i) => people[i]?.name || "Someone";
  const splitOf = (e) => e.split.filter((j) => j < people.length);
  const shareHome = (e) => {
    const s = splitOf(e);
    return s.includes(index) ? (num(e.amount) * rateOf(e.cur)) / s.length : 0;
  };

  // ── numbers ──
  const saved = personTotal(p);
  const tripCost = expenses.reduce((s, e) => s + shareHome(e), 0);
  const paidOut = expenses.filter((e) => e.paidBy === index).reduce((s, e) => s + num(e.amount) * rateOf(e.cur), 0);
  const fundBal = saved - fundShare[index];
  const byCat = CATS.map((c) => ({ c, v: expenses.filter((e) => normCat(e.cat) === c).reduce((s, e) => s + shareHome(e), 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const theirExpenses = expenses.filter((e) => num(e.amount) > 0 && (splitOf(e).includes(index) || e.paidBy === index));

  // ── settling ──
  const pending = settleData.flatMap((g) => g.tr.filter((t) => t.from === index || t.to === index).map((t) => ({ ...t, g })));
  const owes = pending.filter((t) => t.from === index).reduce((s, t) => s + t.amt * rateOf(t.g.fmtCode), 0);
  const gets = pending.filter((t) => t.to === index).reduce((s, t) => s + t.amt * rateOf(t.g.fmtCode), 0);
  const done = payments.filter((x) => x.from === index || x.to === index).sort((a, b) => (b.at || 0) - (a.at || 0));

  // ── packing ──
  const bringing = packing.filter((x) => x.who === p.name);
  const sharedItems = packing.filter((x) => x.who === "Everyone").length;

  const NameBtn = ({ i }) => (
    <button onClick={() => onOpenMember(i)} className="font-medium text-slate-800 hover:text-indigo-600 hover:underline underline-offset-2">
      {nameOf(i)}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-8">
      {/* Header */}
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 -ml-3 rounded-lg mb-3">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          <Avatar name={p.name} i={index} photo={p.photo} size="w-12 h-12 text-lg" className={p.removed ? "grayscale opacity-60" : ""} />
          <input
            value={p.name}
            onChange={(e) => onRename(e.target.value)}
            className="flex-1 min-w-0 text-2xl font-bold text-slate-800 bg-transparent px-2 py-1 rounded-md hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Box label="Saved" value={fmt(saved)} sub="From the Save tab" />
        <Box label={`Trip cost for ${name}`} value={fmt(tripCost)} sub="Their share of every expense" />
        <Box label="Paid out of pocket" value={fmt(paidOut)} sub="Things they paid for" />
        {Math.abs(fundBal) < homeEps ? (
          <Box label="Group fund" value="Even" sub="Nothing left, nothing owed" />
        ) : fundBal > 0 ? (
          <Box tone="green" label="Left in group fund" value={`+${fmt(fundBal)}`} sub="Comes back to them at the end" />
        ) : (
          <Box tone="red" label="Group fund" value={`Top up ${fmt(-fundBal)}`} sub="Their share went past their savings" />
        )}
      </div>

      {/* To settle */}
      <Section
        title="To settle"
        right={
          (owes > homeEps || gets > homeEps) && (
            <span className="text-xs text-slate-400">
              {owes > homeEps && <>Owes {fmt(owes)}</>}
              {owes > homeEps && gets > homeEps && " · "}
              {gets > homeEps && <>Gets back {fmt(gets)}</>}
            </span>
          )
        }
      >
        {pending.length === 0 ? (
          <div className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center">{name} doesn't owe anyone and isn't owed anything right now ✓</div>
        ) : (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {pending.map((t, k) => (
              <div key={k} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-sm">
                {t.from === index ? (
                  <>
                    <span className="text-slate-500">Pays</span> <NameBtn i={t.to} />
                  </>
                ) : (
                  <>
                    <NameBtn i={t.from} /> <span className="text-slate-500">pays {name}</span>
                  </>
                )}
                <span className={`ml-auto font-semibold ${t.from === index ? "text-rose-600" : "text-emerald-700"}`}>{fmt(t.amt, t.g.fmtCode)}</span>
                <button onClick={() => onMarkPaid(t, t.g)} className="text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-md">
                  Mark paid
                </button>
              </div>
            ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-slate-400 mb-1">Already paid</div>
            <div className="divide-y divide-slate-100">
              {done.map((x) => (
                <div key={x.id} className="flex items-center gap-2 py-2 text-sm text-slate-500">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {x.from === index ? (
                      <>
                        Paid <NameBtn i={x.to} />
                      </>
                    ) : (
                      <>
                        <NameBtn i={x.from} /> paid {name}
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">{fmtDate(x.at)}</span>
                  <span className="ml-auto font-medium">{fmt(x.amount, x.cur)}</span>
                  <button onClick={() => onDeletePayment(x.id)} className="text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-md">
                    Undo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Where their money went */}
      <Section title={`Where ${name}'s money went`}>
        {byCat.length === 0 ? (
          <div className="text-sm text-slate-400">No expenses include {name} yet.</div>
        ) : (
          <div className="space-y-2">
            {byCat.map(({ c, v }) => (
              <div key={c} className="flex items-center gap-3 text-sm">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md w-24 text-center ${CAT_TINT[c]}`}>{c}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${tripCost ? (v / tripCost) * 100 : 0}%` }} />
                </div>
                <span className="w-28 text-right font-medium">{fmt(v)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Expense list */}
      {theirExpenses.length > 0 && (
        <Section title="Expenses" right={<span className="text-xs text-slate-400">{theirExpenses.length} total</span>}>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {theirExpenses.map((e) => {
              const s = splitOf(e);
              const inSplit = s.includes(index);
              const cat = normCat(e.cat);
              const payer = isFund(e) ? "Paid from group fund" : e.paidBy === index ? `Paid by ${name}` : `Paid by ${nameOf(e.paidBy)}`;
              return (
                <div key={e.id} className={`flex items-center gap-3 px-3 py-2.5 ${e.settled ? "opacity-50" : ""}`}>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${CAT_TINT[cat]}`}>{cat}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{e.item || "Untitled expense"}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {payer} · {fmt(e.amount, e.cur)} total · split {s.length} way{s.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-slate-700">{inSplit ? fmt(num(e.amount) / s.length, e.cur) : "—"}</div>
                    <div className="text-[11px] text-slate-400">{inSplit ? "their share" : "paid for others"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Savings by month */}
      <Section title="Savings by month" right={monthly > 0 && <span className="text-xs text-slate-400">Minimum {fmt(monthly)} / month</span>}>
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
                <div className="text-sm font-semibold">{amt > 0 ? fmt(amt) : state === "missed" ? "Missed" : "–"}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bringing */}
      <Section title="Bringing">
        {bringing.length === 0 ? (
          <div className="text-sm text-slate-400">Nothing assigned yet{sharedItems ? `, plus ${sharedItems} item${sharedItems === 1 ? "" : "s"} everyone brings` : ""}.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bringing.map((x) => (
              <span key={x.id || x.item} className={`text-sm px-3 py-1 rounded-full ${x.done ? "bg-sky-50 text-sky-700 line-through" : "bg-slate-100 text-slate-700"}`}>
                {x.item || "Unnamed item"}
              </span>
            ))}
            {sharedItems > 0 && (
              <span className="text-sm text-slate-400 px-1 py-1">
                + {sharedItems} item{sharedItems === 1 ? "" : "s"} everyone brings
              </span>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
