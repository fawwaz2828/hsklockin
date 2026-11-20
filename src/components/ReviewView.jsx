// Tab "Ulang": spaced repetition. Menampilkan kata yang jatuh tempo hari ini (dari semua lesson),
// lalu kamu menilai seberapa ingat: Lupa / Sulit / Ingat / Mudah → jadwal ulang berikutnya.
import { useEffect, useMemo, useRef, useState } from "react";
import { LESSONS } from "../data/lessons.js";
import { useLang } from "../lib/i18n.jsx";
import { speak, stopSpeaking, SpeakButton } from "../lib/speech.jsx";
import { gsap, prefersReducedMotion } from "../lib/motion.js";
import { getItem, setItem } from "../lib/storage.js";
import { AGAIN, HARD, GOOD, EASY, today, review, isDue, nextInterval, fmtDays } from "../lib/srs.js";
import { Faces } from "./CardView.jsx";

const ALL = new Map(LESSONS.flatMap(L => L.words).map(w => [w.k, w]));
const NEW_BATCH = 10;

const onScreen = el => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 80 && r.top < window.innerHeight - 80;
};

// kata jatuh tempo: yang paling lama terlambat duluan, sisanya acak supaya urutan tidak hafal pola
const dueQueue = srs => {
  const day = today();
  return Object.keys(srs)
    .filter(k => ALL.has(k) && isDue(srs[k], day))
    .map(k => [srs[k].due, Math.random(), k])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(x => x[2]);
};

export default function ReviewView({ pool, srs, updateSrs, prog, updateProg }) {
  const { t, lang } = useLang();
  const [queue, setQueue] = useState(() => dueQueue(srs));
  const [done, setDone] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState(() => getItem("hsk-review-front") || "hz");
  useEffect(() => { setItem("hsk-review-front", mode); }, [mode]);

  const curKey = queue[0];
  const w = ALL.get(curKey);
  const card = srs[curKey];

  // statistik
  const day = today();
  const cards = Object.entries(srs).filter(([k]) => ALL.has(k));
  const tomorrow = cards.filter(([, c]) => c.due === day + 1).length;
  const mature = cards.filter(([, c]) => c.i >= 21).length;
  const fresh = useMemo(() => pool.filter(x => !srs[x.k]), [pool, srs]);

  const sceneRef = useRef(null);
  useEffect(() => {
    setFlipped(false);
    if (!sceneRef.current || prefersReducedMotion()) return;
    gsap.fromTo(sceneRef.current, { opacity: 0, y: 14, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "power2.out", clearProps: "filter" });
  }, [curKey, done]);
  useEffect(() => stopSpeaking, []);

  const rate = r => {
    if (!curKey || !flipped) return;
    updateSrs(s => { s[curKey] = review(s[curKey], r); return s; });
    updateProg(p => { p[curKey] = r === AGAIN ? "u" : "k"; return p; });
    setDone(d => d + 1);
    setQueue(q => {
      const rest = q.slice(1);
      if (r !== AGAIN) return rest;
      // lupa → muncul lagi sebentar lagi di sesi ini (setelah ±3 kartu)
      const at = Math.min(3, rest.length);
      return [...rest.slice(0, at), curKey, ...rest.slice(at)];
    });
  };

  // reset jadwal: kata di lesson yang dipilih, atau semua. Status hafal di Flashcard tidak diubah.
  const [askReset, setAskReset] = useState(false);
  useEffect(() => {
    if (!askReset) return;
    const tm = setTimeout(() => setAskReset(false), 6000);
    return () => clearTimeout(tm);
  }, [askReset]);
  const poolKeys = useMemo(() => new Set(pool.map(x => x.k)), [pool]);
  const inPool = cards.filter(([k]) => poolKeys.has(k)).length;
  const resetSrs = all => {
    updateSrs(s => { Object.keys(s).forEach(k => { if (all || poolKeys.has(k)) delete s[k]; }); return s; });
    setQueue(q => (all ? [] : q.filter(k => !poolKeys.has(k))));
    setDone(0);
    setAskReset(false);
  };

  const addNew = () => {
    const pick = fresh.slice(0, NEW_BATCH).map(x => x.k);
    if (!pick.length) return;
    updateSrs(s => { pick.forEach(k => { s[k] = { i: 0, due: today(), n: 0, l: 0 }; }); return s; });
    setQueue(q => [...q, ...pick]);
  };

  const handlers = useRef();
  handlers.current = { flip: () => curKey && setFlipped(f => !f), rate, say: () => w && speak(w.h), flipped };
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!onScreen(sceneRef.current)) return;
      const h = handlers.current;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (e.key === "Enter" && h.flipped) h.rate(GOOD); else h.flip();
      } else if (["1", "2", "3", "4"].includes(e.key)) h.rate(+e.key - 1);
      else if (e.key.toLowerCase() === "l") h.say();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const btns = [
    [AGAIN, t.srs.again, "warn"],
    [HARD, t.srs.hard, ""],
    [GOOD, t.srs.good, "ok"],
    [EASY, t.srs.easy, ""],
  ];

  return (
    <>
      <div className="toolbar">
        <select className="chip" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="hz">{t.front.hz}</option>
          <option value="hzpy">{t.front.hzpy}</option>
          <option value="id">{t.front.id}</option>
        </select>
        <button className="chip" onClick={addNew} disabled={!fresh.length} title={t.srs.addNewHint}>
          + {t.srs.addNew(Math.min(NEW_BATCH, fresh.length))}
        </button>
        {!askReset ? (
          <button className="chip" onClick={() => setAskReset(true)} disabled={!cards.length} title={t.srs.resetHint}>
            {t.srs.reset}
          </button>
        ) : (
          <span className="srs-reset" role="group" aria-label={t.srs.resetAsk}>
            <span className="mono">{t.srs.resetAsk}</span>
            <button className="chip warn" onClick={() => resetSrs(false)} disabled={!inPool}>{t.srs.resetSel(inPool)}</button>
            <button className="chip warn" onClick={() => resetSrs(true)}>{t.srs.resetAll(cards.length)}</button>
            <button className="chip" onClick={() => setAskReset(false)}>{t.srs.cancel}</button>
          </span>
        )}
      </div>

      <section>
        <div className="srs-stats">
          <div><b>{queue.length}</b><span>{t.srs.left}</span></div>
          <div><b>{done}</b><span>{t.srs.done}</span></div>
          <div><b>{tomorrow}</b><span>{t.srs.tomorrow}</span></div>
          <div><b>{cards.length}</b><span>{t.srs.total(mature)}</span></div>
        </div>

        {!w ? (
          <div className="empty">
            {cards.length ? t.srs.emptyDone : t.srs.emptyNone}
            <br />
            <small className="srs-empty-sub">{fresh.length ? t.srs.emptyHint(Math.min(NEW_BATCH, fresh.length)) : t.srs.allIn}</small>
            {fresh.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <button className="btn solid" onClick={addNew}>+ {t.srs.addNew(Math.min(NEW_BATCH, fresh.length))}</button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="scene" ref={sceneRef} onClick={() => setFlipped(f => !f)}>
              <div className={"card" + (flipped ? " flip" : "")}>
                <Faces w={w} mode={mode} multi="level" status={card?.n ? prog[w.k] : null} />
              </div>
              {(mode !== "id" || flipped) && <SpeakButton text={w.h} label={t.listen} className="corner" />}
              {!card?.n && <span className="srs-new">{t.srs.newTag}</span>}
            </div>
            {flipped ? (
              <div className="controls srs-rate">
                {btns.map(([r, label, cls]) => (
                  <button key={r} className={"btn " + cls} onClick={() => rate(r)}>
                    {label}
                    <small>{fmtDays(nextInterval(card, r), lang)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="controls srs-show">
                <button className="btn solid" onClick={() => setFlipped(true)}>{t.srs.show}</button>
              </div>
            )}
            <div className="keys">
              <kbd>{t.space}</kbd> {t.srs.keyFlip} · <kbd>1</kbd>–<kbd>4</kbd> {t.srs.keyRate} · <kbd>L</kbd> {t.keys[4]}
              <div className="hint" style={{ marginTop: 6, fontSize: 11 }}>{t.srs.explain}</div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
