// Animasi urutan goresan (笔顺) per karakter, memakai Hanzi Writer.
// Data goresan (Make Me a Hanzi, gratis) diambil dari CDN jsDelivr saat dibutuhkan, lalu di-cache browser.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { useLang } from "../lib/i18n.jsx";

const isHan = ch => /\p{Script=Han}/u.test(ch);
const SIZE = 104;

// warna dari token CSS supaya ikut tema terang/gelap
function colors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  return { stroke: v("--hz-stroke", "#2a1d1f"), outline: v("--hz-outline", "#ece4e5"), radical: v("--red", "#cf1830"), hl: v("--muted", "#d9606f") };
}

const StrokeOrder = forwardRef(function StrokeOrder({ text, hidden }, ref) {
  const { t } = useLang();
  const boxRef = useRef(null);
  const writers = useRef([]);
  const run = useRef(0);               // naik → animasi/latihan sebelumnya berhenti
  const [counts, setCounts] = useState([]);
  const [err, setErr] = useState(false);
  const [mode, setModeState] = useState("idle"); // idle | play | quiz | done
  const quizzing = useRef(false);
  const setMode = m => { quizzing.current = m === "quiz"; setModeState(m); };
  const chars = [...(text || "")].filter(isHan);
  const key = chars.join("");

  // animasikan semua karakter berurutan
  const play = (from = 0) => {
    const my = ++run.current;
    writers.current.forEach(w => { w.cancelQuiz(); w.showOutline(); });
    writers.current.slice(from).forEach(w => w.hideCharacter());
    setMode("play");
    const step = i => {
      if (my !== run.current) return;
      const w = writers.current[i];
      if (!w) return setMode("done");
      w.animateCharacter({ onComplete: () => setTimeout(() => step(i + 1), 250) });
    };
    step(from);
  };

  // latihan menulis: tulis tiap karakter dengan mouse/jari, berurutan
  const quiz = () => {
    const my = ++run.current;
    setMode("quiz");
    writers.current.forEach(w => { w.cancelQuiz(); w.hideCharacter(); });
    const step = i => {
      if (my !== run.current) return;
      const w = writers.current[i];
      if (!w) return setMode("done");
      w.quiz({ showHintAfterMisses: 2, onComplete: () => setTimeout(() => step(i + 1), 300) });
    };
    step(0);
  };

  useImperativeHandle(ref, () => ({ play: () => play(0) }));

  // ganti tema (tombol atau setelan sistem) → warna goresan ikut berubah
  useEffect(() => {
    const apply = () => {
      const c = colors();
      writers.current.forEach(w => {
        w.updateColor("strokeColor", c.stroke);
        w.updateColor("drawingColor", c.stroke);
        w.updateColor("radicalColor", c.radical);
        w.updateColor("outlineColor", c.outline);
        w.updateColor("highlightColor", c.hl);
      });
    };
    const mo = new MutationObserver(() => requestAnimationFrame(apply));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", apply);
    return () => { mo.disconnect(); mq?.removeEventListener?.("change", apply); };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || hidden || !key) return;
    const c = colors();
    setErr(false);
    setCounts([]);
    box.replaceChildren();
    writers.current = [...key].map((ch, i) => {
      const cell = document.createElement("div");
      cell.className = "stroke-cell";
      cell.title = t.strokes.replayOne;
      cell.addEventListener("click", () => {
        if (quizzing.current) return;
        const my = ++run.current;
        const w = writers.current[i];
        w.cancelQuiz();
        setMode("play");
        w.animateCharacter({ onComplete: () => my === run.current && setMode("done") });
      });
      box.appendChild(cell);
      HanziWriter.loadCharacterData(ch).then(d => setCounts(n => { const a = [...n]; a[i] = d.strokes.length; return a; }), () => {});
      return HanziWriter.create(cell, ch, {
        width: SIZE, height: SIZE, padding: 6,
        strokeColor: c.stroke, radicalColor: c.radical, outlineColor: c.outline,
        highlightColor: c.hl, drawingColor: c.stroke,
        strokeAnimationSpeed: 1.1, delayBetweenStrokes: 180,
        showCharacter: false, showOutline: true,
        onLoadCharDataError: () => setErr(true),
      });
    });
    const tm = setTimeout(() => play(0), 350);
    return () => {
      clearTimeout(tm);
      run.current++;
      writers.current.forEach(w => w.cancelQuiz());
      writers.current = [];
      box.replaceChildren();
    };
  }, [key, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!key) return null;
  return (
    <div className="strokes">
      <div className="strokes-head">
        <span className="mono">{t.strokes.title}</span>
        {!hidden && (
          <span className="strokes-btns">
            <button type="button" className="chip" onClick={() => play(0)}>▶ {t.strokes.play}</button>
            <button type="button" className={"chip" + (mode === "quiz" ? " on" : "")} onClick={quiz}>✍ {t.strokes.practice}</button>
          </span>
        )}
      </div>
      {hidden ? (
        <div className="hint">{t.strokes.hidden}</div>
      ) : (
        <>
          <div className="strokes-row" ref={boxRef} />
          <div className="strokes-meta">
            {chars.map((ch, i) => (
              <span key={i} style={{ width: SIZE }}>{counts[i] ? t.strokes.count(counts[i]) : " "}</span>
            ))}
          </div>
          {err && <div className="hint">{t.strokes.error}</div>}
          {mode === "quiz" && <div className="hint">{t.strokes.quizHint}</div>}
        </>
      )}
    </div>
  );
});

export default StrokeOrder;
