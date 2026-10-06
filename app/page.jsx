"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, RotateCcw, MapPin, Calendar, PiggyBank, CalendarDays, Wallet, Luggage, Check, ExternalLink, Link2, ArrowRight, CheckCheck } from "lucide-react";

// ── Storage bridge: same API the planner used in Claude, backed by /api/trip ──
if (typeof window !== "undefined" && !window.storage) {
  const url = (k) => `/api/trip?key=${encodeURIComponent(k)}`;
  window.storage = {
    async get(key) {
      const r = await fetch(url(key), { cache: "no-store" });
      const { value } = await r.json();
      if (!r.ok || value == null) throw new Error("not found");
      return { key, value };
    },
    async set(key, value) {
      const r = await fetch(url(key), { method: "PUT", body: value });
      if (!r.ok) throw new Error("save failed");
      return { key, value };
    },
  };
}

const KEY = "cute-trip-planner-v1";
const AVATAR = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500"];
const DAY_TINT = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700"];
const CATS = ["Stay", "Transport", "Food", "Activities", "Shopping", "Other"];
const CAT_TINT = { Stay: "bg-indigo-50 text-indigo-700", Transport: "bg-sky-50 text-sky-700", Food: "bg-amber-50 text-amber-700", Activities: "bg-emerald-50 text-emerald-700", Shopping: "bg-rose-50 text-rose-700", Other: "bg-slate-100 text-slate-600" };
const NO_DECIMALS = ["IDR", "JPY", "KRW", "VND"];
const MONTHS = 12;

const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v) => Number(v) || 0;
const blankMonths = () => Array(MONTHS).fill("");
const isUrl = (s) => /^https?:\/\//i.test(String(s || "").trim());
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const weekday = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" }) : "");
const nextDate = (date) => {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const blankRow = () => ({ id: uid(), time: "", place: "", link: "", activity: "", price: "", notes: "" });

const defaults = () => {
  const people = Array.from({ length: 8 }, (_, i) => ({ name: `Person ${i + 1}`, months: blankMonths() }));
  return {
    trip: { name: "Group Trip", dest: "", start: "", end: "", saveStart: thisMonth(), monthly: "" },
    currencies: [
      { code: "IDR", symbol: "Rp", rate: 1 },
      { code: "MYR", symbol: "RM", rate: 3800 },
    ],
    people,
    days: [
      { id: uid(), label: "Arrival", date: "", rows: [{ ...blankRow(), time: "11.00 - 13.30", place: "Flight", activity: "Travel" }, blankRow()] },
      { id: uid(), label: "", date: "", rows: [blankRow()] },
    ],
    expenses: [
      { id: uid(), cat: "Stay", item: "Accommodation", amount: "", cur: "MYR", paidBy: 0, split: people.map((_, i) => i), settled: false },
      { id: uid(), cat: "Transport", item: "Grab to hotel (car 1)", amount: "", cur: "MYR", paidBy: 0, split: [0, 1, 2, 3], settled: false },
      { id: uid(), cat: "Transport", item: "Grab to hotel (car 2)", amount: "", cur: "MYR", paidBy: 4, split: [4, 5, 6, 7], settled: false },
    ],
    packing: [
      { item: "Passport", who: "Everyone", done: false },
      { item: "Phone charger", who: "Everyone", done: false },
      { item: "Power bank", who: "Person 1", done: false },
    ],
  };
};

const normCat = (c) => {
  const s = String(c || "").toLowerCase();
  return CATS.find((x) => s.includes(x.toLowerCase().slice(0, 4))) || (s.includes("fun") ? "Activities" : "Other");
};

// Upgrade older saved data to the current format
const migrate = (s) => {
  const d = defaults();
  const out = { ...d, ...s, trip: { ...d.trip, ...(s.trip || {}) } };
  out.currencies = Array.isArray(s.currencies) && s.currencies.length ? s.currencies : d.currencies;
  out.people = (s.people || d.people).map((p) => ({
    name: p.name,
    months: Array.isArray(p.months) ? [...p.months, ...blankMonths()].slice(0, MONTHS) : [num(p.saved) || "", ...Array(MONTHS - 1).fill("")],
  }));
  if (!Array.isArray(s.days)) {
    if (Array.isArray(s.itinerary) && s.itinerary.length) {
      const map = new Map();
      s.itinerary.forEach((r) => {
        if (!map.has(r.day)) map.set(r.day, []);
        map.get(r.day).push({ ...blankRow(), time: r.time || "", place: r.place || "", activity: r.activity || "", notes: r.notes || "" });
      });
      out.days = [...map.entries()].map(([label, rows]) => ({ id: uid(), label, date: "", rows }));
    } else out.days = d.days;
  }
  delete out.itinerary;
  const all = out.people.map((_, i) => i);
  out.expenses = (s.expenses || d.expenses).map((e) => ({
    id: e.id || uid(),
    cat: normCat(e.cat),
    item: e.item || "",
    amount: e.amount ?? e.cost ?? "",
    cur: e.cur || out.currencies[0].code,
    paidBy: num(e.paidBy),
    split: Array.isArray(e.split) ? e.split : all,
    settled: !!e.settled,
  }));
  return out;
};

// Minimal list of transfers to settle balances
const settle = (bal, dec) => {
  const eps = dec === 0 ? 0.5 : 0.005;
  const cr = bal.map((v, i) => ({ i, v })).filter((x) => x.v > eps).sort((a, b) => b.v - a.v);
  const db = bal.map((v, i) => ({ i, v: -v })).filter((x) => x.v > eps).sort((a, b) => b.v - a.v);
  const out = [];
  let x = 0, y = 0;
  while (x < db.length && y < cr.length) {
    const m = Math.min(db[x].v, cr[y].v);
    out.push({ from: db[x].i, to: cr[y].i, amt: m });
    db[x].v -= m; cr[y].v -= m;
    if (db[x].v <= eps) x++;
    if (cr[y].v <= eps) y++;
  }
  return out;
};

const Cell = ({ value, onChange, type = "text", className = "", placeholder = "", autoFocus, onBlur }) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    autoFocus={autoFocus}
    onBlur={onBlur}
    onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
    className={`w-full bg-transparent px-2 py-1.5 rounded-md text-sm hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300 ${className}`}
  />
);

const Bar = ({ pct, color }) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }} />
  </div>
);

const Stat = ({ label, value, accent, sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden">
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-800 mt-1">{value}</div>
    {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

const Avatar = ({ name, i, size = "w-7 h-7 text-xs", className = "" }) => (
  <span className={`inline-flex ${size} shrink-0 rounded-full ${AVATAR[i % 8]} text-white font-semibold items-center justify-center ${className}`}>
    {(name || "?").trim().charAt(0).toUpperCase() || "?"}
  </span>
);

const TH = ({ children, className = "" }) => (
  <th className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${className}`}>{children}</th>
);

const Btn = ({ onClick, children, color }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white ${color} transition`}>
    {children}
  </button>
);

const Del = ({ onClick, title = "Delete" }) => (
  <button onClick={onClick} title={title} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"><Trash2 size={15} /></button>
);

const Select = ({ value, onChange, children, className = "" }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className={`text-sm rounded-md px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${className}`}>
    {children}
  </select>
);

export default function App() {
  const [data, setData] = useState(defaults());
  const [tab, setTab] = useState("itinerary");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [linkEdit, setLinkEdit] = useState(null);
  const [settleMode, setSettleMode] = useState("separate");

  // ── Shared storage: everyone with the link sees & edits the same data ──
  const SHARED_KEY = "group-trip-shared-v1";
  const lastSynced = useRef("");
  const lastEdit = useRef(0);
  const fromRemote = useRef(false);

  useEffect(() => {
    (async () => {
      let raw = null;
      try {
        const r = await window.storage.get(SHARED_KEY, true);
        if (r && r.value) raw = r.value;
      } catch (e) {}
      if (!raw) {
        try {
          const r = await window.storage.get(KEY, false);
          if (r && r.value) raw = r.value;
        } catch (e) {}
      }
      if (raw) {
        try { setData(migrate(JSON.parse(raw))); } catch (e) {}
      }
      setLoaded(true);
    })();
  }, []);

  // Save changes to shared storage
  useEffect(() => {
    if (!loaded) return;
    if (fromRemote.current) { fromRemote.current = false; return; }
    lastEdit.current = Date.now();
    setStatus("Saving…");
    const t = setTimeout(async () => {
      const s = JSON.stringify(data);
      try {
        await window.storage.set(SHARED_KEY, s, true);
        lastSynced.current = s;
        setStatus("Saved · shared with everyone");
      } catch (e) {
        setStatus("Couldn't save");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [data, loaded]);

  // Pull friends' changes every few seconds (pauses while you're typing)
  useEffect(() => {
    if (!loaded) return;
    const pull = async () => {
      if (Date.now() - lastEdit.current < 4000) return;
      try {
        const r = await window.storage.get(SHARED_KEY, true);
        if (r && r.value && r.value !== lastSynced.current) {
          lastSynced.current = r.value;
          fromRemote.current = true;
          setData(migrate(JSON.parse(r.value)));
          setStatus("Updated with friends' changes ✓");
        }
      } catch (e) {}
    };
    const id = setInterval(pull, 6000);
    return () => clearInterval(id);
  }, [loaded]);

  const { trip, currencies, people, days, expenses, packing } = data;
  const home = currencies[0];

  // ── generic updaters ──
  const setTrip = (f, v) => setData((d) => ({ ...d, trip: { ...d.trip, [f]: v } }));
  const upd = (k, i, f, v) => setData((d) => ({ ...d, [k]: d[k].map((r, j) => (j === i ? { ...r, [f]: v } : r)) }));
  const add = (k, row) => setData((d) => ({ ...d, [k]: [...d[k], row] }));
  const del = (k, i) => setData((d) => ({ ...d, [k]: d[k].filter((_, j) => j !== i) }));
  const reset = () => { if (confirm("Reset everything to the starter template? This clears it for ALL friends.")) setData(defaults()); };

  // ── savings ──
  const updMonth = (i, m, v) => setData((d) => ({ ...d, people: d.people.map((p, j) => (j === i ? { ...p, months: p.months.map((x, k) => (k === m ? v : x)) } : p)) }));

  // ── itinerary ──
  const setDays = (fn) => setData((d) => ({ ...d, days: fn(d.days) }));
  const updDay = (di, f, v) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, [f]: v } : x)));
  const addDay = () => setDays((ds) => [...ds, { id: uid(), label: "", date: nextDate(ds.length ? ds[ds.length - 1].date : ""), rows: [blankRow()] }]);
  const delDay = (di) => {
    const has = days[di].rows.some((r) => r.place || r.activity || r.time);
    if (!has || confirm("Delete this whole day and all its rows?")) setDays((ds) => ds.filter((_, j) => j !== di));
  };
  const updRow = (di, ri, f, v) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: x.rows.map((r, k) => (k === ri ? { ...r, [f]: v } : r)) } : x)));
  const addRow = (di) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: [...x.rows, blankRow()] } : x)));
  const delRow = (di, ri) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: x.rows.filter((_, k) => k !== ri) } : x)));

  // ── currencies ──
  const curOf = (code) => currencies.find((c) => c.code === code) || home;
  const decOf = (code) => (NO_DECIMALS.includes(String(code).toUpperCase()) ? 0 : 2);
  const rateOf = (code) => (code === home.code ? 1 : num(curOf(code).rate));
  const fmt = (n, code = home.code) => {
    const c = curOf(code);
    const dec = decOf(c.code);
    return `${c.symbol}${num(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dec })}`;
  };
  const updCur = (ci, f, v) => setData((d) => {
    const old = d.currencies[ci].code;
    const cs = d.currencies.map((c, j) => (j === ci ? { ...c, [f]: v } : c));
    const ex = f === "code" ? d.expenses.map((e) => (e.cur === old ? { ...e, cur: v } : e)) : d.expenses;
    return { ...d, currencies: cs, expenses: ex };
  });
  const delCur = (ci) => setData((d) => {
    const code = d.currencies[ci].code;
    return { ...d, currencies: d.currencies.filter((_, j) => j !== ci), expenses: d.expenses.map((e) => (e.cur === code ? { ...e, cur: d.currencies[0].code } : e)) };
  });

  // ── expenses ──
  const toggleSplit = (ei, pi) => setData((d) => ({
    ...d,
    expenses: d.expenses.map((e, j) => (j !== ei ? e : { ...e, split: e.split.includes(pi) ? e.split.filter((x) => x !== pi) : [...e.split, pi].sort((a, b) => a - b) })),
  }));
  const setSplitAll = (ei, all) => upd("expenses", ei, "split", all ? people.map((_, i) => i) : []);
  const settleGroup = (code) => setData((d) => ({ ...d, expenses: d.expenses.map((e) => (!e.settled && (code === "__ALL__" || e.cur === code) ? { ...e, settled: true } : e)) }));

  const balances = (code) => {
    const b = people.map(() => 0);
    expenses.forEach((e) => {
      const amt = num(e.amount);
      const split = e.split.filter((i) => i < people.length);
      if (e.settled || !amt || !split.length) return;
      let a = amt;
      if (code === "__ALL__") a = amt * rateOf(e.cur);
      else if (e.cur !== code) return;
      b[e.paidBy] += a;
      split.forEach((i) => (b[i] -= a / split.length));
    });
    return b;
  };

  // ── calculations ──
  let countdown = null;
  if (trip.start) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((new Date(trip.start + "T00:00:00") - today) / 86400000);
    countdown = diff > 0 ? `${diff} day${diff === 1 ? "" : "s"} to go` : diff === 0 ? "Trip starts today" : "Trip completed";
  }

  const [sy, sm] = (trip.saveStart || thisMonth()).split("-").map(Number);
  const monthLabels = Array.from({ length: MONTHS }, (_, k) => {
    const d = new Date(sy, sm - 1 + k, 1);
    return { short: d.toLocaleString("en", { month: "short" }), year: String(d.getFullYear()).slice(2) };
  });
  const now = new Date();
  const curIdx = (now.getFullYear() - sy) * 12 + now.getMonth() - (sm - 1);
  const monthly = num(trip.monthly);
  const personTotal = (p) => p.months.reduce((s, v) => s + num(v), 0);
  const monthTotal = (k) => people.reduce((s, p) => s + num(p.months[k]), 0);
  const totalSaved = people.reduce((s, p) => s + personTotal(p), 0);
  const groupTarget = monthly * MONTHS * people.length;
  const curLabel = curIdx >= 0 && curIdx < MONTHS ? `${monthLabels[curIdx].short} ${monthLabels[curIdx].year}` : null;
  const paidThisMonth = curLabel ? people.filter((p) => num(p.months[curIdx]) > 0).length : 0;
  const monthsLeft = Math.max(0, Math.min(MONTHS, MONTHS - curIdx));
  const cellTint = (v, k) => {
    const filled = num(v) > 0;
    if (filled && monthly > 0 && num(v) < monthly) return "bg-amber-50 text-amber-700";
    if (filled) return "bg-emerald-50 text-emerald-700";
    if (k < curIdx) return "bg-rose-50";
    return "";
  };

  const totalHome = expenses.reduce((s, e) => s + num(e.amount) * rateOf(e.cur), 0);
  const perCur = currencies.map((c) => ({ code: c.code, total: expenses.filter((e) => e.cur === c.code).reduce((s, e) => s + num(e.amount), 0) })).filter((x) => x.total);
  const unsettled = expenses.filter((e) => !e.settled && num(e.amount) > 0);
  const missingRate = currencies.slice(1).some((c) => !num(c.rate));
  const settleGroups = settleMode === "combined"
    ? [{ code: "__ALL__", label: `All currencies → ${home.code}`, fmtCode: home.code }]
    : currencies.filter((c) => unsettled.some((e) => e.cur === c.code)).map((c) => ({ code: c.code, label: c.code, fmtCode: c.code }));

  const packed = packing.filter((p) => p.done).length;

  const tabs = [
    { id: "save", label: "Save", Icon: PiggyBank, on: "text-emerald-600 border-emerald-500" },
    { id: "itinerary", label: "Itinerary", Icon: CalendarDays, on: "text-indigo-600 border-indigo-500" },
    { id: "budget", label: "Budget & Split", Icon: Wallet, on: "text-amber-600 border-amber-500" },
    { id: "packing", label: "Packing", Icon: Luggage, on: "text-sky-600 border-sky-500" },
  ];

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">
        Loading trip…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 via-amber-400 to-indigo-500" />
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <Cell value={trip.name} onChange={(v) => setTrip("name", v)} className="text-2xl md:text-3xl font-bold text-slate-800 -ml-2" />
              {countdown && <span className="shrink-0 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full">{countdown}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-sm">
              <label className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-2.5">
                <MapPin size={15} className="text-rose-500" />
                <Cell value={trip.dest} onChange={(v) => setTrip("dest", v)} className="w-44" placeholder="Destination" />
              </label>
              <label className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-2.5">
                <Calendar size={15} className="text-emerald-500" />
                <Cell type="date" value={trip.start} onChange={(v) => setTrip("start", v)} className="w-36" />
                <span className="text-slate-400">→</span>
                <Cell type="date" value={trip.end} onChange={(v) => setTrip("end", v)} className="w-36" />
              </label>
            </div>
            <div className="flex items-center mt-4">
              <div className="flex -space-x-1.5">
                {people.map((p, i) => <span key={i} title={p.name} className="ring-2 ring-white rounded-full"><Avatar name={p.name} i={i} /></span>)}
              </div>
              <span className="text-sm text-slate-500 ml-3">{people.length} travelers</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end justify-between mt-6 border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(({ id, label, Icon, on }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${tab === id ? on : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pb-2 shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">{status}</span>
            <button onClick={reset} title="Reset" className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><RotateCcw size={15} /></button>
          </div>
        </div>

        <div className="mt-5">
          {/* ═════════ SAVE ═════════ */}
          {tab === "save" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-x-6 gap-y-3 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Start saving from</span>
                  <input type="month" value={trip.saveStart} onChange={(e) => setTrip("saveStart", e.target.value || thisMonth())}
                    className="text-sm bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Monthly amount per person</span>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md pl-2">
                    <span className="text-slate-400">{home.symbol}</span>
                    <Cell type="number" value={trip.monthly} onChange={(v) => setTrip("monthly", v)} className="w-32" placeholder="Not decided yet" />
                  </div>
                </label>
                <span className="text-xs text-slate-400">12 months · {monthLabels[0].short} {monthLabels[0].year} – {monthLabels[11].short} {monthLabels[11].year} · in {home.code}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Total saved" value={fmt(totalSaved)} accent="bg-emerald-500" sub={`${fmt(totalSaved / people.length)} avg per person`} />
                <Stat label={curLabel ? `${curLabel} collected` : "This month"} value={curLabel ? fmt(monthTotal(curIdx)) : "—"} accent="bg-teal-500"
                  sub={curLabel ? `${paidThisMonth} of ${people.length} have paid` : curIdx < 0 ? "Saving hasn't started" : "Saving period ended"} />
                <Stat label="Group target" value={monthly ? fmt(groupTarget) : "Not set"} accent="bg-amber-400" sub={monthly ? `${fmt(monthly * MONTHS)} per person` : "Set a monthly amount above"} />
                <Stat label="Months left" value={monthsLeft} accent="bg-indigo-400" sub={curLabel ? `Currently month ${curIdx + 1} of 12` : null} />
              </div>

              {monthly > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-600">Progress to target</span>
                    <span className="font-semibold text-emerald-600">{groupTarget ? Math.round((totalSaved / groupTarget) * 100) : 0}%</span>
                  </div>
                  <Bar pct={groupTarget ? (totalSaved / groupTarget) * 100 : 0} color="bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <TH className="sticky left-0 bg-slate-50 z-10">Traveler</TH>
                      {monthLabels.map((m, k) => (
                        <th key={k} className={`px-1 py-2 text-center text-xs font-semibold ${k === curIdx ? "bg-emerald-100 text-emerald-700" : "text-slate-500"}`}>
                          <div className="uppercase tracking-wide">{m.short}</div>
                          <div className="font-normal opacity-60">'{m.year}</div>
                        </th>
                      ))}
                      <TH className="text-right bg-slate-100">Total</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {people.map((p, i) => {
                      const t = personTotal(p);
                      return (
                        <tr key={i}>
                          <td className="px-3 py-1 sticky left-0 bg-white z-10 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <Avatar name={p.name} i={i} />
                              <Cell value={p.name} onChange={(v) => upd("people", i, "name", v)} className="font-medium w-28" />
                            </div>
                          </td>
                          {p.months.map((v, k) => (
                            <td key={k} className={`p-0.5 ${k === curIdx ? "bg-emerald-50/50" : ""}`}>
                              <div className={`rounded-md ${cellTint(v, k)}`}>
                                <Cell type="number" value={v} onChange={(nv) => updMonth(i, k, nv)} className="w-20 text-center hover:bg-transparent" placeholder="–" />
                              </div>
                            </td>
                          ))}
                          <td className="px-3 text-sm text-right font-semibold bg-slate-50">
                            {fmt(t)}
                            {monthly > 0 && <div className="mt-1 w-20 ml-auto"><Bar pct={(t / (monthly * MONTHS)) * 100} color="bg-emerald-500" /></div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-3 py-2.5 text-sm font-semibold sticky left-0 bg-slate-50 z-10">Month total</td>
                      {monthLabels.map((_, k) => (
                        <td key={k} className={`px-1 py-2.5 text-center text-xs font-semibold ${k === curIdx ? "bg-emerald-100 text-emerald-700" : "text-slate-600"}`}>
                          {monthTotal(k) ? fmt(monthTotal(k)) : "–"}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-sm text-right font-bold text-emerald-700 bg-emerald-50">{fmt(totalSaved)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> Paid</span>
                {monthly > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Paid less than {fmt(monthly)}</span>}
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-200" /> Missed (past month)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200" /> Current month</span>
              </div>
            </div>
          )}

          {/* ═════════ ITINERARY ═════════ */}
          {tab === "itinerary" && (
            <div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide w-48">Day</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Est. Time</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Place</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Activity</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Est. Price</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide bg-amber-500">Notes</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  {days.map((day, di) => (
                    <tbody key={day.id} className={`border-t-2 border-slate-200 ${di % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                      {[...day.rows, null].map((r, ri) => (
                        <tr key={r ? r.id : "add"} className={r ? "border-t border-slate-100 group" : ""}>
                          {ri === 0 && (
                            <td rowSpan={day.rows.length + 1} className="align-top px-3 py-3 border-r border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DAY_TINT[di % DAY_TINT.length]}`}>Day {di + 1}</span>
                                <Del onClick={() => delDay(di)} title="Delete day" />
                              </div>
                              {day.date && <div className="text-base font-semibold text-slate-800 mt-2 px-2 capitalize">{weekday(day.date)}</div>}
                              <Cell type="date" value={day.date} onChange={(v) => updDay(di, "date", v)} className="text-slate-500 w-40" />
                              <Cell value={day.label} onChange={(v) => updDay(di, "label", v)} className="text-xs text-slate-500" placeholder="Day title (optional)" />
                              <div className="text-xs text-slate-400 px-2 mt-1">{day.rows.length} stop{day.rows.length === 1 ? "" : "s"}</div>
                            </td>
                          )}
                          {r ? (
                            <>
                              <td className="px-1 py-0.5 align-top"><Cell value={r.time} onChange={(v) => updRow(di, ri, "time", v)} className="w-32 tabular-nums" placeholder="11.00 - 13.30" /></td>
                              <td className="px-1 py-0.5 align-top min-w-56">
                                <div className="flex items-center gap-0.5">
                                  <Cell value={r.place} onChange={(v) => updRow(di, ri, "place", v)} className={r.link ? "text-indigo-600 underline underline-offset-2" : ""} placeholder="Place" />
                                  {r.link && isUrl(r.link) && (
                                    <a href={r.link} target="_blank" rel="noreferrer" title="Open link" className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><ExternalLink size={14} /></a>
                                  )}
                                  <button onClick={() => setLinkEdit(linkEdit === r.id ? null : r.id)} title="Add / edit link"
                                    className={`p-1 rounded hover:bg-slate-100 ${r.link ? "text-indigo-400" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}><Link2 size={14} /></button>
                                </div>
                                {linkEdit === r.id && (
                                  <Cell autoFocus value={r.link} onChange={(v) => updRow(di, ri, "link", v)} onBlur={() => setLinkEdit(null)}
                                    className="text-xs text-indigo-600 bg-indigo-50 mt-0.5" placeholder="Paste link (Google Maps, website…)" />
                                )}
                              </td>
                              <td className="px-1 py-0.5 align-top"><Cell value={r.activity} onChange={(v) => updRow(di, ri, "activity", v)} className="min-w-40" placeholder="Activity" /></td>
                              <td className="px-1 py-0.5 align-top"><Cell value={r.price} onChange={(v) => updRow(di, ri, "price", v)} className="w-32" placeholder="RM20-40" /></td>
                              <td className="px-1 py-0.5 align-top min-w-64">
                                <div className="flex items-center gap-0.5">
                                  <Cell value={r.notes} onChange={(v) => updRow(di, ri, "notes", v)} className={isUrl(r.notes) ? "text-indigo-600 truncate" : ""} placeholder="Notes" />
                                  {isUrl(r.notes) && (
                                    <a href={r.notes.trim()} target="_blank" rel="noreferrer" title="Open link" className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><ExternalLink size={14} /></a>
                                  )}
                                </div>
                              </td>
                              <td className="px-1 align-top pt-1 opacity-0 group-hover:opacity-100 transition"><Del onClick={() => delRow(di, ri)} title="Delete row" /></td>
                            </>
                          ) : (
                            <td colSpan={6} className="px-2 py-1.5">
                              <button onClick={() => addRow(di)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md">
                                <Plus size={14} /> Add row
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
                {days.length === 0 && <div className="text-center text-sm text-slate-400 py-10">No days yet. Add your first day below.</div>}
              </div>
              <div className="mt-4"><Btn onClick={addDay} color="bg-indigo-500 hover:bg-indigo-600"><Plus size={16} /> Add day</Btn></div>
            </div>
          )}

          {/* ═════════ BUDGET & SPLIT ═════════ */}
          {tab === "budget" && (
            <div className="space-y-5">
              {/* Currencies */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">Currencies & exchange rates</div>
                <div className="flex flex-wrap gap-3">
                  {currencies.map((c, ci) => (
                    <div key={ci} className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${ci === 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <Cell value={c.code} onChange={(v) => updCur(ci, "code", v.toUpperCase())} className="w-14 font-semibold" placeholder="CODE" />
                      <Cell value={c.symbol} onChange={(v) => updCur(ci, "symbol", v)} className="w-12" placeholder="Sym" />
                      {ci === 0 ? (
                        <span className="text-xs font-medium text-emerald-700 px-2">Home currency</span>
                      ) : (
                        <>
                          <span className="text-xs text-slate-500 whitespace-nowrap">1 {c.code} =</span>
                          <Cell type="number" value={c.rate} onChange={(v) => updCur(ci, "rate", v)} className="w-24" placeholder="rate" />
                          <span className="text-xs text-slate-500">{home.code}</span>
                          <Del onClick={() => delCur(ci)} />
                        </>
                      )}
                    </div>
                  ))}
                  <button onClick={() => add("currencies", { code: "", symbol: "", rate: "" })}
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:bg-amber-50 px-3 rounded-lg border border-dashed border-amber-300"><Plus size={14} /> Currency</button>
                </div>
                {missingRate && <div className="text-xs text-rose-500 mt-2">Some currencies have no exchange rate yet, so combined totals won't include them correctly.</div>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={`Total spent (in ${home.code})`} value={fmt(totalHome)} accent="bg-amber-400" sub={perCur.map((x) => fmt(x.total, x.code)).join(" + ") || "No expenses yet"} />
                <Stat label="Per person (avg)" value={fmt(totalHome / people.length)} accent="bg-orange-400" />
                <Stat label="Unsettled expenses" value={unsettled.length} accent="bg-rose-400" sub={`${expenses.length - unsettled.length} settled / empty`} />
                <Stat label="Savings vs cost" value={fmt(totalSaved - totalHome)} accent={totalSaved >= totalHome ? "bg-emerald-500" : "bg-rose-400"}
                  sub={totalSaved >= totalHome ? "Savings cover the trip" : "Short of trip cost"} />
              </div>

              {/* Expense table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr>
                    <TH>Category</TH><TH>Item</TH><TH>Amount</TH><TH>Paid by</TH><TH>Split between</TH><TH className="text-center">Settled</TH><TH></TH>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((e, i) => {
                      const cat = normCat(e.cat);
                      const n = e.split.filter((x) => x < people.length).length;
                      return (
                        <tr key={e.id} className={`hover:bg-slate-50/60 ${e.settled ? "opacity-50" : ""}`}>
                          <td className="px-3 py-1.5">
                            <Select value={cat} onChange={(v) => upd("expenses", i, "cat", v)} className={`font-medium ${CAT_TINT[cat]}`}>
                              {CATS.map((c) => <option key={c}>{c}</option>)}
                            </Select>
                          </td>
                          <td className="px-1"><Cell value={e.item} onChange={(v) => upd("expenses", i, "item", v)} className="font-medium min-w-44" placeholder="e.g. Grab to KL Sentral" /></td>
                          <td className="px-1">
                            <div className="flex items-center bg-slate-50 rounded-md">
                              <Select value={e.cur} onChange={(v) => upd("expenses", i, "cur", v)} className="bg-slate-100 font-semibold">
                                {currencies.map((c) => <option key={c.code} value={c.code}>{c.code || "?"}</option>)}
                              </Select>
                              <Cell type="number" value={e.amount} onChange={(v) => upd("expenses", i, "amount", v)} className="w-28" placeholder="0" />
                            </div>
                          </td>
                          <td className="px-2">
                            <Select value={e.paidBy} onChange={(v) => upd("expenses", i, "paidBy", Number(v))} className="bg-slate-100">
                              {people.map((p, j) => <option key={j} value={j}>{p.name}</option>)}
                            </Select>
                          </td>
                          <td className="px-2">
                            <div className="flex items-center gap-1">
                              {people.map((p, j) => (
                                <button key={j} title={p.name} onClick={() => toggleSplit(i, j)}>
                                  <Avatar name={p.name} i={j} size="w-6 h-6 text-xs" className={e.split.includes(j) ? "" : "opacity-20 grayscale"} />
                                </button>
                              ))}
                              <button onClick={() => setSplitAll(i, n !== people.length)} className="text-xs text-slate-400 hover:text-slate-600 ml-1 w-10">
                                {n === people.length ? "none" : "all"}
                              </button>
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                {n ? `${fmt(num(e.amount) / n, e.cur)} each` : "no one"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 text-center">
                            <button onClick={() => upd("expenses", i, "settled", !e.settled)}
                              className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center transition ${e.settled ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"}`}>
                              {e.settled && <Check size={13} strokeWidth={3} />}
                            </button>
                          </td>
                          <td className="px-2"><Del onClick={() => del("expenses", i)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Btn color="bg-amber-500 hover:bg-amber-600"
                onClick={() => add("expenses", { id: uid(), cat: "Food", item: "", amount: "", cur: currencies[currencies.length > 1 ? 1 : 0].code, paidBy: 0, split: people.map((_, j) => j), settled: false })}>
                <Plus size={16} /> Add expense
              </Btn>
              <p className="text-xs text-slate-400 -mt-2">Tap the circles to choose who shares each expense, e.g. 2 Grab cars = 2 rows, each with its own group.</p>

              {/* Settle up */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="text-sm font-semibold text-slate-700">Settle up <span className="font-normal text-slate-400">· who pays whom</span></div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                    <button onClick={() => setSettleMode("separate")} className={`px-3 py-1.5 rounded-md ${settleMode === "separate" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>Per currency</button>
                    <button onClick={() => setSettleMode("combined")} className={`px-3 py-1.5 rounded-md ${settleMode === "combined" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>Combined in {home.code}</button>
                  </div>
                </div>

                {unsettled.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 py-6">Everyone is settled up ✓</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settleGroups.map((g) => {
                      const bal = balances(g.code);
                      const tr = settle(bal, decOf(g.fmtCode));
                      return (
                        <div key={g.code} className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between bg-amber-50 px-3 py-2">
                            <span className="text-sm font-semibold text-amber-800">{g.label}</span>
                            <button onClick={() => settleGroup(g.code)} className="inline-flex items-center gap-1 text-xs text-amber-700 hover:bg-amber-100 px-2 py-1 rounded-md">
                              <CheckCheck size={14} /> Mark all settled
                            </button>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {tr.length === 0 && <div className="text-sm text-slate-400 px-3 py-3">Nothing to pay back.</div>}
                            {tr.map((t, k) => (
                              <div key={k} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                                <Avatar name={people[t.from].name} i={t.from} size="w-6 h-6 text-xs" />
                                <span className="font-medium">{people[t.from].name}</span>
                                <ArrowRight size={14} className="text-slate-400" />
                                <Avatar name={people[t.to].name} i={t.to} size="w-6 h-6 text-xs" />
                                <span className="font-medium">{people[t.to].name}</span>
                                <span className="ml-auto font-semibold text-rose-600">{fmt(t.amt, g.fmtCode)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-slate-50 border-t border-slate-100">
                            {bal.map((v, j) => Math.abs(v) < (decOf(g.fmtCode) === 0 ? 0.5 : 0.005) ? null : (
                              <span key={j} className={`text-xs px-2 py-0.5 rounded-full ${v > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                                {people[j].name} {v > 0 ? "+" : "−"}{fmt(Math.abs(v), g.fmtCode)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════ PACKING ═════════ */}
          {tab === "packing" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">Packed {packed} of {packing.length}</span>
                  <span className="font-semibold text-sky-600">{packing.length ? Math.round((packed / packing.length) * 100) : 0}%</span>
                </div>
                <Bar pct={packing.length ? (packed / packing.length) * 100 : 0} color="bg-sky-500" />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr>
                    <TH className="w-12"></TH><TH>Item</TH><TH>Who brings it</TH><TH></TH>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {packing.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-3 py-1.5">
                          <button onClick={() => upd("packing", i, "done", !r.done)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${r.done ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300 hover:border-sky-400"}`}>
                            {r.done && <Check size={13} strokeWidth={3} />}
                          </button>
                        </td>
                        <td className="px-1"><Cell value={r.item} onChange={(v) => upd("packing", i, "item", v)} className={`min-w-56 ${r.done ? "line-through text-slate-400" : "font-medium"}`} placeholder="Item" /></td>
                        <td className="px-3">
                          <Select value={r.who} onChange={(v) => upd("packing", i, "who", v)} className="bg-slate-100">
                            <option value="Everyone">Everyone</option>
                            {people.map((p, j) => <option key={j} value={p.name}>{p.name}</option>)}
                          </Select>
                        </td>
                        <td className="px-2"><Del onClick={() => del("packing", i)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Btn color="bg-sky-500 hover:bg-sky-600" onClick={() => add("packing", { item: "", who: "Everyone", done: false })}><Plus size={16} /> Add item</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
