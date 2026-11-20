import { useEffect, useRef, useState } from "react";
import { logActivity } from "../lib/stats.js";
import { useLang, meaning } from "../lib/i18n.jsx";
import { SpeakButton, speak, stopSpeaking } from "../lib/speech.jsx";

// hz2id/id2hz/py2hz = kuis biasa; au2hz/au2py/au2id = kuis dengar (audio diputar, pilih hanzi / pinyin / arti)
const TYPES = ["hz2id", "id2hz", "py2hz", "au2hz", "au2py", "au2id"];
const LISTEN = new Set(["au2hz", "au2py", "au2id"]);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// pinyin dengan nada tanpa spasi ("shì"), dan tanpa nada per suku kata (["shi"])
const toned = p => (p || "").toLowerCase().normalize("NFC").replace(/[\s'’·-]/g, "");
const sylls = p => (p || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[\s'’·-]+/).filter(Boolean);

/**
 * Pengecoh untuk kuis dengar: bunyinya mirip (suku kata sama beda nada, jumlah suku kata sama),
 * tapi TIDAK BOLEH homofon (pinyin + nada sama) supaya soal tidak ambigu.
 */
function listenDistractors(word, words) {
  const ans = toned(word.p), aS = sylls(word.p);
  const seenH = new Set([word.h]), seenP = new Set([ans]), seenM = new Set([word.id, word.en].filter(Boolean));
  const scored = shuffle(words.filter(w => w.k !== word.k)).map(w => {
    const s = sylls(w.p);
    let score = Math.random(); // variasi
    if (s.length === aS.length) score += 2;
    if (s.join("") === aS.join("")) score += 4;            // sama persis kecuali nada: shì vs shí
    score += s.filter(x => aS.includes(x)).length * 1.5;  // berbagi suku kata
    return [score, w];
  }).sort((a, b) => b[0] - a[0]);
  const out = [];
  for (const [, w] of scored) {
    const p = toned(w.p);
    // buang homofon, hanzi kembar, dan arti kembar (untuk Dengar → Arti)
    if (seenH.has(w.h) || seenP.has(p) || seenM.has(w.id) || (w.en && seenM.has(w.en))) continue;
    seenH.add(w.h); seenP.add(p); seenM.add(w.id); if (w.en) seenM.add(w.en); out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

// Ambil soal berikutnya dari antrean acak: setiap kata keluar sekali per putaran,
// baru diacak ulang setelah semua kata sudah muncul.
// Fungsi murni (tidak mengubah argumen) supaya aman dipanggil ulang oleh StrictMode.
function makeQuestion(words, queue = [], lastKey = null, type = "hz2id") {
  if (!words.length) return { q: null, queue: [] };
  let rest = queue;
  if (!rest.length) {
    rest = shuffle(words);
    // jangan sampai kata terakhir putaran lalu langsung muncul lagi di awal putaran baru
    if (rest.length > 1 && rest[0].k === lastKey) rest = [...rest.slice(1), rest[0]];
  }
  const [word, ...remaining] = rest;
  let others;
  if (LISTEN.has(type)) others = listenDistractors(word, words);
  else {
    // pengecoh: hanzi & arti harus beda dari jawaban dan satu sama lain
    const seen = new Set([word.h, word.id]);
    others = shuffle(words.filter(w => w.k !== word.k))
      .filter(w => (seen.has(w.h) || seen.has(w.id) ? false : (seen.add(w.h), seen.add(w.id), true)))
      .slice(0, 3);
  }
  return { q: { word, opts: shuffle([word, ...others]) }, queue: remaining };
}

function PlayIcon({ size = 28 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export default function QuizView({ words, updateProg }) {
  const { t, lang } = useLang();
  const [type, setType] = useState("hz2id");
  const [state, setState] = useState(() => makeQuestion(words));
  const { q, queue } = state;
  const [picked, setPicked] = useState(null); // key opsi yang dipilih
  const [score, setScore] = useState({ right: 0, total: 0 });
  const listen = LISTEN.has(type);

  const next = (ty = type) => {
    setState(s => makeQuestion(words, s.queue, s.q?.word.k, ty));
    setPicked(null);
  };

  const chooseType = ty => {
    setType(ty);
    setScore({ right: 0, total: 0 });
    next(ty);
  };

  // kuis dengar: putar audio otomatis setiap soal baru
  useEffect(() => {
    if (listen && q) speak(q.word.h);
  }, [q, listen]);
  useEffect(() => stopSpeaking, []);

  const answer = o => {
    if (picked) return;
    setPicked(o.k);
    const ok = o.k === q.word.k;
    setScore(s => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    speak(q.word.h); // setelah menjawab, dengarkan pengucapan jawaban yang benar
    if (!ok) updateProg(p => { p[q.word.k] = "u"; return p; }); // → tercatat sebagai aktivitas lewat Study
    else logActivity();
  };

  // keyboard: 1–4 pilih jawaban, Enter soal berikutnya, Spasi/R putar ulang (kuis dengar)
  const handlers = useRef();
  handlers.current = { q, picked, answer, next, listen };
  useEffect(() => {
    const onKey = e => {
      if (["SELECT", "INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
      const h = handlers.current;
      if (!h.q) return;
      if (/^[1-4]$/.test(e.key) && !h.picked) { const o = h.q.opts[+e.key - 1]; if (o) h.answer(o); }
      else if (e.key === "Enter" && h.picked) { e.preventDefault(); h.next(); }
      else if ((e.key === " " || e.key.toLowerCase() === "r") && h.listen) { e.preventDefault(); speak(h.q.word.h); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!q) return <div className="empty">{t.noWords}</div>;
  const w = q.word;
  const m = x => meaning(x, lang);

  // isi pertanyaan & opsi per tipe
  const byMeaning = type === "hz2id" || type === "au2id";
  const optText = o => (byMeaning ? m(o) : type === "au2py" ? o.p : o.h);
  const optCls = byMeaning ? "" : type === "au2py" ? " py2" : " hz2";

  return (
    <section>
      <div className="toolbar" style={{ marginTop: 0 }}>
        {TYPES.map(ty => (
          <button key={ty} className={"chip" + (type === ty ? " on" : "")} onClick={() => chooseType(ty)}>
            {LISTEN.has(ty) && <PlayIcon size={13} />} {t.quizTypes[ty]}
          </button>
        ))}
      </div>
      <div className="quiz">
        <div className="score">
          {t.correct(score.right, score.total)}
          {` · ${words.length - queue.length} / ${words.length}`}
          {picked && (type !== "hz2id" ? ` · ${w.h} = ${w.p}, ${m(w)}` : ` · ${w.p}`)}
        </div>

        {listen ? (
          <div className="listen-q">
            <button className="listen-play" onClick={() => speak(w.h)} aria-label={t.listenAgain}>
              <PlayIcon size={40} />
            </button>
            <button className="chip listen-slow" onClick={() => speak(w.h, 0.6)}>{t.listenSlow}</button>
            <div className="listen-note">{type === "au2hz" ? t.listenHz : type === "au2py" ? t.listenPy : t.listenId}</div>
            {/* setelah menjawab, tampilkan kata yang tadi diputar */}
            {picked && <div className="listen-reveal"><span className="hz">{w.h}</span> <span className="py">{w.p}</span></div>}
          </div>
        ) : (
          <>
            <div className={"q" + (type === "hz2id" ? "" : " small") + (type === "py2hz" ? " pinyin" : "")}>
              {type === "hz2id" ? w.h : type === "id2hz" ? m(w) : w.p}
            </div>
            {/* soal Arti → Hanzi: suara baru boleh diputar setelah menjawab, supaya tidak membocorkan jawaban */}
            {(type !== "id2hz" || picked) && (
              <div className="quiz-say"><SpeakButton text={w.h} label={t.listen} /></div>
            )}
          </>
        )}

        <div className="opts">
          {q.opts.map((o, i) => {
            let cls = "opt" + optCls;
            if (picked && o.k === w.k) cls += " right";
            else if (picked === o.k) cls += " wrong";
            return (
              <button key={o.k} className={cls} onClick={() => answer(o)}>
                <small className="opt-n">{i + 1}</small>
                {optText(o)}
                {/* kuis dengar: setelah menjawab, tampilkan juga pinyin/hanzi tiap opsi untuk membandingkan bunyi */}
                {listen && picked && <small className="opt-sub">{type === "au2hz" ? o.p : type === "au2py" ? o.h : `${o.h} · ${o.p}`}</small>}
              </button>
            );
          })}
        </div>
        <button className="btn solid" style={{ marginTop: 18, width: "100%" }} disabled={!picked} onClick={() => next()}>
          {t.nextQ}
        </button>
        <div className="keys" style={{ marginTop: 12 }}>
          <kbd>1</kbd>–<kbd>4</kbd> {t.keyAnswer} · <kbd>Enter</kbd> {t.keyNext}
          {listen && <> · <kbd>{t.space}</kbd>/<kbd>R</kbd> {t.listenAgain}</>}
        </div>
      </div>
    </section>
  );
}
