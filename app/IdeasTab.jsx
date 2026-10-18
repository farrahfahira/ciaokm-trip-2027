"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink, Heart, Link2, CalendarPlus, Check, MapPin } from "lucide-react";

const AVATAR = ["bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500"];
const IDEA_CATS = ["Food", "Sights", "Shopping", "Stay", "Activity", "Info"];
const IDEA_TINT = {
  Food: "bg-amber-50 text-amber-700",
  Sights: "bg-indigo-50 text-indigo-700",
  Shopping: "bg-rose-50 text-rose-700",
  Stay: "bg-sky-50 text-sky-700",
  Activity: "bg-emerald-50 text-emerald-700",
  Info: "bg-slate-100 text-slate-600",
};
const ME_KEY = "trip-planner-me";

const uid = () => Math.random().toString(36).slice(2, 9);
const URL_RE = /https?:\/\/\S+/i;
const domainOf = (link) => {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const weekday = (date) => (date ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" }) : "");
const dayLabel = (d, i) => `Day ${i + 1}${d.date ? ` · ${weekday(d.date)}` : ""}${d.label ? ` · ${d.label}` : ""}`;
const isEmptyRow = (r) => !r.time && !r.place && !r.link && !r.activity && !r.price && !r.notes;

const Avatar = ({ name, i, size = "w-6 h-6 text-xs" }) => (
  <span className={`inline-flex ${size} shrink-0 rounded-full ${AVATAR[i % 8]} text-white font-semibold items-center justify-center`}>{(name || "?").trim().charAt(0).toUpperCase() || "?"}</span>
);

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${active ? "bg-violet-500 border-violet-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300"}`}
  >
    {children}
  </button>
);

const inputBase = "bg-transparent rounded-md hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-300";

export default function IdeasTab({ data, setData }) {
  const { people, days } = data;
  const ideas = data.ideas || [];
  const cities = data.ideaCities || [];

  const [draft, setDraft] = useState("");
  const [cityFilter, setCityFilter] = useState("all"); // "all" | "" (unsorted) | city id
  const [catFilter, setCatFilter] = useState("all");
  const [sort, setSort] = useState("interest");
  const [me, setMeState] = useState(null);
  const [needMe, setNeedMe] = useState(false);
  const [newCity, setNewCity] = useState(null); // null = closed
  const [linkEdit, setLinkEdit] = useState(null);

  // "I'm…" is remembered per device, not shared
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

  // If a friend deleted the city you're filtering by, fall back to All

  const activeCity = cityFilter === "all" || cityFilter === "" || cities.some((c) => c.id === cityFilter) ? cityFilter : "all";
  const selectedCity = cities.find((c) => c.id === activeCity);
  const cityOf = (x) => (cities.some((c) => c.id === x.city) ? x.city : "");

  // ── updaters (by id, so friends' edits never hit the wrong card) ──
  const setIdeas = (fn) => setData((d) => ({ ...d, ideas: fn(d.ideas || []) }));
  const updIdea = (id, f, v) => setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const delIdea = (id) => {
    if (confirm("Delete this idea?")) setIdeas((xs) => xs.filter((x) => x.id !== id));
  };

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
        link,
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
    if (n && !confirm(`Delete this city? Its ${n} idea${n === 1 ? "" : "s"} will move to Unsorted.`)) return;
    setData((d) => ({
      ...d,
      ideaCities: (d.ideaCities || []).filter((c) => c.id !== id),
      ideas: (d.ideas || []).map((x) => (x.city === id ? { ...x, city: "" } : x)),
    }));
    setCityFilter("all");
  };

  // Copy an idea into an itinerary day (fills the day's empty last row if there is one)
  const moveToDay = (idea, dayId) => {
    const row = { id: uid(), time: "", place: idea.text || domainOf(idea.link) || "Idea", link: idea.link || "", activity: idea.cat || "", price: "", notes: idea.note || "" };
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

  // ── counts and sorting ──
  const likesOf = (x) => (x.likes || []).filter((p) => p < people.length);
  const inCity = (id) => ideas.filter((x) => cityOf(x) === id);
  const cityHearts = (id) => inCity(id).reduce((s, x) => s + likesOf(x).length, 0);

  const visible = ideas
    .filter((x) => activeCity === "all" || cityOf(x) === activeCity)
    .filter((x) => catFilter === "all" || (x.cat || "") === catFilter)
    .sort((a, b) => Number(!!a.planned) - Number(!!b.planned) || (sort === "interest" ? likesOf(b).length - likesOf(a).length : 0) || (b.created || 0) - (a.created || 0));

  return (
    <div className="space-y-4">
      {/* Quick add + who am I */}
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
            placeholder="Paste a link or type an idea, then press Enter"
            className="flex-1 min-w-0 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 transition">
            <Plus size={16} /> Add
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">I'm</span>
          <select
            value={me ?? ""}
            onChange={(e) => setMe(e.target.value === "" ? null : Number(e.target.value))}
            className={`text-sm rounded-md px-2 py-1.5 bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300 ${needMe ? "ring-2 ring-rose-300" : ""}`}
          >
            <option value="">Pick your name</option>
            {people.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
          {needMe ? <span className="text-xs text-rose-500">Pick your name first so everyone knows who's interested.</span> : <span className="text-xs text-slate-400">Remembered on this device only</span>}
        </div>
      </div>

      {/* City chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={activeCity === "all"} onClick={() => setCityFilter("all")}>
          All <span className="opacity-70">{ideas.length}</span>
        </Chip>
        <Chip active={activeCity === ""} onClick={() => setCityFilter("")}>
          Unsorted <span className="opacity-70">{inCity("").length}</span>
        </Chip>
        {cities.map((c) => (
          <Chip key={c.id} active={activeCity === c.id} onClick={() => setCityFilter(c.id)}>
            {c.name || "Unnamed"}
            <span className="inline-flex items-center gap-1 opacity-70">
              <Heart size={13} /> {cityHearts(c.id)}
            </span>
          </Chip>
        ))}
        {newCity === null ? (
          <button onClick={() => setNewCity("")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-violet-600 border border-dashed border-violet-300 hover:bg-violet-50">
            <Plus size={14} /> City
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCity();
            }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="City name"
              onBlur={() => {
                if (!newCity.trim()) setNewCity(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setNewCity(null);
              }}
              className="text-sm w-36 bg-white border border-violet-300 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button type="submit" title="Add city" className="p-1.5 rounded-full text-violet-600 hover:bg-violet-50">
              <Check size={16} />
            </button>
          </form>
        )}
      </div>

      {selectedCity && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">City name</span>
          <input
            value={selectedCity.name}
            onChange={(e) => renameCity(selectedCity.id, e.target.value)}
            className="text-sm w-44 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button onClick={() => delCity(selectedCity.id)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-md">
            <Trash2 size={14} /> Delete city
          </button>
        </div>
      )}

      {/* Category filter + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["all", ...IDEA_CATS].map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-md transition ${catFilter === c ? (c === "all" ? "bg-slate-700 text-white" : `${IDEA_TINT[c]} ring-1 ring-current`) : "text-slate-500 hover:bg-slate-100"}`}
            >
              {c === "all" ? "All categories" : c}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-slate-100 rounded-md px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="interest">Most interested</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-400 py-12">
          {ideas.length === 0 ? "Toss in your first idea above: a cafe, a link, anything." : "No ideas match these filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {visible.map((x) => {
            const likes = likesOf(x);
            const mine = me !== null && likes.includes(me);
            const dom = domainOf(x.link);
            const plannedIdx = x.planned ? days.findIndex((d) => d.id === x.plannedDay) : -1;
            return (
              <div key={x.id} className={`bg-white rounded-xl border border-slate-200 p-3 space-y-2 transition ${x.planned ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-1.5">
                  <select
                    value={x.cat || ""}
                    onChange={(e) => updIdea(x.id, "cat", e.target.value)}
                    className={`text-xs font-medium rounded-md px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300 ${x.cat ? IDEA_TINT[x.cat] : "bg-slate-50 text-slate-400"}`}
                  >
                    <option value="">Category</option>
                    {IDEA_CATS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={cityOf(x)}
                    onChange={(e) => updIdea(x.id, "city", e.target.value)}
                    className="text-xs rounded-md px-1.5 py-1 bg-slate-50 text-slate-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300 max-w-32"
                  >
                    <option value="">Unsorted</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || "Unnamed"}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => delIdea(x.id)} title="Delete idea" className="ml-auto p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition">
                    <Trash2 size={14} />
                  </button>
                </div>

                <input
                  value={x.text}
                  onChange={(e) => updIdea(x.id, "text", e.target.value)}
                  placeholder={dom ? `Name this ${dom} link` : "Name this idea"}
                  className={`w-full text-sm font-semibold text-slate-800 px-1.5 py-1 placeholder:font-normal ${inputBase}`}
                />

                {linkEdit === x.id ? (
                  <input
                    autoFocus
                    value={x.link || ""}
                    onChange={(e) => updIdea(x.id, "link", e.target.value.trim())}
                    onBlur={() => setLinkEdit(null)}
                    placeholder="Paste a link (Google Maps, Instagram, TikTok…)"
                    className="w-full text-xs text-indigo-600 bg-indigo-50 px-1.5 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-1.5 text-xs">
                    {dom && (
                      <a href={x.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline truncate">
                        <ExternalLink size={12} /> {dom}
                      </a>
                    )}
                    <button onClick={() => setLinkEdit(x.id)} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 shrink-0">
                      <Link2 size={12} /> {x.link ? "Edit link" : "Add link"}
                    </button>
                  </div>
                )}

                <textarea
                  value={x.note || ""}
                  onChange={(e) => updIdea(x.id, "note", e.target.value)}
                  rows={2}
                  placeholder="Notes: opening hours, price, who recommended it…"
                  className={`w-full text-xs text-slate-600 px-1.5 py-1 resize-none ${inputBase}`}
                />

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleLike(x)}
                    title={mine ? "Not interested anymore" : "I'm interested"}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition ${mine ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"}`}
                  >
                    <Heart size={14} fill={mine ? "currentColor" : "none"} /> {likes.length || ""}
                  </button>
                  <div className="flex -space-x-1">
                    {likes.map((p) => (
                      <span key={p} title={people[p].name} className="ring-2 ring-white rounded-full">
                        <Avatar name={people[p].name} i={p} size="w-5 h-5 text-[10px]" />
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto">
                    {x.planned ? (
                      <button
                        onClick={() => updIdea(x.id, "planned", false)}
                        title="Mark as not planned (the itinerary row stays)"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-50"
                      >
                        <Check size={13} /> {plannedIdx >= 0 ? `Day ${plannedIdx + 1}` : "Planned"}
                      </button>
                    ) : (
                      days.length > 0 && (
                        <label className="relative inline-flex items-center gap-1 text-xs text-violet-600 px-2 py-1 rounded-md hover:bg-violet-50 cursor-pointer">
                          <CalendarPlus size={13} /> Move to day
                          <select value="" onChange={(e) => e.target.value && moveToDay(x, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                            <option value="">Choose a day</option>
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
                {x.by != null && people[x.by] && <div className="text-[11px] text-slate-400 px-1.5">Added by {people[x.by].name}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
