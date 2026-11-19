// Contoh kalimat tambahan (5 per hanzi), dimuat terpisah per level HSK dari public/examples/hsk{n}.json
// supaya bundle utama tetap kecil. Format: { "<hanzi>": [[zh, pinyin, id, en], ...] }
import { useEffect, useState } from "react";
import { LESSONS } from "../data/lessons.js";
import { useLang } from "./i18n.jsx";
import { SpeakButton } from "./speech.jsx";

// Contoh kalimat disimpan di level terendah tempat hanzi itu muncul (sama untuk 2.0 & 3.0)
const LEVEL = new Map();
for (const L of LESSONS) {
  const lv = +L.set[0];
  for (const w of L.words) if (!LEVEL.has(w.h) || lv < LEVEL.get(w.h)) LEVEL.set(w.h, lv);
}

const cache = new Map(); // level -> Promise<object>
function loadLevel(lv) {
  if (!cache.has(lv)) {
    const p = fetch(`${import.meta.env.BASE_URL}examples/hsk${lv}.json`)
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    p.then(d => { if (!Object.keys(d).length) cache.delete(lv); }); // gagal/kosong: boleh coba lagi nanti
    cache.set(lv, p);
  }
  return cache.get(lv);
}

/** Daftar contoh kalimat untuk satu hanzi; null selama masih dimuat. */
export function useExamples(h, enabled = true) {
  const [state, setState] = useState({ h: null, list: null });
  useEffect(() => {
    if (!enabled) return;
    const lv = LEVEL.get(h);
    if (!lv) return setState({ h, list: [] });
    let alive = true;
    loadLevel(lv).then(d => { if (alive) setState({ h, list: d[h] || [] }); });
    return () => { alive = false; };
  }, [h, enabled]);
  return state.h === h ? state.list : null;
}

/** Tombol "5 contoh kalimat" yang bisa dibuka-tutup. Klik di dalamnya tidak membalik kartu. */
export function MoreExamples({ h, compact = false }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const list = useExamples(h, open);
  return (
    <div className={"more-ex" + (compact ? " compact" : "")} onClick={e => e.stopPropagation()} data-lenis-prevent>
      <button type="button" className="more-ex-btn" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? "▾" : "▸"} {t.moreEx}
      </button>
      {open && (
        list === null ? <div className="more-ex-note">{t.loading}</div>
        : !list.length ? <div className="more-ex-note">{t.noMoreEx}</div>
        : (
          <ol className="more-ex-list">
            {list.map(([zh, py, id, en], i) => (
              <li key={i}>
                <div className="z">{zh} <SpeakButton text={zh} rate={0.8} label={t.listenEx} className="inline" /></div>
                {py && <div className="y">{py}</div>}
                <div className="t">{lang === "en" ? en || id : id}</div>
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}
