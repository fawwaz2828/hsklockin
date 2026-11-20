// Buat audio Azure Neural TTS untuk:
//   1. kata kosakata yang TIDAK punya rekaman audio-cmn (src/data/audio.js)
//   2. semua baris soal menyimak HSK 1–4 (dialog 女/男 + narasi/pertanyaan)
// Keluaran: public/tts/*.mp3 + src/data/tts.js (daftar file yang ada).
//
// Butuh .env di folder flashcard-react (JANGAN di-commit):
//   AZURE_SPEECH_KEY=...
//   AZURE_SPEECH_REGION=southeastasia
// usage: node scripts/build-tts.mjs            → buat file yang belum ada (bisa dihentikan & dilanjutkan)
//        node scripts/build-tts.mjs --dry      → hitung saja (jumlah file & karakter), tanpa memanggil Azure
//        node scripts/build-tts.mjs --only=words|listen
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imp = p => import(pathToFileURL(join(root, p)).href);
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ONLY = (args.find(a => a.startsWith("--only=")) || "").slice(7);

// --- .env sederhana
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!DRY && (!KEY || !REGION)) {
  console.error("Isi AZURE_SPEECH_KEY dan AZURE_SPEECH_REGION di flashcard-react/.env (lihat .env.example).");
  process.exit(1);
}

// Suara (bisa diganti lewat .env)
const VOICES = {
  w: process.env.TTS_VOICE_WORD || "zh-CN-XiaoxiaoNeural",     // kata
  f: process.env.TTS_VOICE_FEMALE || "zh-CN-XiaoxiaoNeural",   // 女
  m: process.env.TTS_VOICE_MALE || "zh-CN-YunxiNeural",        // 男
  n: process.env.TTS_VOICE_NARRATOR || "zh-CN-YunyangNeural",  // narator & pertanyaan
};
const RATE = { w: "-10%", f: "0%", m: "0%", n: "0%" };

const { lineKey, wordKey } = await imp("src/lib/ttsKey.js");
const { AUDIO } = await imp("src/data/audio.js");
const { LESSONS } = await imp("src/data/lessons.js");
const { LEVELS, loadListening, itemLines } = await imp("src/data/listening/index.js");

// "shì" → "shi 4" (format SAPI Azure) untuk kata 1 karakter, supaya karakter dengan beberapa bacaan dibaca benar
const TONES = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };
function sapi(p) {
  let tone = 5;
  const base = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, m => {
    if (m === "̈") return m;
    tone = TONES[m] || tone;
    return "";
  }).replace(/ü/g, "v").replace(/[^a-z]/g, "");
  return base ? `${base} ${tone}` : null;
}

// --- kumpulkan pekerjaan: { key, voice, text, ph? }
const jobs = new Map();
if (ONLY !== "listen") {
  const seen = new Set();
  for (const L of LESSONS) for (const w of L.words) {
    if (seen.has(w.h) || AUDIO[w.h]) continue;
    seen.add(w.h);
    const one = [...w.h].length === 1;
    jobs.set(wordKey(w.h), { kind: "w", text: w.h, ph: one ? sapi(w.p.split(/[;,/]/)[0].trim()) : null });
  }
}
if (ONLY !== "words") {
  for (const lv of LEVELS) for (const P of await loadListening(lv)) for (const item of P.items)
    for (const [who, text] of itemLines(P.key, item)) {
      const key = lineKey(who, text);
      jobs.set(key, { kind: key[0], text });
    }
}

const outDir = join(root, "public", "tts");
mkdirSync(outDir, { recursive: true });
const todo = [...jobs].filter(([k]) => !existsSync(join(outDir, k + ".mp3")));
const chars = todo.reduce((n, [, j]) => n + [...j.text].length, 0);
const byKind = todo.reduce((o, [, j]) => ((o[j.kind] = (o[j.kind] || 0) + 1), o), {});
console.log(`total ${jobs.size} file, belum ada ${todo.length} (${JSON.stringify(byKind)}), ±${chars} karakter`);

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const ssml = (j, withPh) => {
  const body = withPh && j.ph ? `<phoneme alphabet="sapi" ph="${j.ph}">${esc(j.text)}</phoneme>` : esc(j.text);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">` +
    `<voice name="${VOICES[j.kind]}"><prosody rate="${RATE[j.kind]}">${body}</prosody></voice></speak>`;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function synth(j) {
  for (let attempt = 0, withPh = true; attempt < 8; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "hsk-flashcard-build-tts",
      },
      body: ssml(j, withPh),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 400 && withPh && j.ph) { withPh = false; continue; } // phoneme ditolak → tanpa phoneme
    if (res.status === 401 || res.status === 403) throw new Error(`Azure menolak key/region (${res.status}). Cek .env.`);
    if (res.status === 429 || res.status >= 500) {
      const wait = (+res.headers.get("retry-after") || 0) * 1000 || Math.min(60000, 3000 * 2 ** attempt);
      process.stdout.write(`\n  ${res.status}, tunggu ${Math.round(wait / 1000)} dtk… `);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  throw new Error("terlalu banyak percobaan ulang");
}

function writeIndex() {
  const have = readdirSync(outDir).filter(f => f.endsWith(".mp3")).map(f => f.slice(0, -4)).filter(k => jobs.has(k)).sort();
  writeFileSync(join(root, "src", "data", "tts.js"),
    "// DIBUAT OTOMATIS oleh scripts/build-tts.mjs — jangan diedit manual.\n" +
    "// Audio Azure Neural TTS di public/tts/ (kata tanpa rekaman + baris menyimak). Kosong = pakai TTS browser.\n" +
    "export const TTS = new Set(" + JSON.stringify(have) + ");\n");
  return have.length;
}

if (DRY) process.exit(0);
let n = 0, failed = 0;
try {
  for (const [key, j] of todo) {
    try {
      writeFileSync(join(outDir, key + ".mp3"), await synth(j));
    } catch (e) {
      if (/key\/region/.test(e.message)) throw e;
      failed++;
      console.error(`\n  gagal ${key} "${j.text}": ${e.message}`);
    }
    if (++n % 20 === 0 || n === todo.length) process.stdout.write(`\r  ${n}/${todo.length}`);
    if (n % 100 === 0) writeIndex(); // simpan progres
  }
} finally {
  console.log(`\nselesai: ${writeIndex()} file terdaftar di src/data/tts.js${failed ? `, ${failed} gagal (jalankan ulang)` : ""}`);
}
