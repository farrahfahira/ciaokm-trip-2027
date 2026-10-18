// Helper yang dipakai di banyak file

export const AVATAR = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500"];
export const CATS = ["Stay", "Transport", "Food", "Activities", "Shopping", "Other"];
export const CAT_LABEL = { Stay: "Penginapan", Transport: "Transportasi", Food: "Makan", Activities: "Aktivitas", Shopping: "Belanja", Other: "Lainnya" };
export const CAT_TINT = {
  Stay: "bg-indigo-50 text-indigo-700",
  Transport: "bg-sky-50 text-sky-700",
  Food: "bg-amber-50 text-amber-700",
  Activities: "bg-emerald-50 text-emerald-700",
  Shopping: "bg-rose-50 text-rose-700",
  Other: "bg-slate-100 text-slate-600",
};
export const NO_DECIMALS = ["IDR", "JPY", "KRW", "VND"];
export const FUND = -1; // nilai "Siapa yang bayar" kalau dibayar pakai kas

export const num = (v) => Number(v) || 0;
export const isFund = (e) => e.paidBy === FUND;

export const normCat = (c) => {
  const s = String(c || "").toLowerCase();
  return CATS.find((x) => s.includes(x.toLowerCase().slice(0, 4))) || (s.includes("fun") ? "Activities" : "Other");
};

export const fmtDay = (ms) => (ms ? new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "");

// Udah lunas? Yang bayar otomatis lunas. Pengeluaran lama yang dulu ditandai "settled" juga dihitung lunas.
export const isPaidBack = (e, j) => j === e.paidBy || !!e.settled || !!(e.paid && e.paid[j]);

// Bagian tiap orang yang harus dibayar balik ke yang bayar (kas nggak dihitung)
export const sharesOf = (e, n) => {
  if (isFund(e) || !num(e.amount) || e.paidBy < 0 || e.paidBy >= n) return [];
  const split = e.split.filter((j) => j < n);
  if (!split.length) return [];
  const each = num(e.amount) / split.length;
  return split.filter((j) => j !== e.paidBy).map((j) => ({ e, from: j, to: e.paidBy, amount: each, cur: e.cur, paid: isPaidBack(e, j), mark: (e.paid && e.paid[j]) || null }));
};
export const allShares = (expenses, n) => expenses.flatMap((e) => sharesOf(e, n));

// Foto profil kalau ada, kalau nggak lingkaran warna dengan huruf depan
export const Avatar = ({ name, i, photo, size = "w-7 h-7 text-xs", className = "" }) =>
  photo ? (
    <img src={photo} alt={name || ""} className={`inline-block ${size} shrink-0 rounded-full object-cover bg-slate-100 ${className}`} />
  ) : (
    <span className={`inline-flex ${size} shrink-0 rounded-full ${AVATAR[i % 8]} text-white font-semibold items-center justify-center ${className}`}>{(name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
  );
