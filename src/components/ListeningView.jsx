// Tab "Menyimak": latihan 听力 gaya HSK 1–4 (bagian 1 benar/salah, bagian 2 dialog pendek, bagian 3 dialog panjang/bacaan).
// Bank soal per level dimuat terpisah (src/data/listening/).
// Audio memakai TTS browser (speakLines); teks & terjemahan baru tampil setelah menjawab, seperti ujian.
import { useEffect, useMemo, useRef, useState } from "react";
import { itemLines, loadListening, LEVELS } from "../data/listening/index.js";
import { useLang } from "../lib/i18n.jsx";
import { speakLines, stopSpeaking, ttsReady, useHasVoice } from "../lib/speech.jsx";
import { getItem, setItem } from "../lib/storage.js";
import { logActivity } from "../lib/stats.js";
import { SYNC_EVENT } from "../lib/cloud.js";
import { shuffled } from "../lib/order.js";

const KEY = "hsk-listen"; // { itemId: 1 (semua benar) | 0 }
const load = () => { try { return JSON.parse(getItem(KEY) || "{}") || {}; } catch { return {}; } };
const LETTERS = ["A", "B", "C", "D"];

// semua soal satu level, datar: { id, part, item }
const flatten = (lv, parts) =>
  parts.flatMap(P => P.items.map((item, i) => ({ id: `h${lv}-p${P.key}-${i}`, part: P.key, item })));

// soal per item: bagian 1 = satu soal benar/salah; bagian 2/3 = pilihan ganda, urutan opsi diacak
function makeQs(e) {
  if (e.part === 1) return [{ judge: true, ans: e.item.ans }];
  return e.item.qs.map(q => {
    const order = shuffled(q.opts.map((_, i) => i));
    return { ...q, order, ansPos: order.indexOf(q.ans) };
  });
}

// yang dibacakan: bagian 1 = narasi saja (pernyataan ★ tercetak); bagian 2/3 = dialog lalu "问：…" tiap pertanyaan
const audioLines = e => itemLines(e.part, e.item);

const makeDeck = (all, part, res) => {
  const pool = all.filter(e => part === "all" || e.part === +part);
  return [...shuffled(pool.filter(e => res[e.id] !== 1)), ...shuffled(pool.filter(e => res[e.id] === 1))];
};

export default function ListeningView({ defaultLevel = 4 }) {
  const { t, lang } = useLang();
  const hasVoice = useHasVoice() || ttsReady;
  const [level, setLevel] = useState(() => +getItem("hsk-listen-level") || defaultLevel);
  const [parts, setParts] = useState(null); // bank soal level aktif (null = sedang dimuat)
  const [part, setPart] = useState(() => getItem("hsk-listen-part") || "all");
  const [res, setRes] = useState(load);
  // hasil dari perangkat lain (login) → muat ulang
  useEffect(() => { const on = () => setRes(load()); window.addEventListener(SYNC_EVENT, on); return () => window.removeEventListener(SYNC_EVENT, on); }, []);
  const [deck, setDeck] = useState([]);
  const all = useMemo(() => (parts ? flatten(level, parts) : []), [parts, level]);
  const [pos, setPos] = useState(0);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState([]);       // jawaban per pertanyaan (indeks posisi / true|false)
  const [slow, setSlow] = useState(() => getItem("hsk-listen-slow") === "1");
  const [showQ, setShowQ] = useState(false); // tampilkan teks pertanyaan sebelum menjawab
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [score, setScore] = useState({ ok: 0, n: 0 });

  useEffect(() => {
    const s = JSON.stringify(res);
    if (s !== (getItem(KEY) || "{}")) logActivity(); // jawaban baru → aktivitas hari ini
    setItem(KEY, s);
  }, [res]);
  useEffect(() => { setItem("hsk-listen-part", part); }, [part]);
  useEffect(() => { setItem("hsk-listen-level", String(level)); }, [level]);
  // muat bank soal setiap ganti level
  useEffect(() => {
    let alive = true;
    setParts(null);
    stopSpeaking();
    loadListening(level).then(p => {
      if (!alive) return;
      setParts(p);
      setDeck(makeDeck(flatten(level, p), part, res));
      setPos(0);
    });
    return () => { alive = false; };
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setItem("hsk-listen-slow", slow ? "1" : "0"); }, [slow]);
  useEffect(() => stopSpeaking, []);

  const e = deck[pos % deck.length];
  const done = qs.length > 0 && ans.length === qs.length && ans.every(a => a !== undefined);

  const play = () => {
    if (!e) return;
    setPlaying(true);
    setPlays(p => p + 1);
    speakLines(audioLines(e), { rate: slow ? 0.7 : 0.9, onEnd: () => setPlaying(false) });
  };

  useEffect(() => {
    if (!e) return;
    setQs(makeQs(e));
    setAns([]);
    setPlays(0);
    stopSpeaking();
    setPlaying(false);
  }, [e, pos]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (qi, v) => {
    if (ans[qi] !== undefined) return;
    const next = [...ans];
    next[qi] = v;
    setAns(next);
    const finished = qs.every((_, i) => next[i] !== undefined);
    if (finished) {
      stopSpeaking();
      setPlaying(false);
      const right = qs.filter((q, i) => (q.judge ? next[i] === q.ans : next[i] === q.ansPos)).length;
      setScore(s => ({ ok: s.ok + right, n: s.n + qs.length }));
      setRes(r => ({ ...r, [e.id]: right === qs.length ? 1 : 0 }));
    }
  };

  const changePart = v => { setPart(v); setDeck(makeDeck(all, v, res)); setPos(0); };
  const next = () => {
    if (pos + 1 >= deck.length) { setDeck(makeDeck(all, part, res)); setPos(0); }
    else setPos(p => p + 1);
  };

  // keyboard: Spasi/R putar, 1–4 jawab pertanyaan yang belum dijawab (bagian 1: 1 = benar, 2 = salah), Enter lanjut
  const handlers = useRef();
  handlers.current = { play, choose, qs, ans, done, next };
  useEffect(() => {
    const onKey = ev => {
      if (["SELECT", "INPUT", "TEXTAREA"].includes(ev.target.tagName)) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.target.tagName === "BUTTON" && (ev.key === "Enter" || ev.key === " ")) return;
      const h = handlers.current;
      if (ev.key === " " || ev.key.toLowerCase() === "r") { ev.preventDefault(); h.play(); }
      else if (ev.key === "Enter" && h.done) { ev.preventDefault(); h.next(); }
      else if (/^[1-4]$/.test(ev.key) && !h.done) {
        const qi = h.qs.findIndex((_, i) => h.ans[i] === undefined);
        const q = h.qs[qi];
        if (!q) return;
        const k = +ev.key - 1;
        if (q.judge) { if (k < 2) h.choose(qi, k === 0); }
        else h.choose(qi, k);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const mastered = useMemo(() => all.filter(x => res[x.id] === 1).length, [all, res]);

  const levelSelect = (
    <select className="chip" value={level} onChange={ev => setLevel(+ev.target.value)} aria-label="HSK">
      {LEVELS.map(l => <option key={l} value={l}>HSK {l}</option>)}
    </select>
  );
  if (!parts || !e) return <div className="toolbar">{levelSelect}<span className="mono lis-loading">{t.loading}</span></div>;
  const tr = x => (lang === "en" ? x[1] : x[0]);
  const it = e.item;

  return (
    <>
      <div className="toolbar">
        {levelSelect}
        <select className="chip" value={part} onChange={ev => changePart(ev.target.value)}>
          <option value="all">{t.lis.allParts(all.length)}</option>
          {parts.map(P => <option key={P.key} value={P.key}>{t.lis.parts[P.key - 1]} ({P.items.length})</option>)}
        </select>
        <button className={"chip" + (slow ? " on" : "")} onClick={() => setSlow(s => !s)}>🐢 {t.lis.slow}</button>
        <button className={"chip" + (showQ ? " on" : "")} onClick={() => setShowQ(s => !s)}>{t.lis.showQ}</button>
      </div>

      <section>
        <div className="progress">
          <span>{(pos % deck.length) + 1} / {deck.length}</span>
          <div className="bar"><i style={{ width: (mastered / all.length) * 100 + "%" }} /></div>
          <span>{t.lis.mastered(mastered, all.length)}</span>
        </div>

        {!hasVoice && <div className="lis-warn">{t.noVoice}</div>}

        <div className="ord-card lis-card">
          <div className="ord-head">
            <span className="mono">HSK {level} · {t.lis.parts[e.part - 1]}</span>
            {score.n > 0 && <span className="mono">{t.lis.session(score.ok, score.n)}</span>}
          </div>
          <div className="ord-task">{t.lis.task[e.part - 1]}</div>

          <div className="lis-player">
            <button className={"listen-play" + (playing ? " on" : "")} onClick={play} disabled={!hasVoice} aria-label={t.lis.play}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            </button>
            <div className="listen-note">{playing ? t.lis.playing : plays ? t.lis.played(plays) : t.lis.press}</div>
          </div>

          {/* bagian 1: pernyataan ★ tercetak di lembar soal */}
          {e.part === 1 && (
            <div className="lis-q">
              <div className="lis-stmt">★ {it.stmt}</div>
              <div className="lis-opts judge">
                {[true, false].map((v, k) => {
                  let cls = "opt";
                  if (done && v === it.ans) cls += " right";
                  else if (done && ans[0] === v) cls += " wrong";
                  return (
                    <button key={k} className={cls} onClick={() => choose(0, v)} disabled={done}>
                      <small className="opt-n">{k + 1}</small>{v ? "✓ 对" : "✗ 错"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* bagian 2/3: opsi tercetak, pertanyaan dibacakan */}
          {e.part > 1 && qs.map((q, qi) => (
            <div className="lis-q" key={qi}>
              <div className="lis-qhead">
                {qs.length > 1 && <b>{qi + 1}.</b>} {(showQ || done) ? q.q : <span className="muted">{t.lis.qHidden}</span>}
                {done && <span className="lis-qt"> — {tr(q.qt)}</span>}
              </div>
              <div className={"lis-opts" + (q.opts.length === 3 ? " n3" : "")}>
                {q.order.map((oi, k) => {
                  let cls = "opt hz2 lis-opt";
                  if (ans[qi] !== undefined && k === q.ansPos) cls += " right";
                  else if (ans[qi] === k) cls += " wrong";
                  return (
                    <button key={k} className={cls} onClick={() => choose(qi, k)} disabled={ans[qi] !== undefined}>
                      <small className="opt-n">{LETTERS[k]}</small>{q.opts[oi]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {done && (
            <div className="ord-result">
              <div className="ord-verdict">
                {qs.every((q, i) => (q.judge ? ans[i] === q.ans : ans[i] === q.ansPos)) ? t.lis.right : t.lis.wrong}
              </div>
              <div className="lis-script">
                <div className="mono lis-label">{t.lis.script}</div>
                {e.part === 1 ? <p>{it.text}</p> : it.lines.map(([who, text], i) => (
                  <p key={i}>{who && <b className="lis-who">{who}：</b>}{text}</p>
                ))}
                <div className="lis-tr">{e.part === 1 ? tr(it.tr) : tr(it.tr)}</div>
                {e.part === 1 && <div className="lis-tr">★ {tr(it.st)}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="controls ord-controls lis-controls">
          {done ? (
            <button className="btn solid" onClick={next}>{t.next}</button>
          ) : (
            <>
              <button className="btn" onClick={play} disabled={!hasVoice}>{t.lis.replay}</button>
              <button className="btn" onClick={next}>{t.ord.skip}</button>
            </>
          )}
        </div>
        <div className="keys">
          <kbd>{t.space}</kbd>/<kbd>R</kbd> {t.lis.play} · <kbd>1</kbd>–<kbd>4</kbd> {t.keyAnswer} · <kbd>Enter</kbd> {t.keyNext}
          <div className="hint" style={{ marginTop: 6, fontSize: 11 }}>{t.lis.note}</div>
        </div>
      </section>
    </>
  );
}
