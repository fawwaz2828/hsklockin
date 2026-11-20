// Nama file audio TTS (Azure) yang dibuat scripts/build-tts.mjs. Dipakai bersama oleh skrip & app,
// jadi app bisa menemukan file sebuah baris tanpa peta besar: cukup hash (FNV-1a 32-bit) dari "suara|teks".

/** Peran pembicara → kode suara. "" = narator (narasi & pertanyaan "问：…"). */
export const ROLE = { "女": "f", "男": "m", "": "n" };

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Kunci file untuk satu baris dialog/narasi → "f-1a2b3c4d" (file: public/tts/f-1a2b3c4d.mp3) */
export const lineKey = (who, text) => `${ROLE[who] ?? "n"}-${fnv1a(`${ROLE[who] ?? "n"}|${text}`)}`;

/** Kunci file untuk satu kata (kata yang tidak punya rekaman audio-cmn) → "w-…" */
export const wordKey = text => `w-${fnv1a(`w|${text}`)}`;
