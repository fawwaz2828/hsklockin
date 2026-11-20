// Audio pengucapan.
// 1. Rekaman penutur asli (public/audio, dari hugolpz/audio-cmn, CC BY-SA 3.0) kalau kata itu ada rekamannya.
// 2. Selain itu (kalimat contoh, kata tanpa rekaman): Web Speech API, suara Mandarin zh-CN.
import { useEffect, useState } from "react";
import { AUDIO } from "../data/audio.js";

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
export const hasRecording = text => !!AUDIO[text];

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
  synth?.cancel();
  if (player) { player.pause(); player = null; }
}

/** Ucapkan teks Mandarin. rate < 1 = lebih pelan (hanya untuk TTS). */
export function speak(text, rate = 0.85) {
  if (!text) return;
  stopSpeaking(); // hentikan suara sebelumnya supaya tidak menumpuk
  const file = AUDIO[text];
  if (!file) return tts(text, rate);
  const a = new Audio(import.meta.env.BASE_URL + "audio/" + encodeURIComponent(file));
  player = a;
  // file gagal dimuat/diputar → jatuh ke TTS
  const fallback = () => { if (player === a) { player = null; tts(text, rate); } };
  a.addEventListener("error", fallback, { once: true });
  a.play().catch(err => { if (err?.name !== "AbortError") fallback(); });
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
