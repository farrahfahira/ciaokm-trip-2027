// Helper buat tab Ide dan halaman ide

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

// Foto yang dijadiin sampul, atau foto pertama kalau belum ada
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
      reject(new Error(`${file.name} nggak kebaca. Coba pakai JPG atau PNG.`));
    };
    img.src = url;
  });

// Kecilin foto di HP dulu sebelum diupload (JPEG, sisi terpanjang = max)
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
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal ngecilin foto."))), "image/jpeg", quality));
  return { blob, w, h };
}

export async function uploadPhoto(file, max = 1600) {
  const { blob, w, h } = await shrinkImage(file, max);
  const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(`Gagal upload ${file.name}.`);
  return { id: uid(), url: body.url, w, h };
}
