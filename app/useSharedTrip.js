"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { merge3, same } from "./merge";

const API = "/api/trip";
const SAVE_DELAY = 700;
const POLL_EVERY = 6000;

// makeInitial: returns starter data. normalize: upgrades data loaded from the server.
export function useSharedTrip(makeInitial, normalize = (d) => d) {
  const [trip, setTrip] = useState(makeInitial);
  const [status, setStatus] = useState("loading"); // loading | saving | saved | updated | error
  const [ready, setReady] = useState(false);

  const tripRef = useRef(trip);
  const baseRef = useRef(null);
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const timerRef = useRef(null);

  // Merge server data into local state. Returns true if we still have unsaved changes.
  const adoptRemote = useCallback(
    (data, version) => {
      const remote = data ? normalize(data) : (baseRef.current ?? tripRef.current);
      const merged = baseRef.current == null ? remote : merge3(baseRef.current, tripRef.current, remote);
      baseRef.current = remote;
      versionRef.current = version;
      tripRef.current = merged;
      setTrip(merged);
      return !same(merged, remote);
    },
    [normalize],
  );

  const save = useCallback(async () => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (baseRef.current == null || savingRef.current) return;

    const local = tripRef.current;
    if (same(local, baseRef.current)) {
      setStatus("saved");
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: local, baseVersion: versionRef.current }),
      });
      const body = await res.json();
      if (res.ok) {
        baseRef.current = local;
        versionRef.current = body.version;
      } else if (res.status === 409) {
        adoptRemote(body.data, body.version); // merge friends' changes, then save again below
      } else {
        throw new Error(body.error || "Save failed");
      }
    } catch {
      savingRef.current = false;
      setStatus("error");
      timerRef.current = setTimeout(save, 5000); // retry
      return;
    }
    savingRef.current = false;

    if (!same(tripRef.current, baseRef.current))
      save(); // more edits, or a merge to push
    else setStatus("saved");
  }, [adoptRemote]);

  const scheduleSave = useCallback(() => {
    clearTimeout(timerRef.current);
    setStatus("saving");
    timerRef.current = setTimeout(save, SAVE_DELAY);
  }, [save]);

  const pull = useCallback(async () => {
    if (savingRef.current) return;
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const body = await res.json();
      if (savingRef.current) return;
      if (baseRef.current != null && body.version <= versionRef.current) return; // nothing new

      const first = baseRef.current == null;
      const dirty = adoptRemote(body.data, body.version);
      setReady(true);
      if (dirty) scheduleSave();
      else if (!timerRef.current) setStatus(first ? "saved" : "updated");
    } catch {
      if (baseRef.current == null) setStatus("error");
    }
  }, [adoptRemote, scheduleSave]);

  // Works like setState: update(d => ({ ...d, ... })) or update(newData)
  const update = useCallback(
    (next) => {
      setTrip((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        tripRef.current = value;
        return value;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    pull();
    const id = setInterval(pull, POLL_EVERY);
    const onVisibility = () => {
      if (document.visibilityState === "visible") pull();
      else save(); // flush pending edits when switching apps or tabs
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timerRef.current);
    };
  }, [pull, save]);

  return { trip, update, status, ready };
}
