// Helper untuk tab Ide dan halaman ide

import { Utensils, Landmark, ShoppingBag, BedDouble, Footprints, Info, Image as ImageIcon } from "lucide-react";

export { AVATAR, Avatar } from "./shared";

export const IDEA_CATS = ["Food", "Sights", "Shopping", "Stay", "Activity", "Info"];
export const IDEA_LABEL = { Food: "Makan", Sights: "Wisata", Shopping: "Belanja", Stay: "Penginapan", Activity: "Aktivitas", Info: "Info" };
export const IDEA_TINT = {
  Food: "bg-amber-50 text-amber-700",
  Sights: "bg-indigo-50 text-indigo-700",
  Shopping: "bg-rose-50 text-rose-700",
  Stay: "bg-sky-50 text-sky-700",
  Activity: "bg-emerald-50 text-emerald-700",
  Info: "bg-slate-100 text-slate-600",
};

// Gambar pengganti untuk ide yang belum punya foto, sesuai kategorinya
const PLACEHOLDER = {
  Food: { bg: "bg-amber-50", fg: "text-amber-500", Icon: Utensils },
  Sights: { bg: "bg-indigo-50", fg: "text-indigo-400", Icon: Landmark },
  Shopping: { bg: "bg-rose-50", fg: "text-rose-400", Icon: ShoppingBag },
  Stay: { bg: "bg-sky-50", fg: "text-sky-500", Icon: BedDouble },
  Activity: { bg: "bg-emerald-50", fg: "text-emerald-500", Icon: Footprints },
  Info: { bg: "bg-slate-100", fg: "text-slate-400", Icon: Info },
};
export function IdeaPlaceholder({ cat, size = 28, showLabel = true, className = "" }) {
  const p = PLACEHOLDER[cat] || { bg: "bg-slate-100", fg: "text-slate-300", Icon: ImageIcon };
  const Icon = p.Icon;
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${p.bg} ${p.fg} ${className}`}>
      <Icon size={size} strokeWidth={1.75} />
      {showLabel && IDEA_LABEL[cat] && <span className="text-[11px] font-medium opacity-80">{IDEA_LABEL[cat]}</span>}
    </div>
  );
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const URL_RE = /https?:\/\/\S+/i;
export const domainOf = (link) => {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const weekday = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" }) : "");
export const dayLabel = (d, i) => `Hari ${i + 1}${d.date ? `, ${weekday(d.date)}` : ""}${d.label ? `, ${d.label}` : ""}`;

// Foto yang dijadikan sampul, atau foto pertama kalau belum dipilih
export const coverOf = (x) => {
  const photos = x.photos || [];
  return photos.find((p) => p.id === x.cover) || photos[0] || null;
};
export const firstLinkOf = (x) => (x.links || [])[0]?.url || "";
export const titleOf = (x) => x.text || domainOf(firstLinkOf(x)) || "Ide tanpa nama";

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} tidak bisa dibaca. Coba gunakan JPG atau PNG.`));
    };
    img.src = url;
  });

// Kecilkan foto di perangkat sebelum diunggah (JPEG, sisi terpanjang = max)
export async function shrinkImage(file, max = 1600, quality = 0.82) {
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal mengecilkan foto."))), "image/jpeg", quality));
  return { blob, w, h };
}

export async function uploadPhoto(file, max = 1600) {
  const { blob, w, h } = await shrinkImage(file, max);
  const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(`Gagal mengunggah ${file.name}.`);
  return { id: uid(), url: body.url, w, h };
}
