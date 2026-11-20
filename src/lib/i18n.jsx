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
    views: { cards: "Flashcard", review: "Ulang", quiz: "Kuis", order: "Susun", list: "Daftar kata" },
    ord: {
      task: "Susun potongan berikut menjadi kalimat yang benar (HSK 4 书写 bagian 1).",
      allTopics: n => `Semua pola (${n} soal)`, hint: "Tampilkan arti",
      placeholder: "Klik potongan di bawah sesuai urutan…", yourAnswer: "Jawabanmu",
      check: "Cek", clear: "Hapus", skip: "Lewati",
      right: "Benar! ✓", wrong: "Belum tepat. Urutan yang benar:",
      altNote: "Kalau urutanmu juga masuk akal secara tata bahasa,", acceptMine: "hitung sebagai benar",
      mastered: (k, n) => `${k} / ${n} dikuasai`, session: (k, n) => `sesi ini ${k}/${n}`,
      keyPick: "pilih potongan", keyUndo: "batalkan", keyCheck: "cek / lanjut",
    },
    srs: {
      again: "Lupa", hard: "Sulit", good: "Ingat", easy: "Mudah", show: "Tampilkan jawaban",
      left: "perlu diulang", done: "selesai sesi ini", tomorrow: "jatuh tempo besok", total: m => `kata terjadwal · ${m} sudah mantap`,
      addNew: n => `${n} kata baru`, addNewHint: "Tambahkan kata yang belum pernah dipelajari dari lesson yang dipilih",
      newTag: "Baru", keyFlip: "lihat jawaban", keyRate: "nilai (Lupa → Mudah)",
      emptyDone: "Semua kata hari ini sudah diulang 🎉", emptyNone: "Belum ada kata yang dijadwalkan.",
      emptyHint: n => `Tambah ${n} kata baru dari lesson yang dipilih, atau tandai kata di Flashcard.`,
      allIn: "Semua kata di lesson yang dipilih sudah masuk jadwal.",
      explain: "Kata yang kamu ingat muncul lagi makin jarang (1 hr → 3 hr → 1 mgg → …); yang lupa diulang hari ini juga.",
    },
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
    moreEx: "5 contoh kalimat lainnya", loading: "Memuat…", noMoreEx: "Belum ada contoh tambahan untuk kata ini.",
    listen: "Dengarkan pengucapan", listenEx: "Dengarkan contoh kalimat", autoSay: "Suara otomatis",
    searchPh: v => `Cari di semua kosakata HSK 1–4${v ? " (" + v + ")" : ""} — hanzi, pinyin, atau arti…`, searchCount: n => `${n} kata`,
    searchNone: q => `Tidak ada kata yang cocok dengan “${q}”.`,
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
    views: { cards: "Flashcards", review: "Review", quiz: "Quiz", order: "Word order", list: "Word list" },
    ord: {
      task: "Put the pieces in order to make a correct sentence (HSK 4 writing, part 1).",
      allTopics: n => `All patterns (${n} questions)`, hint: "Show meaning",
      placeholder: "Click the pieces below in order…", yourAnswer: "Your answer",
      check: "Check", clear: "Clear", skip: "Skip",
      right: "Correct! ✓", wrong: "Not quite. The correct order:",
      altNote: "If your order is also grammatically fine,", acceptMine: "count it as correct",
      mastered: (k, n) => `${k} / ${n} mastered`, session: (k, n) => `this session ${k}/${n}`,
      keyPick: "pick a piece", keyUndo: "undo", keyCheck: "check / next",
    },
    srs: {
      again: "Again", hard: "Hard", good: "Good", easy: "Easy", show: "Show answer",
      left: "due now", done: "done this session", tomorrow: "due tomorrow", total: m => `words scheduled · ${m} mature`,
      addNew: n => `${n} new words`, addNewHint: "Add words you haven't studied yet from the selected lessons",
      newTag: "New", keyFlip: "show answer", keyRate: "rate (Again → Easy)",
      emptyDone: "All of today's reviews are done 🎉", emptyNone: "No words scheduled yet.",
      emptyHint: n => `Add ${n} new words from the selected lessons, or mark words in Flashcards.`,
      allIn: "Every word in the selected lessons is already scheduled.",
      explain: "Words you remember come back less and less often (1d → 3d → 1w → …); ones you forget come back today.",
    },
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
    moreEx: "5 more example sentences", loading: "Loading…", noMoreEx: "No extra examples for this word yet.",
    listen: "Listen to pronunciation", listenEx: "Listen to the example", autoSay: "Auto audio",
    searchPh: v => `Search all HSK 1–4 words${v ? " (" + v + ")" : ""} — hanzi, pinyin or meaning…`, searchCount: n => `${n} word${n === 1 ? "" : "s"}`,
    searchNone: q => `No words match “${q}”.`,
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
