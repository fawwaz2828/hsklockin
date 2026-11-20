// Statistik belajar: streak harian & kata dihafal per minggu.
// { days: { [nomorHari]: jumlahAktivitas }, learned: { [kunciKata]: nomorHari pertama ditandai hafal } }
import { useEffect, useState } from "react";
import { getItem, setItem } from "./storage.js";
import { today } from "./srs.js";

const KEY = "hsk-stats";
const EVT = "hsk-stats";

export function loadStats() {
  try {
    const s = JSON.parse(getItem(KEY) || "{}") || {};
    return { days: s.days || {}, learned: s.learned || {} };
  } catch { return { days: {}, learned: {} }; }
}
function save(s) {
  setItem(KEY, JSON.stringify(s));
  try { window.dispatchEvent(new Event(EVT)); } catch { /* abaikan */ }
}

/** Catat aktivitas belajar hari ini (kartu dinilai, kuis dijawab, soal menyimak, dst.). */
export function logActivity(n = 1) {
  const s = loadStats(), d = today();
  s.days[d] = (s.days[d] || 0) + n;
  save(s);
}

/** Catat kata yang baru ditandai hafal (hari pertama saja). */
export function markLearned(keys) {
  if (!keys.length) return;
  const s = loadStats(), d = today();
  keys.forEach(k => { if (s.learned[k] == null) s.learned[k] = d; });
  save(s);
}

/** Hook: statistik terbaru, ikut berubah setiap ada aktivitas. */
export function useStats() {
  const [s, setS] = useState(loadStats);
  useEffect(() => {
    const on = () => setS(loadStats());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);      // tab lain
    window.addEventListener("hsk-synced", on);   // data dari perangkat lain (login)
    return () => { ["storage", "hsk-synced", EVT].forEach(e => window.removeEventListener(e, on)); };
  }, []);
  return s;
}

/** Hari beruntun. Masih dihitung kalau hari ini belum belajar tapi kemarin sudah. */
export function streak(days, d = today()) {
  let start = days[d] ? d : days[d - 1] ? d - 1 : null;
  if (start == null) return 0;
  let n = 0;
  while (days[start - n]) n++;
  return n;
}

/** Hari Senin minggu ini (nomor hari 0 = Kamis 1 Jan 1970). */
export const weekStart = (d = today()) => d - ((d + 3) % 7);
