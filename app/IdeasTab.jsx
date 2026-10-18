"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Heart, CalendarPlus, Check, Image as ImageIcon } from "lucide-react";
import IdeaPage from "./IdeaPage";
import { IDEA_CATS, IDEA_LABEL, IDEA_TINT, uid, URL_RE, dayLabel, coverOf, firstLinkOf, titleOf, domainOf } from "./ideaUtils";

const ME_KEY = "trip-planner-me";
const isEmptyRow = (r) => !r.time && !r.place && !r.link && !r.activity && !r.price && !r.notes;

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

  const [draft, setDraft] = useState("");
  const [cityFilter, setCityFilter] = useState("all"); // "all" | "" (belum ada kota) | id kota
  const [catFilter, setCatFilter] = useState("all");
  const [sort, setSort] = useState("interest");
  const [me, setMeState] = useState(null);
  const [needMe, setNeedMe] = useState(false);
  const [newCity, setNewCity] = useState(null);
  const [openId, setOpenId] = useState(null);
  const openedHere = useRef(false);
  const boardScroll = useRef(0);
  const topRef = useRef(null);

  // "Aku" disimpan di HP ini aja
  useEffect(() => {
    const v = localStorage.getItem(ME_KEY);
    if (v !== null && v !== "" && Number(v) < people.length) setMeState(Number(v));
  }, [people.length]);
  const setMe = (v) => {
    setMeState(v);
    setNeedMe(false);
    if (v === null) localStorage.removeItem(ME_KEY);
    else localStorage.setItem(ME_KEY, String(v));
  };

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

  const activeCity = cityFilter === "all" || cityFilter === "" || cities.some((c) => c.id === cityFilter) ? cityFilter : "all";
  const selectedCity = cities.find((c) => c.id === activeCity);
  const cityOf = (x) => (cities.some((c) => c.id === x.city) ? x.city : "");

  const setIdeas = (fn) => setData((d) => ({ ...d, ideas: fn(d.ideas || []) }));
  const setIdeaById = (id) => (fn) => setIdeas((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));

  const addIdea = () => {
    const raw = draft.trim();
    if (!raw) return;
    const m = raw.match(URL_RE);
    const link = m ? m[0] : "";
    const text = m ? raw.replace(m[0], "").trim() : raw;
    setIdeas((xs) => [
      {
        id: uid(),
        text,
        links: link ? [{ id: uid(), url: link }] : [],
        photos: [],
        cover: "",
        note: "",
        city: activeCity === "all" ? "" : activeCity,
        cat: catFilter === "all" ? "" : catFilter,
        by: me,
        likes: me === null ? [] : [me],
        planned: false,
        created: Date.now(),
      },
      ...xs,
    ]);
    setDraft("");
  };

  const toggleLike = (idea) => {
    if (me === null) {
      setNeedMe(true);
      return;
    }
    setIdeas((xs) =>
      xs.map((x) => {
        if (x.id !== idea.id) return x;
        const likes = x.likes || [];
        return { ...x, likes: likes.includes(me) ? likes.filter((p) => p !== me) : [...likes, me].sort((a, b) => a - b) };
      }),
    );
  };

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
    if (n && !confirm(`Hapus kota ini? ${n} ide di dalamnya pindah ke "Belum ada kota".`)) return;
    setData((d) => ({
      ...d,
      ideaCities: (d.ideaCities || []).filter((c) => c.id !== id),
      ideas: (d.ideas || []).map((x) => (x.city === id ? { ...x, city: "" } : x)),
    }));
    setCityFilter("all");
  };

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
            needMe={needMe}
            setMe={setMe}
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
            <p className="text-sm text-slate-500">Ide ini udah dihapus.</p>
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addIdea();
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tempel link atau ketik ide"
            className="flex-1 min-w-0 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 transition">
            <Plus size={16} /> Tambah
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Aku</span>
          <select
            value={me ?? ""}
            onChange={(e) => setMe(e.target.value === "" ? null : Number(e.target.value))}
            className={`text-sm rounded-md px-2 py-1.5 bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300 ${needMe ? "ring-2 ring-rose-300" : ""}`}
          >
            <option value="">Pilih nama</option>
            {people.map((p, i) =>
              p.removed ? null : (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ),
            )}
          </select>
          {needMe && <span className="text-xs text-rose-500">Pilih nama dulu</span>}
        </div>
      </div>

      {/* Kota */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
        <Chip active={activeCity === "all"} onClick={() => setCityFilter("all")}>
          Semua <span className="opacity-70">{ideas.length}</span>
        </Chip>
        <Chip active={activeCity === ""} onClick={() => setCityFilter("")}>
          Belum ada kota <span className="opacity-70">{inCity("").length}</span>
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
        <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-12">{ideas.length === 0 ? "Belum ada ide." : "Nggak ada yang cocok."}</div>
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
    </div>
  );
}
