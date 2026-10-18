// Shared helpers used across the app

export const AVATAR = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500"];
export const CATS = ["Stay", "Transport", "Food", "Activities", "Shopping", "Other"];
export const CAT_TINT = {
  Stay: "bg-indigo-50 text-indigo-700",
  Transport: "bg-sky-50 text-sky-700",
  Food: "bg-amber-50 text-amber-700",
  Activities: "bg-emerald-50 text-emerald-700",
  Shopping: "bg-rose-50 text-rose-700",
  Other: "bg-slate-100 text-slate-600",
};
export const NO_DECIMALS = ["IDR", "JPY", "KRW", "VND"];
export const FUND = -1; // "Paid by" value for expenses paid from the group fund

export const num = (v) => Number(v) || 0;
export const isFund = (e) => e.paidBy === FUND;

export const normCat = (c) => {
  const s = String(c || "").toLowerCase();
  return CATS.find((x) => s.includes(x.toLowerCase().slice(0, 4))) || (s.includes("fun") ? "Activities" : "Other");
};

// Minimal list of transfers to settle balances
export const settle = (bal, dec) => {
  const eps = dec === 0 ? 0.5 : 0.005;
  const cr = bal
    .map((v, i) => ({ i, v }))
    .filter((x) => x.v > eps)
    .sort((a, b) => b.v - a.v);
  const db = bal
    .map((v, i) => ({ i, v: -v }))
    .filter((x) => x.v > eps)
    .sort((a, b) => b.v - a.v);
  const out = [];
  let x = 0,
    y = 0;
  while (x < db.length && y < cr.length) {
    const m = Math.min(db[x].v, cr[y].v);
    out.push({ from: db[x].i, to: cr[y].i, amt: m });
    db[x].v -= m;
    cr[y].v -= m;
    if (db[x].v <= eps) x++;
    if (cr[y].v <= eps) y++;
  }
  return out;
};

// Profile photo if there is one, otherwise a coloured circle with their initial
export const Avatar = ({ name, i, photo, size = "w-7 h-7 text-xs", className = "" }) =>
  photo ? (
    <img src={photo} alt={name || ""} className={`inline-block ${size} shrink-0 rounded-full object-cover bg-slate-100 ${className}`} />
  ) : (
    <span className={`inline-flex ${size} shrink-0 rounded-full ${AVATAR[i % 8]} text-white font-semibold items-center justify-center ${className}`}>{(name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
  );
