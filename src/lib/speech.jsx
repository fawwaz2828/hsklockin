// Audio pengucapan.
// 1. Rekaman penutur asli (public/audio, dari hugolpz/audio-cmn, CC BY-SA 3.0) kalau kata itu ada rekamannya.
// 2. Audio Azure Neural TTS (public/tts, dibuat scripts/build-tts.mjs): kata tanpa rekaman + semua baris menyimak.
// 3. Selain itu (kalimat contoh, atau file belum dibuat): Web Speech API browser, suara Mandarin zh-CN.
import { useEffect, useState } from "react";
import { AUDIO } from "../data/audio.js";
import { TTS } from "../data/tts.js";
import { lineKey, wordKey } from "./ttsKey.js";

const BASE = import.meta.env.BASE_URL;
/** URL file audio untuk satu kata, atau null. */
function wordUrl(text) {
  if (AUDIO[text]) return BASE + "audio/" + encodeURIComponent(AUDIO[text]);
  const k = wordKey(text);
  return TTS.has(k) ? BASE + "tts/" + k + ".mp3" : null;
}
const lineUrl = (who, text) => { const k = lineKey(who, text); return TTS.has(k) ? BASE + "tts/" + k + ".mp3" : null; };
/** true kalau audio Azure untuk menyimak sudah dibuat (tidak perlu suara browser). */
export const ttsReady = TTS.size > 0;
let seq = 0; // naik setiap stopSpeaking → antrean speakLines lama berhenti

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
let voice = null;
let player = null; // <audio> yang sedang diputar

const isZh = v => /^zh[-_](CN|Hans)/i.test(v.lang) || /^cmn/i.test(v.lang);

// Pilih suara terbaik: suara "Natural"/online (Edge) > Google > suara lokal lainnya
function pickVoice() {
  if (!synth) return null;
  const zh = synth.getVoices().filter(isZh);
  const score = v => (/natural|online/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : v.localService ? 1 : 0);
  voice = zh.sort((a, b) => score(b) - score(a))[0] || null;
  return voice;
}

/** true kalau browser punya suara Mandarin. Daftar suara dimuat async, jadi pakai hook. */
export function useHasVoice() {
  const [ok, setOk] = useState(() => !!pickVoice());
  useEffect(() => {
    if (!synth) return;
    const on = () => setOk(!!pickVoice());
    on();
    synth.addEventListener?.("voiceschanged", on);
    return () => synth.removeEventListener?.("voiceschanged", on);
  }, []);
  return ok;
}

/** true kalau teks ini punya rekaman asli. */
export const hasRecording = text => !!wordUrl(text);

function tts(text, rate) {
  if (!synth) return;
  if (!voice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  if (voice) u.voice = voice;
  u.rate = rate;
  synth.speak(u);
}

export function stopSpeaking() {
  seq++;
  synth?.cancel();
  if (player) { player.pause(); player = null; }
}

/** Ucapkan teks Mandarin. rate < 1 = lebih pelan (hanya untuk TTS). */
export function speak(text, rate = 0.85) {
  if (!text) return;
  stopSpeaking(); // hentikan suara sebelumnya supaya tidak menumpuk
  const url = wordUrl(text);
  if (!url) return tts(text, rate);
  const a = new Audio(url);
  player = a;
  // "pelan" (rate ≤ 0.7) juga berlaku untuk rekaman; nada suara tetap (preservesPitch bawaan browser)
  if (rate <= 0.7) a.playbackRate = 0.7;
  // file gagal dimuat/diputar → jatuh ke TTS
  const fallback = () => { if (player === a) { player = null; tts(text, rate); } };
  a.addEventListener("error", fallback, { once: true });
  a.play().catch(err => { if (err?.name !== "AbortError") fallback(); });
}

// Suara per jenis kelamin untuk dialog (menyimak). Edge punya Xiaoxiao (P) & Yunxi (L); Windows: Huihui (P);
// Chrome: Google 普通话 (P). Kalau tidak ada suara laki-laki, suara yang sama dipakai dengan nada lebih rendah.
const FEMALE = /xiaoxiao|xiaoyi|xiaohan|xiaomo|huihui|yaoyao|tingting|female|女/i;
const MALE = /yunxi|yunyang|yunjian|yunze|kangkang|male|男/i;
function genderVoices() {
  if (!synth) return {};
  const zh = synth.getVoices().filter(isZh);
  const score = v => (/natural|online/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : 1);
  const best = re => zh.filter(v => re.test(v.name) && !(re === FEMALE && MALE.test(v.name))).sort((a, b) => score(b) - score(a))[0] || null;
  return { f: best(FEMALE), m: best(MALE) };
}

/**
 * Putar beberapa baris berurutan (dialog/narasi). lines: [[pembicara, teks], ...] dengan pembicara "女" / "男" / "" (narator).
 * Tiap baris memakai file Azure kalau ada (suara P/L/narator asli), selain itu TTS browser. onEnd setelah baris terakhir.
 */
export function speakLines(lines, { rate = 0.9, onEnd } = {}) {
  stopSpeaking();
  if (!lines.length) return;
  const my = seq;
  const { f, m } = genderVoices();
  if (!voice) pickVoice();
  const next = i => {
    if (my !== seq) return;           // dihentikan / diganti
    if (i >= lines.length) return onEnd?.();
    const [who, text] = lines[i];
    const done = () => next(i + 1);
    const viaTts = () => {
      if (my !== seq) return;
      if (!synth) return done();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = rate;
      const v = who === "男" ? m || voice : who === "女" ? f || voice : voice;
      if (v) u.voice = v;
      if (who === "男" && !m) u.pitch = 0.55;   // tidak ada suara laki-laki → turunkan nada
      if (who === "女" && !f) u.pitch = 1.15;
      u.onend = done;
      synth.speak(u);
    };
    const url = lineUrl(who, text);
    if (!url) return viaTts();
    const a = new Audio(url);
    player = a;
    if (rate < 0.9) a.playbackRate = Math.max(rate, 0.7) + 0.05; // mode pelan
    a.addEventListener("ended", () => { if (player === a) player = null; done(); }, { once: true });
    a.addEventListener("error", () => { if (player === a) player = null; viaTts(); }, { once: true });
    a.play().catch(err => { if (err?.name !== "AbortError") viaTts(); });
  };
  next(0);
}

/** Tombol speaker kecil. stopPropagation supaya klik tidak ikut membalik kartu. */
export function SpeakButton({ text, rate, label, className = "" }) {
  const ok = useHasVoice() || hasRecording(text);
  return (
    <button
      type="button"
      className={"speak " + className}
      disabled={!ok}
      aria-label={label}
      title={label}
      onClick={e => { e.stopPropagation(); speak(text, rate); }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}
