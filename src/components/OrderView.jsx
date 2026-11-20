// Tab "Susun": latihan HSK 4 书写 bagian 1 (完成句子) — susun potongan kata menjadi kalimat.
import { useEffect, useMemo, useRef, useState } from "react";
import { ORDER, ORDER_ITEMS } from "../data/order.js";
import { useLang } from "../lib/i18n.jsx";
import { speak, stopSpeaking, SpeakButton } from "../lib/speech.jsx";
import { getItem, setItem } from "../lib/storage.js";
import { logActivity } from "../lib/stats.js";
import { SYNC_EVENT } from "../lib/cloud.js";
import { scramble, shuffled } from "../lib/order.js";

const KEY = "hsk-order"; // { itemId: 1 (benar) | 0 (salah terakhir kali) }
const load = () => { try { return JSON.parse(getItem(KEY) || "{}") || {}; } catch { return {}; } };

// urutan soal: yang belum pernah / terakhir salah duluan, lalu sisanya; masing-masing diacak
const makeDeck = (topic, res) => {
  const pool = ORDER_ITEMS.filter(x => topic === "all" || x.topic === topic);
  return [...shuffled(pool.filter(x => res[x.id] !== 1)), ...shuffled(pool.filter(x => res[x.id] === 1))];
};

export default function OrderView() {
  const { t, lang } = useLang();
  const [topic, setTopic] = useState(() => getItem("hsk-order-topic") || "all");
  const [res, setRes] = useState(load);
  // hasil dari perangkat lain (login) → muat ulang
  useEffect(() => { const on = () => setRes(load()); window.addEventListener(SYNC_EVENT, on); return () => window.removeEventListener(SYNC_EVENT, on); }, []);
  const [deck, setDeck] = useState(() => makeDeck(topic, res));
  const [pos, setPos] = useState(0);
  const [bank, setBank] = useState([]);
  const [picked, setPicked] = useState([]);
  const [state, setState] = useState("play"); // play | right | wrong
  const [hint, setHint] = useState(() => getItem("hsk-order-hint") === "1");
  const [score, setScore] = useState({ ok: 0, n: 0 });

  useEffect(() => {
    const s = JSON.stringify(res);
    if (s !== (getItem(KEY) || "{}")) logActivity(); // jawaban baru → aktivitas hari ini
    setItem(KEY, s);
  }, [res]);
  useEffect(() => { setItem("hsk-order-topic", topic); }, [topic]);
  useEffect(() => { setItem("hsk-order-hint", hint ? "1" : "0"); }, [hint]);
  useEffect(() => stopSpeaking, []);

  const item = deck[pos % deck.length];
  useEffect(() => {
    if (!item) return;
    setBank(scramble(item.pieces));
    setPicked([]);
    setState("play");
  }, [item, pos]);

  const changeTopic = v => { setTopic(v); setDeck(makeDeck(v, res)); setPos(0); };

  const pick = p => { if (state === "play") setPicked(x => [...x, p]); };
  const unpick = p => { if (state === "play") setPicked(x => x.filter(y => y.id !== p.id)); };
  const used = new Set(picked.map(p => p.id));
  const left = bank.filter(p => !used.has(p.id));
  const full = item && picked.length === item.pieces.length;

  const record = ok => {
    setRes(r => ({ ...r, [item.id]: ok ? 1 : 0 }));
    setScore(s => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
  };
  const check = () => {
    if (!full || state !== "play") return;
    const ok = picked.map(p => p.text).join("") + item.end === item.answer; // potongan kembar dianggap sama
    setState(ok ? "right" : "wrong");
    record(ok);
    speak(item.answer, 0.8);
  };
  // jawaban lain yang juga tata bahasanya benar → boleh dihitung benar
  const acceptMine = () => {
    setState("right");
    setRes(r => ({ ...r, [item.id]: 1 }));
    setScore(s => ({ ...s, ok: s.ok + 1 }));
  };
  const next = () => {
    if (pos + 1 >= deck.length) { setDeck(makeDeck(topic, res)); setPos(0); }
    else setPos(p => p + 1);
  };

  const handlers = useRef();
  handlers.current = { left, pick, picked, unpick, check, next, state, full, clear: () => state === "play" && setPicked([]) };
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
      // Enter/Spasi pada tombol yang sedang fokus sudah memicu klik tombol itu sendiri — jangan ikut cek/lanjut
      if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const h = handlers.current;
      if (/^[1-9]$/.test(e.key) && h.state === "play") { const p = h.left[+e.key - 1]; if (p) h.pick(p); }
      else if (e.key === "Backspace" && h.state === "play") { e.preventDefault(); const p = h.picked[h.picked.length - 1]; if (p) h.unpick(p); }
      else if (e.key === "Enter") { e.preventDefault(); if (h.state === "play") h.check(); else h.next(); }
      else if (e.key === "Escape") h.clear();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const mastered = useMemo(() => ORDER_ITEMS.filter(x => res[x.id] === 1).length, [res]);
  const topicLabel = k => (lang === "en" ? ORDER[k][2] : ORDER[k][1]);

  if (!item) return null;
  return (
    <>
      <div className="toolbar">
        <select className="chip" value={topic} onChange={e => changeTopic(e.target.value)}>
          <option value="all">{t.ord.allTopics(ORDER_ITEMS.length)}</option>
          {Object.keys(ORDER).map(k => (
            <option key={k} value={k}>{ORDER[k][0]} · {topicLabel(k)} ({ORDER[k][3].length})</option>
          ))}
        </select>
        <button className={"chip" + (hint ? " on" : "")} onClick={() => setHint(h => !h)}>{t.ord.hint}</button>
      </div>

      <section>
        <div className="progress">
          <span>{(pos % deck.length) + 1} / {deck.length}</span>
          <div className="bar"><i style={{ width: (mastered / ORDER_ITEMS.length) * 100 + "%" }} /></div>
          <span>{t.ord.mastered(mastered, ORDER_ITEMS.length)}</span>
        </div>

        <div className={"ord-card " + state}>
          <div className="ord-head">
            <span className="mono">{ORDER[item.topic][0]} · {topicLabel(item.topic)}</span>
            {score.n > 0 && <span className="mono">{t.ord.session(score.ok, score.n)}</span>}
          </div>
          <div className="ord-task">{t.ord.task}</div>
          {/* petunjuk arti saat menjawab (setelah dijawab, arti tampil di bagian hasil) */}
          {hint && state === "play" && (
            <div className="ord-hint">{lang === "en" ? item.enT : item.idT}</div>
          )}

          {/* jawaban yang sedang disusun */}
          <div className="ord-answer" aria-label={t.ord.yourAnswer}>
            {picked.length === 0 && <span className="ord-ph">{t.ord.placeholder}</span>}
            {picked.map(p => (
              <button key={p.id} className="ord-piece in" onClick={() => unpick(p)} disabled={state !== "play"}>{p.text}</button>
            ))}
            {full && <span className="ord-end">{item.end}</span>}
          </div>

          {/* potongan yang belum dipakai */}
          <div className="ord-bank">
            {left.map((p, i) => (
              <button key={p.id} className="ord-piece" onClick={() => pick(p)}>
                <small>{i + 1}</small>{p.text}
              </button>
            ))}
          </div>

          {state !== "play" && (
            <div className="ord-result">
              <div className="ord-verdict">{state === "right" ? t.ord.right : t.ord.wrong}</div>
              <div className="ord-correct">
                {item.answer} <SpeakButton text={item.answer} rate={0.8} label={t.listenEx} className="inline" />
              </div>
              {/* arti selalu tampil setelah menjawab: bahasa aktif di atas, bahasa lain kecil di bawah */}
              <div className="ord-meaning">{lang === "en" ? item.enT : item.idT}</div>
              <div className="ord-meaning other">{lang === "en" ? item.idT : item.enT}</div>
              {state === "wrong" && (
                <div className="ord-alt">
                  {t.ord.altNote}{" "}
                  <button className="linkish" onClick={acceptMine}>{t.ord.acceptMine}</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="controls ord-controls">
          {state === "play" ? (
            <>
              <button className="btn" onClick={() => setPicked([])} disabled={!picked.length}>{t.ord.clear}</button>
              <button className="btn" onClick={next}>{t.ord.skip}</button>
              <button className="btn ok" onClick={check} disabled={!full}>{t.ord.check}</button>
            </>
          ) : (
            <button className="btn solid" onClick={next}>{t.next}</button>
          )}
        </div>
        <div className="keys">
          <kbd>1</kbd>–<kbd>6</kbd> {t.ord.keyPick} · <kbd>⌫</kbd> {t.ord.keyUndo} · <kbd>Enter</kbd> {t.ord.keyCheck}
        </div>
      </section>
    </>
  );
}
