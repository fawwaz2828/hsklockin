import { createContext, useContext, useEffect, useState } from "react";
import { getItem, setItem } from "./storage.js";

const DICT = {
  id: {
    tagline: "Flashcard kosakata HSK 1–4",
    statement: ["Kosakata HSK 1–4,", "satu kartu sekali waktu"],
    desc: n =>
      `${n} kosakata HSK 1–4 (versi 2.0 & 3.0), dibagi per lesson. Setiap kata punya hanzi, pinyin, arti, dan contoh kalimat. Isinya: flashcard untuk menghafal, kuis pilihan ganda, dan daftar kata. Kata yang sudah kamu hafal tersimpan otomatis di browser.`,
    start: "Mulai belajar",
    beijing: "Waktu Beijing",
    lessonsWords: (l, w) => `${l} lesson · ${w} kata`,
    home: "← Beranda",
    views: { cards: "Flashcard", quiz: "Kuis", list: "Daftar kata" },
    allLessons: "Semua lesson",
    numbers: "Angka",
    wordsSub: (n, sub) => `${n} kosakata · ${sub}`,
    wordsAll: (n, l) => `${n} kosakata dari ${l} lesson`,
    level: "Level", version: "Versi", lesson: "Lesson", all: "Semua",
    front: { hz: "Depan: Hanzi", hzpy: "Depan: Hanzi + Pinyin", id: "Depan: Arti" },
    font: { label: "Font hanzi", serif: "Serif", system: "Standar" },
    shuffle: "Acak", shuffled: "Diacak", onlyU: "Hanya yang belum hafal",
    reset: "Reset progres", resetLesson: "Reset lesson ini? Klik lagi", resetAll: "Reset semua lesson? Klik lagi",
    known: (k, n) => `${k} / ${n} hafal`,
    statusK: "Hafal", statusU: "Belum hafal",
    hintMeaning: "Klik / ↑ ↓ untuk lihat arti", hintHanzi: "Klik / ↑ ↓ untuk lihat hanzi",
    prev: "← Sebelumnya", next: "Berikutnya →", markU: "Belum hafal", markK: "Sudah hafal ✓",
    keys: ["balik kartu", "pindah", "belum hafal", "sudah hafal", "dengar"],
    listen: "Dengarkan pengucapan", listenEx: "Dengarkan contoh kalimat", autoSay: "Suara otomatis",
    noVoice: "Browser ini tidak punya suara Mandarin (zh-CN). Coba Edge/Chrome atau pasang bahasa Mandarin di pengaturan Windows.", space: "Spasi",
    keysNote: "Shortcut aktif saat kartu terlihat di layar",
    empty: ["Semua kata di pilihan ini sudah ditandai hafal.", "Matikan filter “Hanya yang belum hafal” atau reset progres."],
    quizTypes: { hz2id: "Hanzi → Arti", id2hz: "Arti → Hanzi", py2hz: "Pinyin → Hanzi" },
    correct: (r, t) => `Benar ${r} / ${t}`,
    nextQ: "Soal berikutnya →",
    noWords: "Tidak ada kata untuk kuis.",
    combine: "Gabung lesson", combineHint: n => `${n} lesson dipilih · bisa dari HSK 1–4, klik untuk tambah/hapus`,
    lessonCount: n => `${n} lesson`,
  },
  en: {
    tagline: "HSK 1–4 vocabulary flashcards",
    statement: ["HSK 1–4 vocabulary,", "one card at a time"],
    desc: n =>
      `${n} HSK 1–4 words (2.0 & 3.0 syllabus), grouped by lesson. Every word comes with hanzi, pinyin, meaning and an example sentence. Inside: flashcards to memorise, multiple-choice quizzes and a word list. Words you mark as learned are saved in your browser automatically.`,
    start: "Start learning",
    beijing: "Beijing time",
    lessonsWords: (l, w) => `${l} lessons · ${w} words`,
    home: "← Home",
    views: { cards: "Flashcards", quiz: "Quiz", list: "Word list" },
    allLessons: "All lessons",
    numbers: "Numbers",
    wordsSub: (n, sub) => `${n} words · ${sub}`,
    wordsAll: (n, l) => `${n} words from ${l} lessons`,
    level: "Level", version: "Version", lesson: "Lesson", all: "All",
    front: { hz: "Front: Hanzi", hzpy: "Front: Hanzi + Pinyin", id: "Front: Meaning" },
    font: { label: "Hanzi font", serif: "Serif", system: "Standard" },
    shuffle: "Shuffle", shuffled: "Shuffled", onlyU: "Not learned only",
    reset: "Reset progress", resetLesson: "Reset this lesson? Click again", resetAll: "Reset all lessons? Click again",
    known: (k, n) => `${k} / ${n} learned`,
    statusK: "Learned", statusU: "Not yet",
    hintMeaning: "Click / ↑ ↓ to see the meaning", hintHanzi: "Click / ↑ ↓ to see the hanzi",
    prev: "← Previous", next: "Next →", markU: "Not yet", markK: "Learned ✓",
    keys: ["flip card", "move", "not yet", "learned", "listen"],
    listen: "Listen to pronunciation", listenEx: "Listen to the example", autoSay: "Auto audio",
    noVoice: "This browser has no Mandarin (zh-CN) voice. Try Edge/Chrome or install Chinese in your Windows language settings.", space: "Space",
    keysNote: "Shortcuts work while the card is on screen",
    empty: ["Every word in this selection is marked as learned.", "Turn off “Not learned only” or reset your progress."],
    quizTypes: { hz2id: "Hanzi → Meaning", id2hz: "Meaning → Hanzi", py2hz: "Pinyin → Hanzi" },
    correct: (r, t) => `Correct ${r} / ${t}`,
    nextQ: "Next question →",
    noWords: "No words available for the quiz.",
    combine: "Combine lessons", combineHint: n => `${n} lesson${n === 1 ? "" : "s"} selected · across HSK 1–4, click to add/remove`,
    lessonCount: n => `${n} lessons`,
  },
};

/** Arti kata sesuai bahasa (cadangan: arti Indonesia kalau arti Inggris kosong). */
export const meaning = (w, lang) => (lang === "en" && w.en ? w.en : w.id);

const LangContext = createContext({ lang: "id", t: DICT.id, setLang: () => {} });

function initialLang() {
  const saved = getItem("hsk-lang");
  if (saved === "id" || saved === "en") return saved;
  return (navigator.language || "id").toLowerCase().startsWith("id") ? "id" : "en";
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang);
  useEffect(() => {
    setItem("hsk-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangContext.Provider value={{ lang, t: DICT[lang], setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {["id", "en"].map(l => (
        <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
