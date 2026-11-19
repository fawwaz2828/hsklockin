// Gabungkan hasil contoh kalimat per batch menjadi public/examples/hsk{1-4}.json
// usage: node scripts/build-examples.mjs <folder-berisi-batches-dan-out>
// Format keluaran: { "<hanzi>": [[zh, pinyin, id, en], ...] }
// Pinyin dibuat otomatis dengan pinyin-pro (npm i -D pinyin-pro) kalau terpasang; kalau tidak, dikosongkan.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const src = process.argv[2];
if (!src) { console.error("usage: node scripts/build-examples.mjs <dir>"); process.exit(1); }
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "examples");
mkdirSync(outDir, { recursive: true });

// ---------- pinyin ----------
const { LESSONS } = await import(pathToFileURL(join(root, "src", "data", "lessons.js")).href);

// Kosakata HSK multi-karakter dengan satu bacaan saja -> pinyin dari data kita sendiri (lebih akurat)
const readings = new Map();
for (const L of LESSONS) for (const w of L.words) {
  if ([...w.h].length < 2 || /[^一-鿿]/.test(w.h)) continue;
  const p = w.p.split(/[;,/]/)[0].trim().replace(/\s+/g, "").toLowerCase();
  if (!readings.has(w.h)) readings.set(w.h, new Set());
  readings.get(w.h).add(p);
}
const VOCAB = new Map([...readings].filter(([, s]) => s.size === 1).map(([h, s]) => [h, [...s][0]]));
const MAXLEN = Math.max(...[...VOCAB.keys()].map(h => [...h].length));

const PUNCT = { "，": ",", "。": ".", "！": "!", "？": "?", "、": ",", "：": ":", "；": ";", "“": "«", "”": "»", "‘": "'", "’": "'", "（": "(", "）": ")", "《": "\"", "》": "\"", "…": "…", "—": "—" };
const ERHUA_BASE = new Set([..."哪这那点会玩块边儿事"]);
const isHan = c => /[一-鿿]/.test(c);

let toPinyin = () => "";
try {
  const pp = await import("pinyin-pro");
  toPinyin = zh => {
    const chars = [...zh];
    const per = pp.pinyin(zh, { type: "array", toneType: "symbol", toneSandhi: true, nonZh: "removed" });
    // pinyin per karakter hanzi (urut), plus batas kata dari segmentasi pinyin-pro
    const han = []; chars.forEach((c, i) => { if (isHan(c)) han.push(i); });
    const py = new Array(chars.length).fill("");
    han.forEach((ci, k) => { py[ci] = per[k] || ""; });
    const wordStart = new Set();
    let pos = 0;
    for (const seg of pp.segment(zh, { format: pp.OutputFormat.AllSegment })) { wordStart.add(pos); pos += [...seg.origin].length; }

    const tokens = []; // {text, han:boolean}
    for (let i = 0; i < chars.length;) {
      const c = chars[i];
      if (/[A-Za-z0-9]/.test(c)) {
        // huruf latin / angka (mis. "AI", "3D") jadi satu kata tersendiri
        let j = i;
        while (j < chars.length && /[A-Za-z0-9]/.test(chars[j])) j++;
        tokens.push({ text: chars.slice(i, j).join(""), han: true });
        i = j; continue;
      }
      if (!isHan(c)) {
        const p = PUNCT[c] ?? c;
        if (/\s/.test(c)) { i++; continue; }
        tokens.push({ text: p, han: false });
        i++; continue;
      }
      // 1) kosakata HSK, cocokkan yang terpanjang
      let hit = 0;
      for (let n = Math.min(MAXLEN, chars.length - i); n >= 2; n--) {
        const s = chars.slice(i, i + n).join("");
        // "三个人" = sān ge rén, bukan "gèrén": 个 setelah angka/penunjuk adalah kata satuan
        if (s.startsWith("个") && /[一二两三四五六七八九十几这那每半某哪]/.test(chars[i - 1] || "")) continue;
        if (VOCAB.has(s)) { tokens.push({ text: VOCAB.get(s), han: true, h: s }); hit = n; break; }
      }
      if (hit) { i += hit; continue; }
      // 2) ikuti segmentasi pinyin-pro (gabung suku kata satu kata)
      let j = i + 1;
      while (j < chars.length && isHan(chars[j]) && !wordStart.has(j)) j++;
      const h = chars.slice(i, j).join("");
      let text = py.slice(i, j).join("");
      // aturan umum yang sering salah
      if (h === "个") text = "ge";
      else if (h === "得" && i > 0 && isHan(chars[i - 1])) text = "de";
      else if (h === "长" && /[得大高]/.test(chars[j] || "")) text = "zhǎng";
      // 地 sebagai partikel keterangan (认真地学习, 紧紧地抱): de
      else if (h === "地" && i > 0 && isHan(chars[i - 1]) && isHan(chars[j] || "")) text = "de";
      else if (h === "儿" && tokens.length && tokens[tokens.length - 1].han && ERHUA_BASE.has(chars[i - 1])) {
        tokens[tokens.length - 1].text += "r"; i = j; continue;
      }
      tokens.push({ text, han: true, h });
      i = j;
    }
    // susun: spasi antar kata, tanda baca menempel ke kata sebelumnya
    // («» = kutip buka/tutup sementara, diganti " di akhir)
    let out = "";
    for (const t of tokens) {
      if (!t.han) {
        if (/^[(«]$/.test(t.text) && out && !out.endsWith(" ")) out += " ";
        out = out.replace(/ $/, /^[,.!?:;)»…]/.test(t.text) ? "" : " ") + t.text;
        if (/[,.!?:;)»]$/.test(t.text)) out += " ";
      } else {
        if (out && !/[\s(«]$/.test(out)) out += " ";
        out += t.text;
      }
    }
    out = out.replace(/\s+/g, " ").trim();
    // huruf kapital di awal kalimat dan setelah kutip pembuka
    out = out.replace(/^(«?)(\p{L})/u, (m, q, c) => q + c.toUpperCase()).replace(/«(\p{L})/gu, (m, c) => "«" + c.toUpperCase());
    return out.replace(/[«»]/g, '"');
  };
} catch (e) { console.warn("pinyin-pro tidak terpasang: pinyin dikosongkan", e.message); }

if (process.argv[3] === "--test") {
  for (const s of process.argv.slice(4)) console.log(s, "=>", toPinyin(s));
  process.exit(0);
}

// ---------- gabungkan batch ----------
const byLevel = { 1: {}, 2: {}, 3: {}, 4: {} };
let words = 0, sentences = 0;
const missing = [];
for (const f of readdirSync(join(src, "batches")).filter(f => f.endsWith(".json")).sort()) {
  const batch = JSON.parse(readFileSync(join(src, "batches", f), "utf8"));
  const outFile = join(src, "out", f);
  if (!existsSync(outFile)) { missing.push(f); continue; }
  const out = JSON.parse(readFileSync(outFile, "utf8"));
  for (const w of batch.words) {
    const ex = out[w.h];
    if (!Array.isArray(ex) || !ex.length) continue;
    byLevel[batch.level][w.h] = ex.map(([zh, id, en]) => [zh, toPinyin(zh), id, en]);
    words++; sentences += ex.length;
  }
}
for (const lv of [1, 2, 3, 4]) writeFileSync(join(outDir, `hsk${lv}.json`), JSON.stringify(byLevel[lv]));
console.log(`${words} kata, ${sentences} kalimat ditulis ke public/examples/`);
if (missing.length) console.warn("batch belum ada hasilnya:", missing.join(", "));
