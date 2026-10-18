// Shared helpers for the Ideas board and idea pages

export const AVATAR = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500"];
export const IDEA_CATS = ["Food", "Sights", "Shopping", "Stay", "Activity", "Info"];
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
export const dayLabel = (d, i) => `Day ${i + 1}${d.date ? ` · ${weekday(d.date)}` : ""}${d.label ? ` · ${d.label}` : ""}`;

// The starred photo, or the first photo if nobody picked one
export const coverOf = (x) => {
  const photos = x.photos || [];
  return photos.find((p) => p.id === x.cover) || photos[0] || null;
};
export const firstLinkOf = (x) => (x.links || [])[0]?.url || "";
export const titleOf = (x) => x.text || domainOf(firstLinkOf(x)) || "Untitled idea";

export const Avatar = ({ name, i, size = "w-6 h-6 text-xs" }) => (
  <span className={`inline-flex ${size} shrink-0 rounded-full ${AVATAR[i % 8]} text-white font-semibold items-center justify-center`}>{(name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
);

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
      reject(new Error(`Couldn't read ${file.name}. Try a JPG or PNG.`));
    };
    img.src = url;
  });

// Shrink a photo on the device before uploading (max 1600px, JPEG)
export async function shrinkImage(file, max = 1600, quality = 0.82) {
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't compress the photo."))), "image/jpeg", quality));
  return { blob, w, h };
}

export async function uploadPhoto(file) {
  const { blob, w, h } = await shrinkImage(file);
  const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error || `Couldn't upload ${file.name}.`);
  return { id: uid(), url: body.url, w, h };
}
