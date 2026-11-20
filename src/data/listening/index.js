// Bank soal menyimak per level HSK, dimuat terpisah (dynamic import) supaya bundle utama tetap kecil.
// Semua soal ditulis sendiri dengan gaya HSK (bukan soal ujian asli); audio lewat TTS browser.
//
// Tiga bagian per level:
//   p1 判断对错  : narasi + pernyataan ★ → benar/salah
//   p2 对话      : dialog pendek + pertanyaan pilihan ganda
//   p3 长对话/短文 (HSK 1–2: satu kalimat + pertanyaan) : dialog/narasi lebih panjang + 1–2 pertanyaan
//
// Format ringkas (hsk1–3) diubah ke bentuk objek yang sama dengan hsk4:
//   p1: [teks, pernyataan, 1|0, tr_id, tr_en, st_id, st_en]
//   p2/p3: ["女：…|男：…" (tanpa awalan = narator), [[pertanyaan, [opsi…], indeksBenar, qt_id, qt_en], …], tr_id, tr_en]

const LOADERS = {
  1: () => import("./hsk1.js"),
  2: () => import("./hsk2.js"),
  3: () => import("./hsk3.js"),
  4: () => import("./hsk4.js"),
};
export const LEVELS = [1, 2, 3, 4];

const parseLines = s => s.split("|").map(x => (/^[男女]：/.test(x) ? [x[0], x.slice(2)] : ["", x]));

const p1 = a => (Array.isArray(a)
  ? { text: a[0], stmt: a[1], ans: !!a[2], tr: [a[3], a[4]], st: [a[5], a[6]] }
  : a);
const pq = a => (Array.isArray(a)
  ? { lines: parseLines(a[0]), qs: a[1].map(q => ({ q: q[0], opts: q[1], ans: q[2], qt: [q[3], q[4]] })), tr: [a[2], a[3]] }
  : a);

/** Baris yang diputar untuk satu soal: bagian 1 = narasi saja; bagian 2/3 = dialog + "问：pertanyaan". */
export const itemLines = (part, item) => (part === 1
  ? [["", item.text]]
  : [...item.lines, ...item.qs.map(q => ["", "问：" + q.q])]);

const cache = new Map();
/** Muat bank soal satu level → [{ key: 1|2|3, items: [...] }] */
export function loadListening(lv) {
  if (!cache.has(lv)) {
    cache.set(lv, LOADERS[lv]().then(m => {
      const d = m.default;
      return [
        { key: 1, items: d.p1.map(p1) },
        { key: 2, items: d.p2.map(pq) },
        { key: 3, items: d.p3.map(pq) },
      ];
    }));
  }
  return cache.get(lv);
}
