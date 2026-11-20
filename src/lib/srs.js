// Spaced repetition (pengulangan berjarak), versi sederhana mirip Anki/SM-2.
// Tiap kata yang pernah dinilai punya kartu: { i: interval (hari), due: hari jatuh tempo, n: jumlah ulang, l: jumlah lupa }
// Disimpan di localStorage dengan kunci yang sama dengan progres: "lessonId-n".
import { getItem, setItem } from "./storage.js";

const KEY = "hsk-srs";
const MAX = 365;

/** Nomor hari lokal (berganti tengah malam waktu perangkat). */
export const today = () => {
  const d = new Date();
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5);
};

export function loadSrs() {
  try { return JSON.parse(getItem(KEY) || "{}") || {}; } catch { return {}; }
}
export const saveSrs = srs => setItem(KEY, JSON.stringify(srs));

/** Nilai jawaban. */
export const AGAIN = 0, HARD = 1, GOOD = 2, EASY = 3;

/** Interval baru (hari) untuk kartu `c` (boleh undefined = kata baru) kalau dinilai `r`. */
export function nextInterval(c, r) {
  const i = c?.i || 0;
  let n;
  if (r === AGAIN) n = 0;                                   // ulang lagi hari ini
  else if (r === HARD) n = i === 0 ? 1 : Math.max(i + 1, Math.round(i * 1.2));
  else if (r === GOOD) n = i === 0 ? 1 : i === 1 ? 3 : Math.round(i * 2.5);
  else n = i === 0 ? 4 : Math.max(i + 2, Math.round(i * 3.5));
  return Math.min(n, MAX);
}

/** Kartu setelah dinilai. */
export function review(c, r, day = today()) {
  const i = nextInterval(c, r);
  return { i, due: day + i, n: (c?.n || 0) + 1, l: (c?.l || 0) + (r === AGAIN ? 1 : 0) };
}

/** Kartu jatuh tempo (perlu diulang hari ini atau sudah lewat). */
export const isDue = (c, day = today()) => !!c && c.due <= day;

/** Label pendek interval: "hari ini", "1 hr", "2 mgg", "3 bln"… */
export function fmtDays(d, lang) {
  const id = lang !== "en";
  if (d <= 0) return id ? "hari ini" : "today";
  if (d < 14) return d + (id ? " hr" : "d");
  if (d < 60) return Math.round(d / 7) + (id ? " mgg" : "w");
  if (d < 365) return Math.round(d / 30) + (id ? " bln" : "mo");
  return id ? "1 thn" : "1y";
}
