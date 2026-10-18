const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hasIds = (arr) => arr.every((x) => isObj(x) && x.id != null);

// Arrays that behave like sets (order doesn't matter, no duplicates).
const SET_KEYS = new Set(["split"]);

// Three-way merge: base = the last copy both sides agreed on.
export function merge3(base, local, remote, key) {
  if (same(local, base)) return remote; // we didn't change it
  if (same(remote, base)) return local; // they didn't change it
  if (same(local, remote)) return local;

  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
      const inL = k in local,
        inR = k in remote;
      if (inL && inR) out[k] = merge3(b[k], local[k], remote[k], k);
      else if (inL) {
        if (!(k in b) || !same(local[k], b[k])) out[k] = local[k];
      } else {
        if (!(k in b) || !same(remote[k], b[k])) out[k] = remote[k];
      }
    }
    return out;
  }

  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = Array.isArray(base) ? base : [];
    if (SET_KEYS.has(key)) return mergeSet(b, local, remote);
    if (hasIds(local) && hasIds(remote)) return mergeById(b, local, remote);
    const primitive = [...local, ...remote].every((x) => x === null || typeof x !== "object");
    if (primitive || local.length === remote.length) return mergeByIndex(b, local, remote);
  }

  return local; // same field edited by both: last writer wins
}

// e.g. who shares an expense: keep both people's additions and removals
function mergeSet(base, local, remote) {
  const B = new Set(base),
    L = new Set(local),
    R = new Set(remote);
  const out = new Set([...B].filter((x) => L.has(x) && R.has(x)));
  for (const x of L) if (!B.has(x)) out.add(x);
  for (const x of R) if (!B.has(x)) out.add(x);
  return [...out].sort((a, b) => a - b);
}

// e.g. expenses, days, packing: match items by id
function mergeById(base, local, remote) {
  const B = new Map(base.filter(isObj).map((x) => [x.id, x]));
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));
  const out = [];
  const seen = new Set();
  for (const { id } of [...remote, ...local]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const b = B.get(id),
      l = L.get(id),
      r = R.get(id);
    if (l && r) out.push(merge3(b, l, r));
    else if (l) {
      if (!b || !same(l, b)) out.push(l);
    } // they deleted it; keep only if we edited it
    else if (r) {
      if (!b || !same(r, b)) out.push(r);
    } // we deleted it; keep only if they edited it
  }
  return out;
}

// e.g. people and their monthly savings: match by position
function mergeByIndex(base, local, remote) {
  const len = Math.max(local.length, remote.length);
  return Array.from({ length: len }, (_, i) => merge3(base[i], local[i], remote[i]));
}
