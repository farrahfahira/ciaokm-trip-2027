"use client";

import { useRef, useState } from "react";
import { X, Plus, Camera, UserMinus, RotateCcw, ArrowRight } from "lucide-react";
import { Avatar } from "./shared";
import { uploadPhoto } from "./ideaUtils";

export default function ManagePanel({ people, onRename, onSetPhoto, onRemove, onRestore, onAdd, onOpenMember, onClose }) {
  const fileRef = useRef(null);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  const active = people.map((p, i) => ({ p, i })).filter((x) => !x.p.removed);
  const removed = people.map((p, i) => ({ p, i })).filter((x) => x.p.removed);

  const pickPhoto = (i) => {
    setTarget(i);
    setError("");
    fileRef.current?.click();
  };
  const onFile = async (file) => {
    if (!file || target === null) return;
    const i = target;
    setBusy(i);
    try {
      const photo = await uploadPhoto(file, 400);
      onSetPhoto(i, photo.url);
    } catch (e) {
      setError(e.message || "Gagal upload foto.");
    }
    setBusy(null);
    setTarget(null);
  };
  const add = () => {
    const n = newName.trim();
    if (!n) return;
    onAdd(n);
    setNewName("");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-slate-700">
          Anggota <span className="font-normal text-slate-400">{active.length} orang</span>
        </div>
        <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <X size={16} />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {active.map(({ p, i }) => (
          <div key={p.id || i} className="flex items-center gap-3 py-2">
            <button onClick={() => pickPhoto(i)} title="Ganti foto" className="relative group shrink-0">
              <Avatar name={p.name} i={i} photo={p.photo} size="w-10 h-10 text-sm" />
              <span className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white transition ${busy === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {busy === i ? <span className="text-[10px]">…</span> : <Camera size={15} />}
              </span>
            </button>
            <input
              value={p.name}
              onChange={(e) => onRename(i, e.target.value)}
              className="flex-1 min-w-0 text-sm font-medium bg-transparent px-2 py-1.5 rounded-md hover:bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {p.photo && (
              <button onClick={() => onSetPhoto(i, "")} className="hidden sm:inline text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-100">
                Hapus foto
              </button>
            )}
            <button onClick={() => onOpenMember(i)} title="Buka halaman" className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onRemove(i)} title="Keluarin" className="p-2 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50">
              <UserMinus size={16} />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2 mt-3"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama anggota baru"
          className="flex-1 min-w-0 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600">
          <Plus size={16} /> Tambah
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-2">Tap foto buat ganti. Anggota baru nggak otomatis ikut pengeluaran yang udah ada.</p>
      {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}

      {removed.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 mb-1">Udah keluar</div>
          {removed.map(({ p, i }) => (
            <div key={p.id || i} className="flex items-center gap-3 py-1.5 text-sm text-slate-500">
              <Avatar name={p.name} i={i} photo={p.photo} size="w-7 h-7 text-xs" className="grayscale opacity-60" />
              <span className="flex-1 truncate">{p.name}</span>
              <button onClick={() => onOpenMember(i)} className="text-xs text-slate-400 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50">
                Lihat
              </button>
              <button onClick={() => onRestore(i)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md">
                <RotateCcw size={12} /> Balikin
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
