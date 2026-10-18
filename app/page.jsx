"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, MapPin, Calendar, PiggyBank, CalendarDays, Wallet, Luggage, ExternalLink, Link2, Lightbulb, Users, History as HistoryIcon } from "lucide-react";
import { useSharedTrip } from "./useSharedTrip";
import IdeasTab from "./IdeasTab";
import HistoryPanel from "./HistoryPanel";
import MemberPage from "./MemberPage";
import ManagePanel from "./ManagePanel";
import BudgetTab from "./BudgetTab";
import PackingTab from "./PackingTab";
import { ItineraryMobile, SaveMobile } from "./MobileViews";
import { NO_DECIMALS, FUND, num, isFund, normCat, Avatar, MoneyInput } from "./shared";

const ME_KEY = "trip-planner-me";
const DAY_TINT = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700"];
const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 60;
const PACK_KEYS = ["docs", "clothes", "toiletries", "electronics", "meds", "food", "other"];

const uid = () => Math.random().toString(36).slice(2, 9);
const blankMonths = () => Array(DEFAULT_MONTHS).fill("");
const isUrl = (s) => /^https?:\/\//i.test(String(s || "").trim());
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const addMonths = (ym, k) => {
  const [y, m] = String(ym || thisMonth())
    .split("-")
    .map(Number);
  const d = new Date(y, m - 1 + k, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthDiff = (a, b) => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
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
  const people = Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, name: `Orang ${i + 1}`, months: blankMonths(), photo: "" }));
  return {
    trip: { name: "Trip Bareng", dest: "", start: "", end: "", saveStart: thisMonth(), saveEnd: addMonths(thisMonth(), DEFAULT_MONTHS - 1), monthly: "" },
    currencies: [
      { id: "cur-0", code: "IDR", symbol: "Rp", rate: 1 },
      { id: "cur-1", code: "MYR", symbol: "RM", rate: 3800 },
    ],
    people,
    days: [
      { id: uid(), label: "Kedatangan", date: "", rows: [{ ...blankRow(), time: "11.00 - 13.30", place: "Pesawat", activity: "Perjalanan" }, blankRow()] },
      { id: uid(), label: "", date: "", rows: [blankRow()] },
    ],
    expenses: [],
    packing: [
      { id: "pk-0", item: "Paspor", type: "personal", who: "all", cat: "docs", done: {} },
      { id: "pk-1", item: "Charger HP", type: "personal", who: "all", cat: "electronics", done: {} },
      { id: "pk-2", item: "Power bank", type: "shared", who: [0], cat: "electronics", done: {} },
    ],
    ideas: [],
    ideaCities: [],
  };
};

// Ubah data lama ke format sekarang.
// ID yang belum ada dibikin tetap, jadi semua HP hasilnya sama.
const migrate = (s) => {
  const d = defaults();
  const t = s.trip || {};
  const out = { ...d, ...s };
  out.trip = { ...d.trip, ...t, saveEnd: t.saveEnd || addMonths(t.saveStart || d.trip.saveStart, DEFAULT_MONTHS - 1) };
  out.currencies = (Array.isArray(s.currencies) && s.currencies.length ? s.currencies : d.currencies).map((c, i) => ({ ...c, id: c.id || `cur-${i}` }));
  out.people = (s.people || d.people).map((p, i) => ({
    ...p,
    id: p.id || `p-${i}`,
    name: p.name ?? `Orang ${i + 1}`,
    months: Array.isArray(p.months) ? p.months : [num(p.saved) || ""],
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
  out.expenses = (s.expenses || d.expenses).map((e, i) => ({
    id: e.id || `ex-${i}`,
    cat: normCat(e.cat),
    item: e.item || "",
    amount: e.amount ?? e.cost ?? "",
    cur: e.cur || out.currencies[0].code,
    paidBy: num(e.paidBy),
    split: Array.isArray(e.split) ? e.split : all,
    settled: !!e.settled,
    paid: e.paid && typeof e.paid === "object" ? { ...e.paid } : {},
  }));
  // Pembayaran dari sistem lama → tandai lunas pengeluaran yang cocok, mulai dari yang paling lama
  const rate = (code) => {
    if (code === out.currencies[0].code) return 1;
    const c = out.currencies.find((x) => x.code === code);
    return num(c && c.rate);
  };
  (Array.isArray(s.payments) ? s.payments : []).forEach((pay) => {
    let left = num(pay.amount) * rate(pay.cur);
    out.expenses.forEach((e) => {
      if (left <= 0 || e.paidBy !== pay.to || e.paidBy === FUND || e.settled) return;
      if (pay.from === e.paidBy || !e.split.includes(pay.from) || e.paid[pay.from]) return;
      const share = (num(e.amount) * rate(e.cur)) / e.split.length;
      if (share <= 0 || share > left * 1.001 + 0.01) return;
      e.paid[pay.from] = { by: null, at: pay.at || null };
      left -= share;
    });
  });
  delete out.payments;
  delete out.trip.settleMode;
  // Bawaan: format lama (who = nama / "Everyone") → Pribadi/Bersama, terhubung ke orangnya
  out.packing = (s.packing || d.packing).map((p, i) => {
    const id = p.id || `pk-${i}`;
    if (p.type) {
      return {
        ...p,
        id,
        cat: PACK_KEYS.includes(p.cat) ? p.cat : "",
        who: p.who === "all" ? "all" : Array.isArray(p.who) ? p.who : [],
        done: p.done && typeof p.done === "object" ? p.done : {},
      };
    }
    const base = { id, item: p.item || "", cat: "", done: {} };
    if (!p.who || p.who === "Everyone") return { ...base, type: "personal", who: "all" };
    let idx = out.people.findIndex((x) => x.name === p.who);
    if (idx < 0) {
      const m = String(p.who).match(/^(?:Person|Orang)\s+(\d+)$/i);
      if (m && Number(m[1]) - 1 < out.people.length) idx = Number(m[1]) - 1;
    }
    return { ...base, type: "shared", who: idx >= 0 ? [idx] : [], done: idx >= 0 && p.done === true ? { [idx]: true } : {} };
  });
  out.ideas = (Array.isArray(s.ideas) ? s.ideas : []).map((x) => {
    const { link, ...rest } = x;
    const links = Array.isArray(x.links) ? x.links : link ? [{ id: `${x.id}-l0`, url: link }] : [];
    return { ...rest, links, photos: Array.isArray(x.photos) ? x.photos : [], cover: x.cover || "" };
  });
  return out;
};

const Cell = ({ value, onChange, type = "text", className = "", placeholder = "", autoFocus, onBlur }) => {
  const cls = `w-full bg-transparent px-2 py-1.5 rounded-md text-sm hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300 ${className}`;
  if (type === "number") {
    return <MoneyInput value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} onBlur={onBlur} className={cls} />;
  }
  return <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} className={cls} />;
};

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

const TH = ({ children, className = "" }) => <th className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${className}`}>{children}</th>;

const Btn = ({ onClick, children, color, className = "" }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white ${color} transition ${className}`}>
    {children}
  </button>
);

const Del = ({ onClick, title = "Hapus" }) => (
  <button onClick={onClick} title={title} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition">
    <Trash2 size={15} />
  </button>
);

const STATUS_TEXT = {
  loading: "",
  saving: "Menyimpan…",
  saved: "Tersimpan",
  updated: "Diperbarui",
  error: "Belum tersimpan, nyoba lagi",
};

export default function App() {
  const { trip: data, update: setData, status, ready } = useSharedTrip(defaults, migrate);
  const [tab, setTab] = useState("itinerary");
  const [linkEdit, setLinkEdit] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [memberIdx, setMemberIdx] = useState(null);
  const [expenseId, setExpenseId] = useState(null);
  const [meIdx, setMeIdx] = useState(null);
  const hashDepth = useRef(0);

  // Link: #idea-… buka tab Ide, #member-N buka halaman anggota, #expense-… buka halaman pengeluaran
  useEffect(() => {
    const check = () => {
      const h = window.location.hash;
      if (!h) hashDepth.current = 0;
      if (h.startsWith("#idea-")) setTab("ideas");
      const m = h.match(/^#member-(\d+)$/);
      setMemberIdx(m ? Number(m[1]) : null);
      const ex = h.match(/^#expense-(.+)$/);
      setExpenseId(ex ? ex[1] : null);
      if (ex) setTab("budget");
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  useEffect(() => {
    if (memberIdx !== null || expenseId) window.scrollTo({ top: 0 });
  }, [memberIdx, expenseId]);
  useEffect(() => {
    const v = localStorage.getItem(ME_KEY);
    setMeIdx(v !== null && v !== "" ? Number(v) : null);
  }, [tab, memberIdx]);
  const setMe = (v) => {
    if (v === null) localStorage.removeItem(ME_KEY);
    else localStorage.setItem(ME_KEY, String(v));
    setMeIdx(v);
  };
  const openHash = (h) => {
    hashDepth.current += 1;
    window.location.hash = h;
  };
  const openMember = (i) => openHash(`member-${i}`);
  const openExpense = (id) => openHash(`expense-${id}`);
  const closeHash = () => {
    if (hashDepth.current > 0) {
      hashDepth.current -= 1;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setMemberIdx(null);
      setExpenseId(null);
    }
  };

  const { trip, currencies, people, days, expenses, packing } = data;
  const home = currencies[0];
  const viewingMember = memberIdx !== null && memberIdx < people.length;

  const activeIdx = people.map((_, i) => i).filter((i) => !people[i].removed);
  const isActive = (i) => !!people[i] && !people[i].removed;

  const goTab = (id) => {
    setTab(id);
    if (viewingMember || expenseId) closeHash();
    window.scrollTo({ top: 0 });
  };

  // ── updater umum ──
  const setTrip = (f, v) => setData((d) => ({ ...d, trip: { ...d.trip, [f]: v } }));
  const upd = (k, i, f, v) => setData((d) => ({ ...d, [k]: d[k].map((r, j) => (j === i ? { ...r, [f]: v } : r)) }));
  const setPacking = (fn) => setData((d) => ({ ...d, packing: fn(d.packing) }));
  const restore = (snapshot) => setData(migrate(snapshot), { reason: "restore" });

  // ── tanda lunas: [{ id: pengeluaran, j: orang }] ──
  const setPaidMany = (items, paidNow) =>
    setData((d) => ({
      ...d,
      expenses: d.expenses.map((e) => {
        const mine = items.filter((x) => x.id === e.id);
        if (!mine.length) return e;
        const paid = { ...(e.paid || {}) };
        mine.forEach(({ j }) => {
          if (paidNow) paid[j] = { by: meIdx, at: Date.now() };
          else delete paid[j];
        });
        return { ...e, paid };
      }),
    }));

  // ── anggota ──
  const addPerson = (name) => setData((d) => ({ ...d, people: [...d.people, { id: uid(), name, months: [], photo: "" }] }));
  const removePerson = (i) => {
    if (activeIdx.length <= 1) {
      alert("Minimal harus ada satu anggota.");
      return;
    }
    if (!confirm(`Keluarin ${people[i].name} dari trip?\n\nTabungan dan pengeluarannya tetap tercatat. Bisa dibalikin dari Atur.`)) return;
    upd("people", i, "removed", true);
  };
  const restorePerson = (i) => upd("people", i, "removed", false);
  const setPhoto = (i, url) => upd("people", i, "photo", url);

  // ── tabungan ──
  const updMonth = (i, m, v) =>
    setData((d) => ({
      ...d,
      people: d.people.map((p, j) => {
        if (j !== i) return p;
        const months = [...p.months];
        while (months.length <= m) months.push("");
        months[m] = v;
        return { ...p, months };
      }),
    }));

  // ── itinerary ──
  const setDays = (fn) => setData((d) => ({ ...d, days: fn(d.days) }));
  const updDay = (di, f, v) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, [f]: v } : x)));
  const addDay = () => setDays((ds) => [...ds, { id: uid(), label: "", date: nextDate(ds.length ? ds[ds.length - 1].date : ""), rows: [blankRow()] }]);
  const delDay = (di) => {
    const has = days[di].rows.some((r) => r.place || r.activity || r.time);
    if (!has || confirm("Hapus hari ini beserta isinya?")) setDays((ds) => ds.filter((_, j) => j !== di));
  };
  const updRow = (di, ri, f, v) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: x.rows.map((r, k) => (k === ri ? { ...r, [f]: v } : r)) } : x)));
  const addRow = (di) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: [...x.rows, blankRow()] } : x)));
  const delRow = (di, ri) => setDays((ds) => ds.map((x, j) => (j === di ? { ...x, rows: x.rows.filter((_, k) => k !== ri) } : x)));

  // ── mata uang ──
  const curOf = (code) => currencies.find((c) => c.code === code) || home;
  const decOf = (code) => (NO_DECIMALS.includes(String(code).toUpperCase()) ? 0 : 2);
  const rateOf = (code) => (code === home.code ? 1 : num(curOf(code).rate));
  const fmt = (n, code = home.code) => {
    const c = curOf(code);
    const dec = decOf(c.code);
    return `${c.symbol}${num(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dec })}`;
  };
  const updCur = (ci, f, v) =>
    setData((d) => {
      const old = d.currencies[ci].code;
      const cs = d.currencies.map((c, j) => (j === ci ? { ...c, [f]: v } : c));
      const ex = f === "code" ? d.expenses.map((e) => (e.cur === old ? { ...e, cur: v } : e)) : d.expenses;
      return { ...d, currencies: cs, expenses: ex };
    });
  const delCur = (ci) =>
    setData((d) => {
      const code = d.currencies[ci].code;
      return { ...d, currencies: d.currencies.filter((_, j) => j !== ci), expenses: d.expenses.map((e) => (e.cur === code ? { ...e, cur: d.currencies[0].code } : e)) };
    });

  // ── hitungan ──
  let countdown = null;
  if (trip.start) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((new Date(trip.start + "T00:00:00") - today) / 86400000);
    countdown = diff > 0 ? `${diff} hari lagi` : diff === 0 ? "Berangkat hari ini" : "Trip selesai";
  }

  const saveStart = trip.saveStart || thisMonth();
  const saveEnd = trip.saveEnd || addMonths(saveStart, DEFAULT_MONTHS - 1);
  const endBeforeStart = monthDiff(saveStart, saveEnd) < 0;
  const nMonths = Math.max(1, Math.min(MAX_MONTHS, monthDiff(saveStart, saveEnd) + 1));
  const [sy, sm] = saveStart.split("-").map(Number);
  const monthLabels = Array.from({ length: nMonths }, (_, k) => {
    const d = new Date(sy, sm - 1 + k, 1);
    return { short: d.toLocaleString("id-ID", { month: "short" }), year: String(d.getFullYear()).slice(2) };
  });
  const lastLabel = `${monthLabels[nMonths - 1].short} ${monthLabels[nMonths - 1].year}`;
  const now = new Date();
  const curIdx = (now.getFullYear() - sy) * 12 + now.getMonth() - (sm - 1);
  const monthly = num(trip.monthly);
  const monthsOf = (p) => Array.from({ length: nMonths }, (_, k) => p.months[k] ?? "");
  const personTotal = (p) => monthsOf(p).reduce((s, v) => s + num(v), 0);
  const monthTotal = (k) => people.reduce((s, p) => s + num(p.months[k]), 0);
  const totalSaved = people.reduce((s, p) => s + personTotal(p), 0);
  const removedSavers = people.filter((p) => p.removed && personTotal(p) > 0);
  const removedSaved = removedSavers.reduce((s, p) => s + personTotal(p), 0);
  const groupTarget = monthly * nMonths * activeIdx.length;
  const curLabel = curIdx >= 0 && curIdx < nMonths ? `${monthLabels[curIdx].short} ${monthLabels[curIdx].year}` : null;
  const paidThisMonth = curLabel ? activeIdx.filter((i) => num(people[i].months[curIdx]) > 0).length : 0;
  const monthsLeft = Math.max(0, Math.min(nMonths, nMonths - curIdx));
  const hiddenSavings = people.some((p) => p.months.slice(nMonths).some((v) => num(v) > 0));
  const cellTint = (v, k) => {
    const filled = num(v) > 0;
    if (filled && monthly > 0 && num(v) < monthly) return "bg-amber-50 text-amber-700";
    if (filled) return "bg-emerald-50 text-emerald-700";
    if (k < curIdx) return "bg-rose-50";
    return "";
  };

  const totalHome = expenses.reduce((s, e) => s + num(e.amount) * rateOf(e.cur), 0);
  const missingRate = currencies.slice(1).some((c) => !num(c.rate));

  // ── kas ──
  const fundExpenses = expenses.filter((e) => isFund(e) && num(e.amount) > 0);
  const fundSpent = fundExpenses.reduce((s, e) => s + num(e.amount) * rateOf(e.cur), 0);
  const fundLeft = totalSaved - fundSpent;
  const fundShare = people.map(() => 0);
  fundExpenses.forEach((e) => {
    const split = e.split.filter((i) => i < people.length);
    if (!split.length) return;
    const each = (num(e.amount) * rateOf(e.cur)) / split.length;
    split.forEach((i) => (fundShare[i] += each));
  });
  const homeEps = decOf(home.code) === 0 ? 0.5 : 0.005;

  const tabs = [
    { id: "save", label: "Nabung", Icon: PiggyBank, on: "text-emerald-600 border-emerald-500" },
    { id: "ideas", label: "Ide", Icon: Lightbulb, on: "text-violet-600 border-violet-500" },
    { id: "itinerary", label: "Itinerary", Icon: CalendarDays, on: "text-indigo-600 border-indigo-500" },
    { id: "budget", label: "Pengeluaran", Icon: Wallet, on: "text-amber-600 border-amber-500" },
    { id: "packing", label: "Bawaan", Icon: Luggage, on: "text-sky-600 border-sky-500" },
  ];

  if (!ready) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">{status === "error" ? "Gagal memuat. Nyoba lagi…" : "Memuat…"}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 px-4 pt-4 pb-28 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 via-amber-400 to-indigo-500" />
          <div className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <Cell value={trip.name} onChange={(v) => setTrip("name", v)} className="text-2xl md:text-3xl font-bold text-slate-800 -ml-2" />
              {countdown && <span className="shrink-0 bg-indigo-50 text-indigo-700 text-xs md:text-sm font-medium px-3 py-1.5 rounded-full">{countdown}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-sm">
              <label className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-2.5">
                <MapPin size={15} className="text-rose-500" />
                <Cell value={trip.dest} onChange={(v) => setTrip("dest", v)} className="w-44" placeholder="Tujuan" />
              </label>
              <label className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-2.5">
                <Calendar size={15} className="text-emerald-500" />
                <Cell type="date" value={trip.start} onChange={(v) => setTrip("start", v)} className="w-36" />
                <span className="text-slate-400">→</span>
                <Cell type="date" value={trip.end} onChange={(v) => setTrip("end", v)} className="w-36" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 mt-4">
              <div className="flex -space-x-1.5">
                {activeIdx.map((i) => (
                  <button key={people[i].id || i} onClick={() => openMember(i)} title={people[i].name} className={`rounded-full ring-2 hover:z-10 hover:scale-110 transition ${memberIdx === i ? "ring-indigo-400 z-10" : "ring-white"}`}>
                    <Avatar name={people[i].name} i={i} photo={people[i].photo} size="w-8 h-8 text-xs md:w-7 md:h-7" />
                  </button>
                ))}
              </div>
              <span className="text-sm text-slate-500 ml-3">{activeIdx.length} anggota</span>
              <button
                onClick={() => setShowManage((v) => !v)}
                className={`ml-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${showManage ? "bg-indigo-100 text-indigo-700" : "text-indigo-600 hover:bg-indigo-50"}`}
              >
                <Users size={14} /> Atur
              </button>
            </div>
          </div>
        </div>

        {/* Tab (laptop) + status */}
        <div className="flex items-end justify-between mt-4 md:mt-6 md:border-b border-slate-200">
          <div className="hidden md:flex gap-1">
            {tabs.map(({ id, label, Icon, on }) => (
              <button
                key={id}
                onClick={() => goTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${tab === id && !viewingMember ? on : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 md:pb-2 ml-auto">
            <span className={`text-xs ${status === "error" ? "text-rose-500" : "text-slate-400"}`}>{STATUS_TEXT[status]}</span>
            <button onClick={() => setShowHistory((v) => !v)} title="Riwayat" className={`p-2 md:p-1.5 rounded-md hover:text-slate-600 hover:bg-slate-100 ${showHistory ? "text-slate-700 bg-slate-100" : "text-slate-400"}`}>
              <HistoryIcon size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 md:mt-5">
          {showManage && (
            <ManagePanel
              people={people}
              onRename={(i, v) => upd("people", i, "name", v)}
              onSetPhoto={setPhoto}
              onRemove={removePerson}
              onRestore={restorePerson}
              onAdd={addPerson}
              onOpenMember={(i) => {
                setShowManage(false);
                openMember(i);
              }}
              onClose={() => setShowManage(false)}
            />
          )}
          {showHistory && <HistoryPanel onRestore={restore} onClose={() => setShowHistory(false)} />}

          {/* ═════════ HALAMAN ANGGOTA ═════════ */}
          {viewingMember && (
            <MemberPage
              index={memberIdx}
              people={people}
              expenses={expenses}
              packing={packing}
              monthLabels={monthLabels}
              curIdx={curIdx}
              monthly={monthly}
              monthsOf={monthsOf}
              personTotal={personTotal}
              fundShare={fundShare}
              fmt={fmt}
              rateOf={rateOf}
              homeEps={homeEps}
              onSetPaid={setPaidMany}
              onRename={(v) => upd("people", memberIdx, "name", v)}
              onOpenMember={openMember}
              onOpenExpense={openExpense}
              onBack={closeHash}
            />
          )}

          {/* ═════════ NABUNG ═════════ */}
          {!viewingMember && tab === "save" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-x-6 gap-y-3 items-center">
                <label className="flex items-center justify-between md:justify-start gap-2 text-sm w-full md:w-auto">
                  <span className="text-slate-500 font-medium">Mulai nabung</span>
                  <input
                    type="month"
                    value={saveStart}
                    onChange={(e) => setTrip("saveStart", e.target.value || thisMonth())}
                    className="text-sm bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </label>
                <label className="flex items-center justify-between md:justify-start gap-2 text-sm w-full md:w-auto">
                  <span className="text-slate-500 font-medium">Berhenti nabung</span>
                  <input
                    type="month"
                    value={saveEnd}
                    min={saveStart}
                    max={addMonths(saveStart, MAX_MONTHS - 1)}
                    onChange={(e) => setTrip("saveEnd", e.target.value || addMonths(saveStart, DEFAULT_MONTHS - 1))}
                    className={`text-sm bg-slate-50 border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${endBeforeStart ? "border-rose-300" : "border-slate-200"}`}
                  />
                </label>
                <label className="flex items-center justify-between md:justify-start gap-2 text-sm w-full md:w-auto">
                  <span className="text-slate-500 font-medium">Minimal / bulan</span>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md pl-2">
                    <span className="text-slate-400">{home.symbol}</span>
                    <Cell type="number" value={trip.monthly} onChange={(v) => setTrip("monthly", v)} className="w-32" placeholder="Belum ditentukan" />
                  </div>
                </label>
                {endBeforeStart && <span className="text-xs text-rose-500 w-full">Bulan berhenti ada sebelum bulan mulai.</span>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Total tabungan" value={fmt(totalSaved)} accent="bg-emerald-500" />
                <Stat
                  label={curLabel ? `Terkumpul ${curLabel}` : "Bulan ini"}
                  value={curLabel ? fmt(monthTotal(curIdx)) : "–"}
                  accent="bg-teal-500"
                  sub={curLabel ? `${paidThisMonth} dari ${activeIdx.length} udah setor` : curIdx < 0 ? "Belum mulai" : "Periode udah selesai"}
                />
                <Stat label="Target minimal per orang" value={monthly ? fmt(monthly * nMonths) : "Belum diatur"} accent="bg-amber-400" />
                <Stat label="Sisa bulan" value={monthsLeft} accent="bg-indigo-400" sub={curLabel ? `Bulan ke-${curIdx + 1} dari ${nMonths}` : null} />
              </div>

              {monthly > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-600">Menuju target minimal</span>
                    <span className="font-semibold text-emerald-600">{groupTarget ? Math.round((totalSaved / groupTarget) * 100) : 0}%</span>
                  </div>
                  <Bar pct={groupTarget ? (totalSaved / groupTarget) * 100 : 0} color="bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>
              )}

              {/* HP */}
              <div className="md:hidden">
                <SaveMobile people={people} activeIdx={activeIdx} monthLabels={monthLabels} curIdx={curIdx} monthly={monthly} monthsOf={monthsOf} personTotal={personTotal} updMonth={updMonth} fmt={fmt} />
              </div>

              {/* Laptop */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <TH className="sticky left-0 bg-slate-50 z-10">Anggota</TH>
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
                    {activeIdx.map((i) => {
                      const p = people[i];
                      return (
                        <tr key={p.id || i}>
                          <td className="px-3 py-1 sticky left-0 bg-white z-10 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openMember(i)} title={p.name} className="rounded-full hover:scale-110 transition">
                                <Avatar name={p.name} i={i} photo={p.photo} />
                              </button>
                              <Cell value={p.name} onChange={(v) => upd("people", i, "name", v)} className="font-medium w-28" />
                            </div>
                          </td>
                          {monthsOf(p).map((v, k) => (
                            <td key={k} className={`p-0.5 ${k === curIdx ? "bg-emerald-50/50" : ""}`}>
                              <div className={`rounded-md ${cellTint(v, k)}`}>
                                <Cell type="number" value={v} onChange={(nv) => updMonth(i, k, nv)} className="w-24 text-center hover:bg-transparent" placeholder="–" />
                              </div>
                            </td>
                          ))}
                          <td className="px-3 text-sm text-right font-semibold bg-slate-50">{fmt(personTotal(p))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-3 py-2.5 text-sm font-semibold sticky left-0 bg-slate-50 z-10">Total</td>
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
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> Udah setor
                </span>
                {monthly > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Kurang dari minimal
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-100 border border-rose-200" /> Bolong
                </span>
              </div>
              {removedSaved > 0 && (
                <p className="text-xs text-slate-500">
                  Termasuk {fmt(removedSaved)} dari yang udah keluar ({removedSavers.map((p) => p.name).join(", ")}).
                </p>
              )}
              {hiddenSavings && <p className="text-xs text-amber-600">Ada setoran setelah {lastLabel} yang disembunyikan. Muncul lagi kalau bulan berhenti dimundurin.</p>}
            </div>
          )}

          {/* ═════════ IDE ═════════ */}
          {!viewingMember && tab === "ideas" && <IdeasTab data={data} setData={setData} />}

          {/* ═════════ ITINERARY ═════════ */}
          {!viewingMember && tab === "itinerary" && (
            <>
              <div className="md:hidden">
                <ItineraryMobile days={days} setDays={setDays} />
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full min-w-max border-collapse">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide w-48">Hari</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Jam</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tempat</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Kegiatan</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Kira-kira harga</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide bg-amber-500">Catatan</th>
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
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DAY_TINT[di % DAY_TINT.length]}`}>Hari {di + 1}</span>
                                  <Del onClick={() => delDay(di)} title="Hapus hari" />
                                </div>
                                {day.date && <div className="text-base font-semibold text-slate-800 mt-2 px-2 capitalize">{weekday(day.date)}</div>}
                                <Cell type="date" value={day.date} onChange={(v) => updDay(di, "date", v)} className="text-slate-500 w-40" />
                                <Cell value={day.label} onChange={(v) => updDay(di, "label", v)} className="text-xs text-slate-500" placeholder="Judul (opsional)" />
                                <div className="text-xs text-slate-400 px-2 mt-1">{day.rows.length} tempat</div>
                              </td>
                            )}
                            {r ? (
                              <>
                                <td className="px-1 py-0.5 align-top">
                                  <Cell value={r.time} onChange={(v) => updRow(di, ri, "time", v)} className="w-32 tabular-nums" placeholder="11.00 - 13.30" />
                                </td>
                                <td className="px-1 py-0.5 align-top min-w-56">
                                  <div className="flex items-center gap-0.5">
                                    <Cell value={r.place} onChange={(v) => updRow(di, ri, "place", v)} className={r.link ? "text-indigo-600 underline underline-offset-2" : ""} placeholder="Tempat" />
                                    {r.link && isUrl(r.link) && (
                                      <a href={r.link} target="_blank" rel="noreferrer" title="Buka link" className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => setLinkEdit(linkEdit === r.id ? null : r.id)}
                                      title="Link"
                                      className={`p-1 rounded hover:bg-slate-100 ${r.link ? "text-indigo-400" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
                                    >
                                      <Link2 size={14} />
                                    </button>
                                  </div>
                                  {linkEdit === r.id && (
                                    <Cell autoFocus value={r.link} onChange={(v) => updRow(di, ri, "link", v)} onBlur={() => setLinkEdit(null)} className="text-xs text-indigo-600 bg-indigo-50 mt-0.5" placeholder="Tempel link" />
                                  )}
                                </td>
                                <td className="px-1 py-0.5 align-top">
                                  <Cell value={r.activity} onChange={(v) => updRow(di, ri, "activity", v)} className="min-w-40" placeholder="Kegiatan" />
                                </td>
                                <td className="px-1 py-0.5 align-top">
                                  <Cell value={r.price} onChange={(v) => updRow(di, ri, "price", v)} className="w-32" placeholder="RM20-40" />
                                </td>
                                <td className="px-1 py-0.5 align-top min-w-64">
                                  <div className="flex items-center gap-0.5">
                                    <Cell value={r.notes} onChange={(v) => updRow(di, ri, "notes", v)} className={isUrl(r.notes) ? "text-indigo-600 truncate" : ""} placeholder="Catatan" />
                                    {isUrl(r.notes) && (
                                      <a href={r.notes.trim()} target="_blank" rel="noreferrer" title="Buka link" className="p-1 text-indigo-500 hover:bg-indigo-50 rounded">
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 align-top pt-1 opacity-0 group-hover:opacity-100 transition">
                                  <Del onClick={() => delRow(di, ri)} title="Hapus baris" />
                                </td>
                              </>
                            ) : (
                              <td colSpan={6} className="px-2 py-1.5">
                                <button onClick={() => addRow(di)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md">
                                  <Plus size={14} /> Tambah baris
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                  {days.length === 0 && <div className="text-center text-sm text-slate-400 py-10">Belum ada hari.</div>}
                </div>
                <div className="mt-4">
                  <Btn onClick={addDay} color="bg-indigo-500 hover:bg-indigo-600">
                    <Plus size={16} /> Tambah hari
                  </Btn>
                </div>
              </div>
            </>
          )}

          {/* ═════════ PENGELUARAN ═════════ */}
          {!viewingMember && tab === "budget" && (
            <BudgetTab
              people={people}
              expenses={expenses}
              currencies={currencies}
              home={home}
              fmt={fmt}
              rateOf={rateOf}
              activeIdx={activeIdx}
              isActive={isActive}
              totalHome={totalHome}
              fundSpent={fundSpent}
              fundLeft={fundLeft}
              missingRate={missingRate}
              meIdx={meIdx}
              setData={setData}
              updCur={updCur}
              delCur={delCur}
              expenseId={expenseId}
              openExpense={openExpense}
              closeExpense={closeHash}
              openMember={openMember}
              onSetPaid={setPaidMany}
            />
          )}

          {/* ═════════ BAWAAN ═════════ */}
          {!viewingMember && tab === "packing" && <PackingTab people={people} activeIdx={activeIdx} isActive={isActive} packing={packing} setPacking={setPacking} meIdx={meIdx} setMe={setMe} />}
        </div>
      </div>

      {/* Navigasi bawah (HP) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {tabs.map(({ id, label, Icon, on }) => {
            const active = tab === id && !viewingMember;
            return (
              <button key={id} onClick={() => goTab(id)} className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition ${active ? on.split(" ")[0] : "text-slate-400"}`}>
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
