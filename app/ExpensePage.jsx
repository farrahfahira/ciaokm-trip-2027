"use client";

import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { CAT_LABEL, CAT_TINT, normCat, isFund, num, fmtDay, Avatar } from "./shared";

export default function ExpensePage({ expense: e, people, fmt, onBack, onEdit, onDelete, onSetPaid, onOpenMember }) {
  const n = people.length;
  const split = e.split.filter((j) => j < n);
  const each = split.length ? num(e.amount) / split.length : 0;
  const fund = isFund(e);
  const payer = !fund && e.paidBy >= 0 && e.paidBy < n ? e.paidBy : null;
  const cat = normCat(e.cat);
  const others = payer === null ? [] : split.filter((j) => j !== payer);
  const isPaid = (j) => !!e.settled || !!(e.paid && e.paid[j]);
  const paidCount = others.filter(isPaid).length;
  const nameOf = (j) => people[j]?.name || "Seseorang";

  const mark = (j) => onSetPaid([{ id: e.id, j }], true);
  const unmark = (j) => {
    if (confirm(`${nameOf(j)} belum bayar?`)) onSetPaid([{ id: e.id, j }], false);
  };
  const markText = (j) => {
    const m = e.paid && e.paid[j];
    if (!m) return "Lunas dari sebelumnya";
    const who = m.by != null && people[m.by] ? `Ditandai ${people[m.by].name}` : "Ditandai";
    return m.at ? `${who}, ${fmtDay(m.at)}` : who;
  };

  const Person = ({ j }) => (
    <button onClick={() => onOpenMember(j)} className="inline-flex items-center gap-2 min-w-0 hover:text-indigo-600">
      <Avatar name={people[j].name} i={j} photo={people[j].photo} size="w-7 h-7 text-xs" />
      <span className="font-medium truncate">{people[j].name}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-6">
      <div className="flex items-center gap-1">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-2 -ml-3 rounded-lg">
          <ArrowLeft size={15} /> Kembali
        </button>
        <button onClick={onEdit} className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg">
          <Pencil size={14} /> Ubah
        </button>
        <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-3 py-2 -mr-3 rounded-lg">
          <Trash2 size={14} /> Hapus
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${CAT_TINT[cat]}`}>{CAT_LABEL[cat]}</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-2 break-words">{e.item || "Tanpa nama"}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {fund ? "Dibayar pakai kas" : payer !== null ? `${nameOf(payer)} yang bayar` : "Belum jelas siapa yang bayar"}, dibagi {split.length} orang
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-slate-800">{fmt(e.amount, e.cur)}</div>
          {split.length > 1 && <div className="text-xs text-slate-400">{fmt(each, e.cur)} per orang</div>}
        </div>
      </div>

      {fund ? (
        <section>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Dibagi ke</h3>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {split.map((j) => (
              <div key={j} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <Person j={j} />
                <span className="ml-auto text-slate-600">{fmt(each, e.cur)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Pakai kas, jadi nggak ada yang perlu dibayar balik.</p>
        </section>
      ) : (
        payer !== null && (
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Bayar ke {nameOf(payer)}</h3>
              {others.length > 0 && (
                <span className="text-xs text-slate-400">
                  {paidCount} dari {others.length} lunas
                </span>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <Person j={payer} />
                <span className="text-xs text-slate-400">yang bayar</span>
                <span className="ml-auto text-slate-500">{split.includes(payer) ? fmt(each, e.cur) : "nggak ikut"}</span>
              </div>
              {others.map((j) => (
                <div key={j} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                  <Person j={j} />
                  <span className="ml-auto text-slate-700">{fmt(each, e.cur)}</span>
                  {isPaid(j) ? (
                    <button
                      onClick={() => (e.paid && e.paid[j] ? unmark(j) : null)}
                      title={markText(j)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md hover:bg-emerald-100"
                    >
                      <Check size={13} /> Lunas
                    </button>
                  ) : (
                    <button onClick={() => mark(j)} className="text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-md">
                      Tandai lunas
                    </button>
                  )}
                  {isPaid(j) && <div className="w-full text-right text-[11px] text-slate-400">{markText(j)}</div>}
                </div>
              ))}
            </div>
            {others.length === 0 && <p className="text-xs text-slate-400 mt-2">Cuma {nameOf(payer)} yang ikut, jadi nggak ada yang perlu dibayar.</p>}
          </section>
        )
      )}
    </div>
  );
}
