"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Heart, CalendarPlus, Check, ImagePlus, X, Image as ImageIcon } from "lucide-react";
import IdeaPage from "./IdeaPage";
import { Sheet } from "./MobileViews";
import { IDEA_CATS, IDEA_LABEL, IDEA_TINT, uid, URL_RE, dayLabel, coverOf, firstLinkOf, titleOf, domainOf, uploadPhoto } from "./ideaUtils";

const ME_KEY = "trip-planner-me";
const isEmptyRow = (r) => !r.time && !r.place && !r.link && !r.activity && !r.price && !r.notes;
const field = "w-full text-base bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400";
const lbl = "block text-sm font-medium text-slate-600 mb-1.5";

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${active ? "bg-violet-500 border-violet-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300"}`}
  >
    {children}
  </button>
);

export default function IdeasTab({ data, setData }) {
  const { people, days } = data;
  const ideas = data.ideas || [];
  const cities = data.ideaCities || [];

  const [cityFilter, setCityFilter] = useState("all"); // "all" | id kota
  const [catFilter, setCatFilter] = useState("all");
  const [sort, setSort] = useState("interest");
  const [me, setMe] = useState(null);
  const [newCity, setNewCity] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftCity, setDraftCity] = useState(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const openedHere = useRef(false);
  const boardScroll = useRef(0);
  const topRef = useRef(null);
  const fileRef = useRef(null);

  // Profil yang dipilih di perangkat ini
  useEffect(() => {
    const v = localStorage.getItem(ME_KEY);
    if (v !== null && v !== "" && Number(v) < people.length) setMe(Number(v));
  }, [people.length]);

  // Tiap ide punya link sendiri: #idea-<id>
  useEffect(() => {
    const read = () => {
      const h = window.location.hash;
      setOpenId(h.startsWith("#idea-") ? h.slice(6) : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const openIdea = (id) => {
    boardScroll.current = window.scrollY;
    openedHere.current = true;
    window.location.hash = `idea-${id}`;
  };
  const closeIdea = () => {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setOpenId(null);
    }
  };
  useEffect(() => {
    if (openId) topRef.current?.scrollIntoView({ block: "start" });
    else if (boardScroll.current) {
      const y = boardScroll.current;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [openId]);

  const activeCity = cityFilter === "all" || cities.some((c) => c.id === cityFilter) ? cityFilter : "all";
  const selectedCity = cities.find((c) => c.id === activeCity);
  const cityOf = (x) => (cities.some((c) => c.id === x.city) ? x.city : "");

  const setIdeas = (fn) => setData((d) => ({ ...d, ideas: fn(d.ideas || []) }));
  const setIdeaById = (id) => (fn) => setIdeas((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));

  const toggleLike = (idea) => {
    if (me === null) return;
    setIdeas((xs) =>
      xs.map((x) => {
        if (x.id !== idea.id) return x;
        const likes = x.likes || [];
        return { ...x, likes: likes.includes(me) ? likes.filter((p) => p !== me) : [...likes, me].sort((a, b) => a - b) };
      }),
    );
  };

  // ── kota ──
  const addCity = () => {
    const name = (newCity || "").trim();
    if (!name) {
      setNewCity(null);
      return;
    }
    const id = uid();
    setData((d) => ({ ...d, ideaCities: [...(d.ideaCities || []), { id, name }] }));
    setNewCity(null);
    setCityFilter(id);
  };
  const renameCity = (id, name) => setData((d) => ({ ...d, ideaCities: (d.ideaCities || []).map((c) => (c.id === id ? { ...c, name } : c)) }));
  const delCity = (id) => {
    const n = ideas.filter((x) => x.city === id).length;
    if (!confirm(`Hapus kota ini?${n ? `\n\n${n} ide di dalamnya tetap ada, hanya tidak punya kota.` : ""}`)) return;
    setData((d) => ({
      ...d,
      ideaCities: (d.ideaCities || []).filter((c) => c.id !== id),
      ideas: (d.ideas || []).map((x) => (x.city === id ? { ...x, city: "" } : x)),
    }));
    setCityFilter("all");
  };

  // ── pindah ke itinerary ──
  const moveToDay = (idea, dayId) => {
    const link = firstLinkOf(idea);
    const row = { id: uid(), time: "", place: idea.text || domainOf(link) || "Ide", link, activity: idea.cat ? IDEA_LABEL[idea.cat] : "", price: "", notes: idea.note || "" };
    setData((d) => ({
      ...d,
      days: d.days.map((x) => {
        if (x.id !== dayId) return x;
        const rows = [...x.rows];
        const last = rows[rows.length - 1];
        if (last && isEmptyRow(last)) rows[rows.length - 1] = { ...row, id: last.id };
        else rows.push(row);
        return { ...x, rows };
      }),
      ideas: (d.ideas || []).map((x) => (x.id === idea.id ? { ...x, planned: true, plannedDay: dayId } : x)),
    }));
  };

  // ── form tambah ide ──
  const openNew = () => {
    setError("");
    setDraftCity(null);
    setDraft({ text: "", link: "", city: activeCity === "all" ? "" : activeCity, cat: catFilter === "all" ? "" : catFilter, photos: [], note: "" });
  };
  const setD = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const addDraftPhotos = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setError("");
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const photo = await uploadPhoto(file);
        setDraft((d) => (d ? { ...d, photos: [...d.photos, photo] } : d));
      } catch (e) {
        setError(e.message);
      }
      setUploading((n) => n - 1);
    }
  };
  const addDraftCity = () => {
    const name = (draftCity || "").trim();
    if (!name) {
      setDraftCity(null);
      return;
    }
    const id = uid();
    setData((d) => ({ ...d, ideaCities: [...(d.ideaCities || []), { id, name }] }));
    setDraft((d) => ({ ...d, city: id }));
    setDraftCity(null);
  };
  const saveIdea = () => {
    let text = draft.text.trim();
    let link = draft.link.trim();
    // Kalau link ditempel di kolom nama, pindahkan ke kolom link
    const m = !link && text.match(URL_RE);
    if (m) {
      link = m[0];
      text = text.replace(m[0], "").trim();
    }
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    if (!text && !link) return setError("Isi nama atau link terlebih dahulu.");
    if (uploading) return setError("Tunggu sampai foto selesai diunggah.");
    setIdeas((xs) => [
      {
        id: uid(),
        text,
        links: link ? [{ id: uid(), url: link }] : [],
        photos: draft.photos,
        cover: "",
        note: draft.note.trim(),
        city: draft.city,
        cat: draft.cat,
        by: me,
        likes: me === null ? [] : [me],
        planned: false,
        created: Date.now(),
      },
      ...xs,
    ]);
    setDraft(null);
  };

  // ── hitungan & urutan ──
  const likesOf = (x) => (x.likes || []).filter((p) => p < people.length);
  const inCity = (id) => ideas.filter((x) => cityOf(x) === id);
  const cityHearts = (id) => inCity(id).reduce((s, x) => s + likesOf(x).length, 0);

  const visible = ideas
    .filter((x) => activeCity === "all" || cityOf(x) === activeCity)
    .filter((x) => catFilter === "all" || (x.cat || "") === catFilter)
    .sort((a, b) => Number(!!a.planned) - Number(!!b.planned) || (sort === "interest" ? likesOf(b).length - likesOf(a).length : 0) || (b.created || 0) - (a.created || 0));

  // ── halaman ide ──
  if (openId) {
    const idea = ideas.find((x) => x.id === openId);
    return (
      <div ref={topRef} className="scroll-mt-4">
        {idea ? (
          <IdeaPage
            idea={idea}
            people={people}
            cities={cities}
            days={days}
            me={me}
            needMe={false}
            setMe={() => {}}
            setIdea={setIdeaById(idea.id)}
            onToggleLike={() => toggleLike(idea)}
            onMoveToDay={(dayId) => moveToDay(idea, dayId)}
            onDelete={() => {
              if (!confirm("Hapus ide ini beserta fotonya?")) return;
              setIdeas((xs) => xs.filter((x) => x.id !== idea.id));
              closeIdea();
            }}
            onBack={closeIdea}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">Ide ini sudah dihapus.</p>
            <button onClick={closeIdea} className="text-sm font-medium text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg">
              Kembali
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── papan ide ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-500">{ideas.length} ide</span>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 active:bg-violet-600">
          <Plus size={16} /> Tambah ide
        </button>
      </div>

      {/* Kota */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
        <Chip active={activeCity === "all"} onClick={() => setCityFilter("all")}>
          Semua <span className="opacity-70">{ideas.length}</span>
        </Chip>
        {cities.map((c) => (
          <Chip key={c.id} active={activeCity === c.id} onClick={() => setCityFilter(c.id)}>
            {c.name || "Tanpa nama"}
            <span className="inline-flex items-center gap-1 opacity-70">
              <Heart size={13} /> {cityHearts(c.id)}
            </span>
          </Chip>
        ))}
        {newCity === null ? (
          <button onClick={() => setNewCity("")} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-violet-600 border border-dashed border-violet-300 hover:bg-violet-50">
            <Plus size={14} /> Kota
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCity();
            }}
            className="shrink-0 flex items-center gap-1"
          >
            <input
              autoFocus
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Nama kota"
              onBlur={() => {
                if (!newCity.trim()) setNewCity(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setNewCity(null);
              }}
              className="text-sm w-36 bg-white border border-violet-300 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button type="submit" title="Tambah kota" className="p-1.5 rounded-full text-violet-600 hover:bg-violet-50">
              <Check size={16} />
            </button>
          </form>
        )}
      </div>

      {selectedCity && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Nama kota</span>
          <input
            value={selectedCity.name}
            onChange={(e) => renameCity(selectedCity.id, e.target.value)}
            className="text-sm w-44 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button onClick={() => delCity(selectedCity.id)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-md">
            <Trash2 size={14} /> Hapus kota
          </button>
        </div>
      )}

      {/* Kategori + urutan */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto -ml-4 pl-4 md:ml-0 md:pl-0 md:flex-wrap scrollbar-none">
          {["all", ...IDEA_CATS].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-md transition ${catFilter === c ? (c === "all" ? "bg-slate-700 text-white" : `${IDEA_TINT[c]} ring-1 ring-current`) : "text-slate-500 hover:bg-slate-100"}`}
            >
              {c === "all" ? "Semua" : IDEA_LABEL[c]}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="shrink-0 text-xs bg-slate-100 rounded-md px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="interest">Paling diminati</option>
          <option value="newest">Terbaru</option>
        </select>
      </div>

      {/* Kartu */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-12">{ideas.length === 0 ? "Belum ada ide." : "Tidak ada yang cocok."}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
          {visible.map((x) => {
            const likes = likesOf(x);
            const mine = me !== null && likes.includes(me);
            const cover = coverOf(x);
            const nPhotos = (x.photos || []).length;
            const cityName = cities.find((c) => c.id === cityOf(x))?.name;
            const meta = [x.cat && IDEA_LABEL[x.cat], cityName].filter(Boolean).join(" · ");
            const firstLine = (x.note || "").split("\n").find((l) => l.trim()) || "";
            const plannedIdx = x.planned ? days.findIndex((d) => d.id === x.plannedDay) : -1;
            return (
              <div
                key={x.id}
                role="button"
                tabIndex={0}
                onClick={() => openIdea(x.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) openIdea(x.id);
                }}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-violet-300 hover:shadow-sm active:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-violet-300 ${x.planned ? "opacity-60" : ""}`}
              >
                {cover && (
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img src={cover.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 text-[11px] bg-white/90 text-slate-600 px-1.5 py-0.5 rounded">
                      <ImageIcon size={11} /> {nPhotos}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <div className="text-sm font-semibold text-slate-800 truncate">{titleOf(x)}</div>
                  {meta && <div className="text-xs text-slate-500 mt-0.5 truncate">{meta}</div>}
                  {!cover && firstLine && <div className="text-xs text-slate-400 mt-2 line-clamp-2">{firstLine}</div>}
                  <div className="flex items-center justify-between mt-3 -mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(x);
                      }}
                      className={`inline-flex items-center gap-1 text-xs px-1.5 py-1.5 -ml-1.5 rounded-md transition ${mine ? "text-rose-600" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"}`}
                    >
                      <Heart size={15} fill={mine ? "currentColor" : "none"} /> {likes.length}
                    </button>
                    {x.planned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <Check size={13} /> {plannedIdx >= 0 ? `Hari ${plannedIdx + 1}` : "Masuk itinerary"}
                      </span>
                    ) : (
                      days.length > 0 && (
                        <label onClick={(e) => e.stopPropagation()} title="Pindah ke hari" className="relative p-1.5 -mr-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 cursor-pointer">
                          <CalendarPlus size={16} />
                          <select value="" onChange={(e) => e.target.value && moveToDay(x, e.target.value)} className="absolute inset-0 w-full opacity-0 cursor-pointer">
                            <option value="">Pilih hari</option>
                            {days.map((d, i) => (
                              <option key={d.id} value={d.id}>
                                {dayLabel(d, i)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form tambah ide */}
      {draft && (
        <Sheet
          title="Tambah ide"
          onClose={() => setDraft(null)}
          footer={
            <div className="flex items-center gap-2">
              <button onClick={() => setDraft(null)} className="ml-auto text-sm text-slate-500 px-4 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-100">
                Batal
              </button>
              <button onClick={saveIdea} className="text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 active:bg-violet-600 px-6 py-2.5 rounded-lg">
                Simpan
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className={lbl}>Nama</label>
              <input autoFocus value={draft.text} onChange={(e) => setD("text", e.target.value)} placeholder="Nama tempat atau ide" className={field} />
            </div>

            <div>
              <label className={lbl}>
                Link <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="url" inputMode="url" value={draft.link} onChange={(e) => setD("link", e.target.value)} placeholder="Tempel link TikTok, Instagram, atau Google Maps" className={field} />
            </div>

            <div>
              <label className={lbl}>Kota</label>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setD("city", draft.city === c.id ? "" : c.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${draft.city === c.id ? "bg-violet-50 text-violet-700 ring-1 ring-violet-300 font-medium" : "bg-slate-50 text-slate-500"}`}
                  >
                    {c.name || "Tanpa nama"}
                  </button>
                ))}
                {draftCity === null ? (
                  <button onClick={() => setDraftCity("")} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-dashed border-violet-300 text-violet-600">
                    <Plus size={14} /> Kota
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      autoFocus
                      value={draftCity}
                      onChange={(e) => setDraftCity(e.target.value)}
                      placeholder="Nama kota"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDraftCity();
                        }
                        if (e.key === "Escape") setDraftCity(null);
                      }}
                      className={field}
                    />
                    <button onClick={addDraftCity} className="shrink-0 text-sm font-medium text-violet-700 bg-violet-50 px-3 py-2.5 rounded-lg">
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
                    onClick={() => setD("cat", draft.cat === c ? "" : c)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${draft.cat === c ? `${IDEA_TINT[c]} ring-1 ring-current font-medium` : "bg-slate-50 text-slate-500"}`}
                  >
                    {IDEA_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={lbl}>
                Foto <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {draft.photos.map((ph) => (
                  <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={ph.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== ph.id) }))} aria-label="Hapus foto" className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <div key={`up-${i}`} className="aspect-square rounded-lg bg-slate-100 animate-pulse" />
                ))}
                <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-violet-300 active:bg-violet-50 flex items-center justify-center text-slate-400">
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
                  addDraftPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label className={lbl}>
                Catatan <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <textarea rows={3} value={draft.note} onChange={(e) => setD("note", e.target.value)} placeholder="Jam buka, harga, cara ke sana" className={`${field} resize-none`} />
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
