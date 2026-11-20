// Cap waktu perubahan per kata (detik), dipakai saat sinkron antar perangkat:
// versi yang paling baru menang — termasuk penghapusan (reset), jadi kata yang di-reset
// tidak "hidup lagi" dari perangkat lain yang datanya masih lama.
// { p: { kunciKata: detik } (progres hafal), s: { kunciKata: detik } (jadwal Ulang/SRS) }
import { getItem, setItem } from "./storage.js";

export const STAMP_KEY = "hsk-stamps";

export function loadStamps() {
  try {
    const s = JSON.parse(getItem(STAMP_KEY) || "{}") || {};
    return { p: s.p || {}, s: s.s || {} };
  } catch { return { p: {}, s: {} }; }
}

/** Tandai kata-kata yang berubah sekarang. kind: "p" (progres) | "s" (SRS) */
export function stamp(kind, keys) {
  if (!keys.length) return;
  const st = loadStamps(), now = Math.floor(Date.now() / 1000);
  keys.forEach(k => { st[kind][k] = now; });
  setItem(STAMP_KEY, JSON.stringify(st));
}

/** Kunci yang nilainya berbeda antara dua objek (ditambah, diubah, atau dihapus). */
export function changedKeys(a, b) {
  const out = [];
  for (const k in b) if (a[k] !== b[k]) out.push(k);
  for (const k in a) if (!(k in b)) out.push(k);
  return out;
}
