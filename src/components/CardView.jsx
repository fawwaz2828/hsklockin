import { useEffect, useMemo, useRef, useState } from "react";
import { lnum, llevel } from "../data/lessons.js";
import { shuffle, getItem, setItem } from "../lib/storage.js";
import { gsap, prefersReducedMotion } from "../lib/motion.js";
import { useLang, meaning } from "../lib/i18n.jsx";
import { speak, stopSpeaking, useHasVoice, SpeakButton } from "../lib/speech.jsx";
import { MoreExamples } from "../lib/examples.jsx";
import { AGAIN, GOOD, review, isDue } from "../lib/srs.js";

// true kalau elemen terlihat di layar (shortcut keyboard hanya aktif saat kartu kelihatan)
const onScreen = el => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 80 && r.top < window.innerHeight - 80;
};

// Ikon garis (mengikuti warna teks lewat currentColor)
function ShuffleIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function StatusTag({ s }) {
  const { t } = useLang();
  if (s === "k") return <span className="status k">{t.statusK}</span>;
  if (s === "u") return <span className="status u">{t.statusU}</span>;
  return null;
}

// Arti utama mengikuti bahasa yang dipilih; bahasa lainnya tampil kecil di bawah
function Meaning({ w }) {
  const { lang } = useLang();
  const main = meaning(w, lang);
  const other = lang === "en" ? (w.en ? w.id : "") : w.en;
  return (
    <>
      <div className="id">{main}</div>
      {other && <div className="en">{other}</div>}
    </>
  );
}

function Notes({ w }) {
  const { t, lang } = useLang();
  const en = lang === "en";
  const note = en ? w.noteEn || w.note : w.note;
  return (
    <>
      {note && <div className="note">{note}</div>}
      {w.ex && (
        <div className="ex">
          <div className="z">
            {w.ex.zh} <SpeakButton text={w.ex.zh} rate={0.8} label={t.listenEx} className="inline" />
          </div>
          <div className="y">{w.ex.py}</div>
          <div className="t">{en ? w.ex.en || w.ex.id : w.ex.id}</div>
        </div>
      )}
      <MoreExamples key={w.h} h={w.h} />
    </>
  );
}

export function Faces({ w, mode, multi, status }) {
  const { t } = useLang();
  const top = (
    <>
      <span className="num">{multi === "level" ? `HSK${llevel(w.l)} L${lnum(w.l)} · ` : multi ? `L${lnum(w.l)} · ` : ""}#{w.n}</span>
      <span className="pos">{w.t}</span>
    </>
  );
  const hz = <div className="hz">{w.h}</div>;
  const py = <div className="py">{w.p}</div>;
  let front, back;
  if (mode === "id") {
    front = (
      <div className="inner">
        <Meaning w={w} />
        <div className="hint">{t.hintHanzi}</div>
      </div>
    );
    back = <div className="inner">{hz}{py}<Notes w={w} /></div>;
  } else {
    front = (
      <div className="inner">
        {hz}
        {mode === "hzpy" && py}
        <div className="hint">{t.hintMeaning}</div>
      </div>
    );
    back = (
      <div className="inner">
        <div className="hz small">{w.h}</div>
        {py}
        <div style={{ height: 14 }} />
        <Meaning w={w} />
        <Notes w={w} />
      </div>
    );
  }
  return (
    <>
      <div className="face front">{top}{front}<StatusTag s={status} /></div>
      <div className="face back">{top}{back}<StatusTag s={status} /></div>
    </>
  );
}

export default function CardView({ words, multi, prog, updateProg, srs, updateSrs, hzFont, setHzFont }) {
  const { t } = useLang();
  const byK = useMemo(() => new Map(words.map(w => [w.k, w])), [words]);
  const [order, setOrder] = useState(() => words.map(w => w.k));
  const [shuffled, setShuffled] = useState(false);
  const [onlyU, setOnlyU] = useState(false);
  const [mode, setMode] = useState("hz");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const hasVoice = useHasVoice();
  const [autoSay, setAutoSay] = useState(() => getItem("hsk-autosay") === "1");
  useEffect(() => { setItem("hsk-autosay", autoSay ? "1" : "0"); }, [autoSay]);

  const deck = useMemo(() => order.filter(k => !onlyU || prog[k] !== "k"), [order, onlyU, prog]);
  const i = deck.length ? Math.min(idx, deck.length - 1) : 0;
  const curKey = deck[i];

  // Tunda ganti isi kartu 120 ms supaya sisi belakang kartu berikutnya
  // tidak sempat terlihat saat kartu berbalik ke depan.
  const [shownKey, setShownKey] = useState(curKey);
  useEffect(() => {
    setFlipped(false);
    const t = setTimeout(() => setShownKey(curKey), 120);
    return () => clearTimeout(t);
  }, [curKey, mode]);
  const w = byK.get(shownKey) || byK.get(curKey);

  // Auto suara: baca kata saat kartu baru tampil (atau saat dibalik, kalau depan = arti)
  useEffect(() => {
    if (!autoSay || !w) return;
    if (mode !== "id" ? !flipped : flipped) speak(w.h);
  }, [autoSay, shownKey, mode, flipped]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => stopSpeaking, []); // berhenti bicara saat pindah halaman

  // Kartu baru masuk dengan blur + naik sedikit
  const sceneRef = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!sceneRef.current || prefersReducedMotion()) return;
    gsap.fromTo(sceneRef.current,
      { opacity: 0, y: 14, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "power2.out", clearProps: "filter" });
  }, [shownKey]);

  const known = words.filter(x => prog[x.k] === "k").length;

  const go = d => {
    if (deck.length) setIdx((i + d + deck.length) % deck.length);
  };
  const mark = s => {
    if (!deck.length) return;
    updateProg(p => { p[curKey] = s; return p; });
    // ikut jadwalkan di tab Ulang — hanya kata baru / yang jatuh tempo, supaya interval tidak melonjak
    // kalau kartu yang sama ditandai berkali-kali
    if (updateSrs && (!srs?.[curKey] || isDue(srs[curKey])))
      updateSrs(x => { x[curKey] = review(x[curKey], s === "k" ? GOOD : AGAIN); return x; });
    if (onlyU && s === "k") {
      // kartu hilang dari deck; indeks yang sama sekarang menunjuk kartu berikutnya
      if (i >= deck.length - 1) setIdx(0);
    } else go(1);
  };

  // Keyboard: handler selalu memakai state terbaru lewat ref
  const handlers = useRef();
  handlers.current = { flip: () => setFlipped(f => !f), go, mark, say: () => w && speak(w.h) };
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
      if (!onScreen(sceneRef.current)) return; // jangan bajak Spasi/panah saat membaca bagian lain
      const h = handlers.current;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); h.flip(); }
      else if (e.key === "ArrowRight") h.go(1);
      else if (e.key === "ArrowLeft") h.go(-1);
      else if (e.ctrlKey || e.metaKey || e.altKey) return;
      else if (e.key.toLowerCase() === "n") h.mark("u");
      else if (e.key.toLowerCase() === "m") h.mark("k");
      else if (e.key.toLowerCase() === "l") h.say();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const onReset = () => {
    if (!confirmReset) return setConfirmReset(true);
    updateProg(p => { words.forEach(x => delete p[x.k]); return p; });
    updateSrs?.(x => { words.forEach(w => delete x[w.k]); return x; });
    setConfirmReset(false);
    setOrder(words.map(x => x.k));
    setShuffled(false);
    setIdx(0);
  };

  const onShuffle = () => {
    setOrder(o => shuffle(o));
    setShuffled(true);
    setIdx(0);
  };

  return (
    <>
      <div className="toolbar">
        <select className="chip" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="hz">{t.front.hz}</option>
          <option value="hzpy">{t.front.hzpy}</option>
          <option value="id">{t.front.id}</option>
        </select>
        <div className="font-switch" role="group" aria-label={t.font.label}>
          <span className="mono">{t.font.label}</span>
          <button className={"chip hz-serif-sample" + (hzFont === "serif" ? " on" : "")} onClick={() => setHzFont("serif")}>
            汉 {t.font.serif}
          </button>
          <button className={"chip hz-system-sample" + (hzFont === "system" ? " on" : "")} onClick={() => setHzFont("system")}>
            汉 {t.font.system}
          </button>
        </div>
        <button className={"chip" + (shuffled ? " on" : "")} onClick={onShuffle}>
          <ShuffleIcon /> {shuffled ? t.shuffled : t.shuffle}
        </button>
        <button className={"chip" + (onlyU ? " on" : "")} onClick={() => { setOnlyU(v => !v); setIdx(0); }}>
          {t.onlyU}
        </button>
        {/* tetap aktif tanpa suara zh-CN: sebagian besar kata punya rekaman asli */}
        <button className={"chip" + (autoSay ? " on" : "")} title={hasVoice ? "" : t.noVoice}
          onClick={() => setAutoSay(v => !v)}>
          {t.autoSay}
        </button>
        <button className={"chip" + (confirmReset ? " on" : "")} onClick={onReset}>
          {confirmReset ? (multi ? t.resetAll : t.resetLesson) : t.reset}
        </button>
      </div>

      <section>
        <div className="progress">
          <span>{deck.length ? `${i + 1} / ${deck.length}` : "0 / 0"}</span>
          <div className="bar">
            <i style={{ width: (words.length ? (known / words.length) * 100 : 0) + "%" }} />
          </div>
          <span>{t.known(known, words.length)}</span>
        </div>

        {deck.length === 0 ? (
          <div className="empty">
            {t.empty[0]}<br />
            {t.empty[1]}
          </div>
        ) : (
          <div>
            <div className="scene" ref={sceneRef} onClick={() => setFlipped(f => !f)}>
              <div className={"card" + (flipped ? " flip" : "")}>
                {w && <Faces w={w} mode={mode} multi={multi} status={prog[w.k]} />}
              </div>
              {/* satu tombol suara di luar kartu 3D (di HP tombol di sisi belakang kartu bisa ikut tembus terlihat);
                  disembunyikan di sisi depan kalau depan = arti, supaya tidak membocorkan jawaban */}
              {w && (mode !== "id" || flipped) && <SpeakButton text={w.h} label={t.listen} className="corner" />}
            </div>
            <div className="controls">
              <button className="btn" onClick={() => go(-1)}>{t.prev}</button>
              <button className="btn warn" onClick={() => mark("u")}>{t.markU}</button>
              <button className="btn ok" onClick={() => mark("k")}>{t.markK}</button>
              <button className="btn" onClick={() => go(1)}>{t.next}</button>
            </div>
            <div className="keys">
              <kbd>↑</kbd> <kbd>↓</kbd> {t.keys[0]} · <kbd>←</kbd> <kbd>→</kbd> {t.keys[1]} · <kbd>N</kbd> {t.keys[2]} ·{" "}
              <kbd>M</kbd> {t.keys[3]} · <kbd>L</kbd> {t.keys[4]}
              {!hasVoice && <div className="hint" style={{ marginTop: 6, fontSize: 11 }}>{t.noVoice}</div>}
              <div className="hint" style={{ marginTop: 6, fontSize: 11 }}>{t.keysNote}</div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
