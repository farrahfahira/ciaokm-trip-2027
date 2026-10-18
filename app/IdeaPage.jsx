"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Heart, CalendarPlus, Check, Star, Trash2, X, ChevronLeft, ChevronRight, Plus, ExternalLink, ImagePlus } from "lucide-react";
import { Sheet } from "./MobileViews";
import { IDEA_CATS, IDEA_LABEL, IDEA_TINT, IdeaPlaceholder, uid, domainOf, dayLabel, coverOf, firstLinkOf, Avatar, uploadPhoto } from "./ideaUtils";

const field = "w-full text-base bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400";
const lbl = "block text-sm font-medium text-slate-600 mb-1.5";

export default function IdeaPage({ idea, people, cities, days, me, setIdea, onToggleLike, onMoveToDay, onAddCity, onDelete, onBack }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [edit, setEdit] = useState(null);
  const [editError, setEditError] = useState("");

  const photos = idea.photos || [];
  const links = idea.links || [];
  const cover = coverOf(idea);
  const likes = (idea.likes || []).filter((p) => p < people.length);
  const mine = me !== null && likes.includes(me);
  const city = cities.find((c) => c.id === idea.city);
  const plannedIdx = idea.planned ? days.findIndex((d) => d.id === idea.plannedDay) : -1;
  const by = idea.by != null && people[idea.by] ? people[idea.by].name : null;
  const meta = [idea.cat && IDEA_LABEL[idea.cat], city?.name, by && `Ditambahkan ${by}`].filter(Boolean).join(" · ");
  const title = idea.text || domainOf(firstLinkOf(idea)) || "Ide tanpa nama";

  // ── foto ──
  const addPhotos = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setErrors([]);
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const photo = await uploadPhoto(file);
        setIdea((x) => ({ ...x, photos: [...(x.photos || []), photo] }));
      } catch (e) {
        setErrors((es) => [...es, e.message]);
      }
      setUploading((n) => n - 1);
    }
  };
  const delPhoto = (pid) => {
    if (!confirm("Hapus foto ini?")) return;
    setIdea((x) => ({ ...x, photos: (x.photos || []).filter((p) => p.id !== pid), cover: x.cover === pid ? "" : x.cover }));
    setViewer(null);
  };
  const viewerIdx = photos.findIndex((p) => p.id === viewer);
  const viewerPhoto = viewerIdx >= 0 ? photos[viewerIdx] : null;
  const step = (d) => {
    if (viewerIdx < 0 || photos.length < 2) return;
    setViewer(photos[(viewerIdx + d + photos.length) % photos.length].id);
  };
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── itinerary ──
  const unplan = () => {
    if (!confirm("Keluarkan dari itinerary?\n\nBaris yang sudah ada di itinerary tidak ikut terhapus.")) return;
    setIdea((x) => ({ ...x, planned: false }));
  };

  // ── form ubah ──
  const openEdit = () => {
    setEditError("");
    setEdit({ text: idea.text || "", links: [...links], city: city ? idea.city : "", cat: idea.cat || "", note: idea.note || "", newLink: "", newCity: null });
  };
  const setE = (f, v) => setEdit((e) => ({ ...e, [f]: v }));
  const addEditLink = () => {
    const raw = edit.newLink.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setEdit((e) => ({ ...e, links: [...e.links, { id: uid(), url }], newLink: "" }));
  };
  const addEditCity = () => {
    const name = (edit.newCity || "").trim();
    if (!name) {
      setE("newCity", null);
      return;
    }
    const id = onAddCity(name);
    setEdit((e) => ({ ...e, city: id, newCity: null }));
  };
  const saveEdit = () => {
    const text = edit.text.trim();
    let list = edit.links;
    const pending = edit.newLink.trim();
    if (pending) list = [...list, { id: uid(), url: /^https?:\/\//i.test(pending) ? pending : `https://${pending}` }];
    if (!text && !list.length) return setEditError("Isi nama atau link terlebih dahulu.");
    setIdea((x) => ({ ...x, text, links: list, city: edit.city, cat: edit.cat, note: edit.note.trim() }));
    setEdit(null);
  };
  const deleteIdea = () => {
    if (!confirm("Hapus ide ini beserta fotonya?")) return;
    setEdit(null);
    onDelete();
  };

  const overlayBtn = "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white shadow-sm";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Sampul */}
      <div className="relative">
        {cover ? <img src={cover.url} alt="" className="w-full h-56 md:h-72 object-cover bg-slate-100" /> : <IdeaPlaceholder cat={idea.cat} size={40} className="w-full h-44 md:h-56" />}
        <button onClick={onBack} className={`${overlayBtn} absolute top-3 left-3`}>
          <ArrowLeft size={15} /> Kembali
        </button>
        <button onClick={openEdit} className={`${overlayBtn} absolute top-3 right-3`}>
          <Pencil size={14} /> Ubah
        </button>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* Judul */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 break-words">{title}</h2>
          {meta && <p className="text-sm text-slate-400 mt-1">{meta}</p>}
        </div>

        {/* Aksi */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleLike}
              className={`inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg transition ${mine ? "bg-rose-50 text-rose-600" : "border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-50"}`}
            >
              <Heart size={16} fill={mine ? "currentColor" : "none"} /> Tertarik
            </button>
            {idea.planned ? (
              <button onClick={unplan} className="inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Check size={16} /> {plannedIdx >= 0 ? `Hari ${plannedIdx + 1}` : "Di itinerary"}
              </button>
            ) : days.length > 0 ? (
              <label className="relative inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-50 cursor-pointer">
                <CalendarPlus size={16} /> Masukkan Itinerary
                <select value="" onChange={(e) => e.target.value && onMoveToDay(e.target.value)} className="absolute inset-0 w-full opacity-0 cursor-pointer">
                  <option value="">Pilih hari</option>
                  {days.map((d, i) => (
                    <option key={d.id} value={d.id}>
                      {dayLabel(d, i)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="inline-flex items-center justify-center text-sm py-2.5 rounded-lg border border-dashed border-slate-200 text-slate-400">Belum ada hari</span>
            )}
          </div>
          {likes.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {likes.map((p) => (
                  <span key={p} title={people[p].name} className="ring-2 ring-white rounded-full">
                    <Avatar name={people[p].name} i={p} photo={people[p].photo} size="w-6 h-6 text-[10px]" />
                  </span>
                ))}
              </div>
              <span className="text-sm text-slate-500">{likes.length} tertarik</span>
            </div>
          )}
        </div>

        {/* Catatan */}
        {idea.note && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-1.5">Catatan</h3>
            <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line break-words">{idea.note}</p>
          </section>
        )}

        {/* Link */}
        {links.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-2">Link</h3>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" title={l.url} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg max-w-full">
                  <ExternalLink size={14} className="shrink-0" /> <span className="truncate">{domainOf(l.url) || l.url}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Foto */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-2">Foto</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map((p) => {
              const isCover = cover && cover.id === p.id;
              return (
                <button key={p.id} onClick={() => setViewer(p.id)} className={`relative aspect-square rounded-lg overflow-hidden bg-slate-100 ${isCover ? "ring-2 ring-violet-500 ring-offset-1" : ""}`}>
                  <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {isCover && (
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 text-[10px] font-medium bg-violet-500 text-white px-1.5 py-0.5 rounded">
                      <Star size={10} /> Sampul
                    </span>
                  )}
                </button>
              );
            })}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`up-${i}`} className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Tambah foto"
              className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-violet-300 active:bg-violet-50 flex items-center justify-center text-slate-400"
            >
              <ImagePlus size={20} />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-rose-500 mt-2">
              {err}
            </p>
          ))}
        </section>
      </div>

      {/* Lihat foto */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between gap-2 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-white/60">
              {viewerIdx + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-1">
              {cover && cover.id === viewerPhoto.id ? (
                <span className="inline-flex items-center gap-1 text-sm px-3 py-2 text-violet-300">
                  <Star size={15} /> Sampul
                </span>
              ) : (
                <button onClick={() => setIdea((x) => ({ ...x, cover: viewerPhoto.id }))} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg hover:bg-white/10">
                  <Star size={15} /> Jadikan sampul
                </button>
              )}
              <button onClick={() => delPhoto(viewerPhoto.id)} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg hover:bg-white/10">
                <Trash2 size={15} /> Hapus
              </button>
              <button onClick={() => setViewer(null)} aria-label="Tutup" className="p-2 rounded-lg hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center relative px-12 pb-6">
            <img src={viewerPhoto.url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Sebelumnya"
                  className="absolute left-1 p-2.5 rounded-full text-white hover:bg-white/10"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Berikutnya"
                  className="absolute right-1 p-2.5 rounded-full text-white hover:bg-white/10"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ubah ide */}
      {edit && (
        <Sheet
          title="Ubah ide"
          onClose={() => setEdit(null)}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={deleteIdea} className="text-sm text-rose-500 hover:bg-rose-50 active:bg-rose-50 px-3 py-2.5 rounded-lg">
                Hapus
              </button>
              <button onClick={() => setEdit(null)} className="ml-auto text-sm text-slate-500 px-4 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-100">
                Batal
              </button>
              <button onClick={saveEdit} className="text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 active:bg-violet-600 px-6 py-2.5 rounded-lg">
                Simpan
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className={lbl}>Nama</label>
              <input value={edit.text} onChange={(e) => setE("text", e.target.value)} placeholder="Nama tempat atau ide" className={field} />
            </div>

            <div>
              <label className={lbl}>Link</label>
              {edit.links.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {edit.links.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 bg-slate-50 rounded-lg pl-3 pr-1 py-1">
                      <span className="flex-1 min-w-0 truncate text-sm text-indigo-600">{domainOf(l.url) || l.url}</span>
                      <button onClick={() => setEdit((e) => ({ ...e, links: e.links.filter((x) => x.id !== l.id) }))} aria-label="Hapus link" className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  inputMode="url"
                  value={edit.newLink}
                  onChange={(e) => setE("newLink", e.target.value)}
                  placeholder="Tempel link"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEditLink();
                    }
                  }}
                  className={field}
                />
                <button onClick={addEditLink} className="shrink-0 text-sm font-medium text-violet-700 bg-violet-50 px-3 rounded-lg">
                  Tambah
                </button>
              </div>
            </div>

            <div>
              <label className={lbl}>Kota</label>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setE("city", edit.city === c.id ? "" : c.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${edit.city === c.id ? "bg-violet-50 text-violet-700 ring-1 ring-violet-300 font-medium" : "bg-slate-50 text-slate-500"}`}
                  >
                    {c.name || "Tanpa nama"}
                  </button>
                ))}
                {edit.newCity === null ? (
                  <button onClick={() => setE("newCity", "")} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-dashed border-violet-300 text-violet-600">
                    <Plus size={14} /> Kota
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      autoFocus
                      value={edit.newCity}
                      onChange={(e) => setE("newCity", e.target.value)}
                      placeholder="Nama kota"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEditCity();
                        }
                        if (e.key === "Escape") setE("newCity", null);
                      }}
                      className={field}
                    />
                    <button onClick={addEditCity} className="shrink-0 text-sm font-medium text-violet-700 bg-violet-50 px-3 py-2.5 rounded-lg">
                      Tambah
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={lbl}>Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {IDEA_CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setE("cat", edit.cat === c ? "" : c)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${edit.cat === c ? `${IDEA_TINT[c]} ring-1 ring-current font-medium` : "bg-slate-50 text-slate-500"}`}
                  >
                    {IDEA_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={lbl}>Catatan</label>
              <textarea rows={4} value={edit.note} onChange={(e) => setE("note", e.target.value)} placeholder="Jam buka, harga, cara ke sana" className={`${field} resize-none`} />
            </div>

            {editError && <p className="text-sm text-rose-500">{editError}</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
