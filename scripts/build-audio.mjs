// Salin rekaman pengucapan (penutur asli) untuk kosakata app ke public/audio/
// Sumber: https://github.com/hugolpz/audio-cmn (CC BY-SA 3.0) — folder 64k/hsk & 64k/syllabs
// usage: node scripts/build-audio.mjs <path-ke-audio-cmn/64k>
//
// Aturan:
// - kata 1 karakter  → rekaman suku kata sesuai pinyin kita (shì → cmn-shi4.mp3), jadi nadanya pasti benar
//   walaupun karakternya punya beberapa bacaan (行 xíng/háng, ...)
// - kata 2+ karakter, atau suku katanya tidak ada (nada netral) → rekaman kata dari folder hsk (cmn-老师.mp3)
// - selain itu tidak ada file → app memakai TTS browser
// Keluaran: public/audio/*.mp3 + src/data/audio.js (peta hanzi → nama file)
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const src = process.argv[2];
if (!src || !existsSync(join(src, "hsk")) || !existsSync(join(src, "syllabs"))) {
  console.error("usage: node scripts/build-audio.mjs <audio-cmn/64k>  (harus berisi folder hsk/ dan syllabs/)");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "audio");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const { LESSONS } = await import(pathToFileURL(join(root, "src", "data", "lessons.js")).href);
const hskFiles = new Set(readdirSync(join(src, "hsk")));
const sylFiles = new Set(readdirSync(join(src, "syllabs")));

// "shì" → "shi4", "lǜ" → "lv4", "de" → "de5"
const TONES = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };
function numbered(p) {
  let tone = 5;
  const base = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, m => {
    if (m === "̈") return "̈";
    tone = TONES[m] || tone;
    return "";
  }).replace(/ü/g, "v").replace(/[^a-z]/g, "");
  return base + tone;
}

const map = {}; // hanzi → file
const stats = { syl: 0, word: 0, none: [] };
const words = new Map();
for (const L of LESSONS) for (const w of L.words) if (!words.has(w.h)) words.set(w.h, w);

for (const [h, w] of words) {
  const chars = [...h];
  let from = null, file = null;
  if (chars.length === 1 && /^[一-鿿]$/.test(h)) {
    // pinyin pertama saja kalau ada beberapa ("le; liǎo")
    const s = numbered(w.p.split(/[;,/]/)[0].trim());
    if (sylFiles.has(`cmn-${s}.mp3`)) { from = join(src, "syllabs", `cmn-${s}.mp3`); file = `s-${s}.mp3`; stats.syl++; }
  }
  // fallback (juga untuk nada netral 吗/的/了 yang tidak punya rekaman suku kata)
  if (!from && hskFiles.has(`cmn-${h}.mp3`)) {
    from = join(src, "hsk", `cmn-${h}.mp3`); file = `w-${h}.mp3`; stats.word++;
  }
  if (!from) { stats.none.push(h); continue; }
  if (!existsSync(join(outDir, file))) copyFileSync(from, join(outDir, file));
  map[h] = file;
}

writeFileSync(join(root, "src", "data", "audio.js"),
  "// DIBUAT OTOMATIS oleh scripts/build-audio.mjs — jangan diedit manual.\n" +
  "// Rekaman: hugolpz/audio-cmn (CC BY-SA 3.0). Peta hanzi → file di public/audio/\n" +
  "export const AUDIO = " + JSON.stringify(map) + ";\n");

console.log(`kata unik: ${words.size}`);
console.log(`suku kata (1 karakter): ${stats.syl}, rekaman kata: ${stats.word}, tanpa rekaman (pakai TTS): ${stats.none.length}`);
console.log("contoh tanpa rekaman:", stats.none.slice(0, 30).join(" "));
