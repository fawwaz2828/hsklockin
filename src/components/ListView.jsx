import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { useLang, meaning } from "../lib/i18n.jsx";
import { enLabel } from "../data/en.js";
import { SpeakButton } from "../lib/speech.jsx";
import { MoreExamples } from "../lib/examples.jsx";

const SEP = /[\s'’·\-]/g;
// Pinyin tanpa nada & spasi: "nǐ hǎo" → "nihao", "lǜ" → "lv"
const plain = s =>
  (s || "").toLowerCase().normalize("NFD").replace(/u\u0308/g, "v")
    .replace(/[\u0300-\u036f]/g, "").replace(/u:/g, "v").replace(SEP, "");
// Pinyin dengan nada, tanpa spasi: "Nǐ hǎo" → "nǐhǎo"
const toned = s => (s || "").toLowerCase().normalize("NFC").replace(SEP, "");

// Angka nada → tanda nada: "shi4" → "shì", "ni3hao3" → "nǐhǎo", "lv4" → "lǜ" (0/5 = nada netral)
const TONE = ["", "\u0304", "\u0301", "\u030c", "\u0300"];
const numToMark = q =>
  q.replace(/u:|v/g, "ü").replace(/([a-zü]+)([0-5])/g, (_, syl, d) => {
    if (d === "0" || d === "5") return syl;
    // letak tanda nada: a/e dulu, lalu "ou", selain itu vokal terakhir
    let i = syl.search(/[ae]/);
    if (i < 0) i = syl.indexOf("ou");
    if (i < 0) i = Math.max(...[..."iouü"].map(v => syl.lastIndexOf(v)));
    return i < 0 ? syl : (syl.slice(0, i + 1) + TONE[d] + syl.slice(i + 1)).normalize("NFC");
  });

/** Pencocok pinyin: kalau query memakai nada (angka atau tanda), nadanya ikut dicocokkan. */
function pinyinMatcher(q) {
  if (/[0-5]|[\u0300\u0301\u0304\u030c]/.test(q.normalize("NFD"))) {
    const tq = toned(numToMark(q.replace(SEP, "")));
    return p => toned(p).includes(tq);
  }
  const pq = plain(q);
  return pq ? p => plain(p).includes(pq) : () => false;
}

function matches(w, q, py) {
  if (w.h.includes(q) || py(w.p)) return true;
  return [w.id, w.en].some(m => m && m.toLowerCase().includes(q));
}

/**
 * lessons = lesson yang dipilih (tampilan biasa).
 * pool    = semua lesson di versi aktif (HSK 1–4) — dipakai saat mencari.
 */
export default function ListView({ lessons, pool = lessons, ver, multi: multiSel, prog }) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query.trim().toLowerCase());
  const label = s => (lang === "en" ? enLabel(s) : s);
  // bahasa lain (kalau ada) ditampilkan kecil sebagai keterangan
  const other = w => (lang === "en" ? (w.en ? w.id : "") : w.en);

  // Saat mencari: telusuri semua lesson versi ini; lesson tanpa hasil disembunyikan
  const shown = useMemo(() => {
    if (!dq) return lessons;
    const py = pinyinMatcher(dq);
    return pool
      .map(L => ({ ...L, words: L.words.filter(w => matches(w, dq, py)) }))
      .filter(L => L.words.length);
  }, [lessons, pool, dq]);
  const count = dq ? shown.reduce((n, L) => n + L.words.length, 0) : null;
  // hasil pencarian bisa lintas HSK → selalu tampilkan judul lesson + level
  const multi = dq ? "level" : multiSel;

  return (
    <section>
      <div className="list-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.searchPh(ver)}
          aria-label={t.searchPh(ver)}
        />
        {count !== null && <span className="mono">{t.searchCount(count)}</span>}
      </div>
      {count === 0 && <p className="list-empty">{t.searchNone(query.trim())}</p>}
      <div className="list">
        {shown.map(L => (
          <Fragment key={L.id}>
            {multi && (
              <div className="group lesson">
                {multi === "level" ? `HSK ${L.set.split("-")[0]} · ` : ""}
                {L.name === "Angka" ? t.numbers : L.name}
                {/* sub HSK 1–3 cuma mengulang "HSK x (versi) · Lesson y" — tidak perlu ditampilkan */}
                {/^HSK /.test(L.sub) ? "" : " · " + label(L.sub)}
              </div>
            )}
            {L.groups.map((g, gi) => {
              const ws = L.words.filter(w => w.g === gi);
              if (!ws.length) return null;
              const dupe = multi && /^HSK /.test(g); // label grup sama dengan judul lesson
              return (
                <Fragment key={gi}>
                  {!dupe && <div className="group">{label(g)}</div>}
                  {ws.map(w => (
                    <div key={w.k} className={"row " + (prog[w.k] || "")}>
                      <span className="n">{w.n}</span>
                      <div>
                        <div className="h">{w.h} <SpeakButton text={w.h} label={t.listen} className="inline" /></div>
                        <div className="p">{w.p}</div>
                      </div>
                      <div className="m">
                        {meaning(w, lang)}
                        <small>
                          {w.t}
                          {other(w) ? " · " + other(w) : ""}
                          {w.note ? " · " + (lang === "en" ? w.noteEn || w.note : w.note) : ""}
                        </small>
                        {w.ex && (
                          <span className="exl">
                            {w.ex.zh} <SpeakButton text={w.ex.zh} rate={0.8} label={t.listenEx} className="inline" />{" "}
                            <span style={{ color: "var(--muted)" }}>— {lang === "en" ? w.ex.en || w.ex.id : w.ex.id}</span>
                          </span>
                        )}
                        <MoreExamples h={w.h} compact />
                      </div>
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
