"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trash2, ExternalLink, Heart, Check, ImagePlus, Star, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { IDEA_CATS, IDEA_TINT, uid, domainOf, dayLabel, coverOf, firstLinkOf, Avatar, uploadPhoto } from "./ideaUtils";

export default function IdeaPage({ idea, people, cities, days, me, needMe, setMe, setIdea, onDelete, onToggleLike, onMoveToDay, onBack }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState([]);
  const [viewer, setViewer] = useState(null); // id of the photo shown large
  const [newLink, setNewLink] = useState("");

  const photos = idea.photos || [];
  const links = idea.links || [];
  const cover = coverOf(idea);
  const likes = (idea.likes || []).filter((p) => p < people.length);
  const mine = me !== null && likes.includes(me);
  const cityValue = cities.some((c) => c.id === idea.city) ? idea.city : "";
  const plannedIdx = idea.planned ? days.findIndex((d) => d.id === idea.plannedDay) : -1;
  const dom = domainOf(firstLinkOf(idea));
  const set = (f, v) => setIdea((x) => ({ ...x, [f]: v }));

  // ── photos ──
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
    if (!confirm("Delete this photo?")) return;
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

  // ── links ──
  const addLink = () => {
    const raw = newLink.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setIdea((x) => ({ ...x, links: [...(x.links || []), { id: uid(), url }] }));
    setNewLink("");
  };
  const delLink = (lid) => setIdea((x) => ({ ...x, links: (x.links || []).filter((l) => l.id !== lid) }));

  const backBtn = "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Cover */}
      {cover ? (
        <div className="relative bg-slate-100">
          <img src={cover.url} alt="" className="w-full max-h-80 object-cover" />
          <button onClick={onBack} className={`${backBtn} absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white shadow-sm`}>
            <ArrowLeft size={15} /> Back to ideas
          </button>
        </div>
      ) : (
        <div className="px-5 pt-4">
          <button onClick={onBack} className={`${backBtn} -ml-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100`}>
            <ArrowLeft size={15} /> Back to ideas
          </button>
        </div>
      )}

      <div className="p-5 md:p-6 space-y-7">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={idea.cat || ""}
              onChange={(e) => set("cat", e.target.value)}
              className={`text-xs font-medium rounded-md px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300 ${idea.cat ? IDEA_TINT[idea.cat] : "bg-slate-50 text-slate-400"}`}
            >
              <option value="">Category</option>
              {IDEA_CATS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={cityValue} onChange={(e) => set("city", e.target.value)} className="text-xs rounded-md px-2 py-1.5 bg-slate-50 text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300">
              <option value="">Unsorted</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed"}
                </option>
              ))}
            </select>
            <button onClick={onDelete} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-md">
              <Trash2 size={14} /> Delete idea
            </button>
          </div>

          <input
            value={idea.text || ""}
            onChange={(e) => set("text", e.target.value)}
            placeholder={dom ? `Name this ${dom} link` : "Name this idea"}
            className="w-full text-2xl font-bold text-slate-800 bg-transparent px-2 py-1 -ml-2 rounded-md hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-300 placeholder:font-normal"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onToggleLike}
              title={mine ? "Not interested anymore" : "I'm interested"}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${mine ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500 hover:text-rose-500 hover:bg-rose-50"}`}
            >
              <Heart size={16} fill={mine ? "currentColor" : "none"} /> {mine ? "Interested" : "I'm interested"}
            </button>
            {likes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {likes.map((p) => (
                    <span key={p} title={people[p].name} className="ring-2 ring-white rounded-full">
                      <Avatar name={people[p].name} i={p} />
                    </span>
                  ))}
                </div>
                <span className="text-xs text-slate-400">{likes.length} interested</span>
              </div>
            )}
            {needMe && (
              <select value="" onChange={(e) => e.target.value !== "" && setMe(Number(e.target.value))} className="text-sm rounded-md px-2 py-1.5 bg-slate-100 ring-2 ring-rose-300 cursor-pointer focus:outline-none">
                <option value="">Pick your name first</option>
                {people.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <div className="ml-auto">
              {idea.planned ? (
                <button onClick={() => set("planned", false)} title="Mark as not planned (the itinerary row stays)" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                  <Check size={15} /> Planned{plannedIdx >= 0 ? ` for Day ${plannedIdx + 1}` : ""}
                </button>
              ) : (
                days.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && onMoveToDay(e.target.value)}
                    className="text-sm rounded-lg px-3 py-1.5 bg-violet-50 text-violet-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    <option value="">Move to day…</option>
                    {days.map((d, i) => (
                      <option key={d.id} value={d.id}>
                        {dayLabel(d, i)}
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>
          </div>
          {idea.by != null && people[idea.by] && <div className="text-xs text-slate-400">Added by {people[idea.by].name}</div>}
        </div>

        {/* Photos */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-600">Photos</h3>
            {photos.length > 0 && <span className="text-xs text-slate-400">Tap a photo to view it or make it the cover</span>}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map((p) => {
              const isCover = cover && cover.id === p.id;
              return (
                <button key={p.id} onClick={() => setViewer(p.id)} className={`relative aspect-square rounded-lg overflow-hidden bg-slate-100 ${isCover ? "ring-2 ring-violet-500 ring-offset-1" : ""}`}>
                  <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {isCover && (
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 text-[10px] font-medium bg-violet-500 text-white px-1.5 py-0.5 rounded">
                      <Star size={10} /> Cover
                    </span>
                  )}
                </button>
              );
            })}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`up-${i}`} className="aspect-square rounded-lg bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
                Uploading…
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50 flex flex-col items-center justify-center gap-1 text-xs text-slate-500 transition"
            >
              <ImagePlus size={20} /> Add photos
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

        {/* Links */}
        <section>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Links</h3>
          <div className="space-y-1.5">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-2 group">
                <a href={l.url} target="_blank" rel="noreferrer" title={l.url} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline truncate">
                  <ExternalLink size={14} className="shrink-0" /> {domainOf(l.url) || l.url}
                </a>
                <button onClick={() => delLink(l.id)} title="Remove link" className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addLink();
            }}
            className="flex gap-2 mt-2"
          >
            <input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="Paste a link (Google Maps, TikTok, Instagram, website…)"
              className="flex-1 min-w-0 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400"
            />
            <button type="submit" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-violet-600 border border-violet-200 hover:bg-violet-50">
              <Plus size={15} /> Add
            </button>
          </form>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">Notes</h3>
          <textarea
            value={idea.note || ""}
            onChange={(e) => set("note", e.target.value)}
            rows={6}
            placeholder="Address, opening hours, prices, how to get there, who recommended it…"
            className="w-full text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 resize-y focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400"
          />
        </section>
      </div>

      {/* Photo viewer */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between gap-2 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-white/60">
              {viewerIdx + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-1">
              {cover && cover.id === viewerPhoto.id ? (
                <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 text-violet-300">
                  <Star size={15} /> Cover
                </span>
              ) : (
                <button onClick={() => set("cover", viewerPhoto.id)} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
                  <Star size={15} /> Make cover
                </button>
              )}
              <button onClick={() => delPhoto(viewerPhoto.id)} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
                <Trash2 size={15} /> Delete
              </button>
              <button onClick={() => setViewer(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10">
                <X size={18} />
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
                  aria-label="Previous photo"
                  className="absolute left-2 p-2 rounded-full text-white hover:bg-white/10"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Next photo"
                  className="absolute right-2 p-2 rounded-full text-white hover:bg-white/10"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
s;
