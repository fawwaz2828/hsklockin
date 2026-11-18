import { Fragment } from "react";
import { useLang, meaning } from "../lib/i18n.jsx";
import { enLabel } from "../data/en.js";

export default function ListView({ lessons, multi, prog }) {
  const { t, lang } = useLang();
  const label = s => (lang === "en" ? enLabel(s) : s);
  // bahasa lain (kalau ada) ditampilkan kecil sebagai keterangan
  const other = w => (lang === "en" ? (w.en ? w.id : "") : w.en);
  return (
    <section>
      <div className="list">
        {lessons.map(L => (
          <Fragment key={L.id}>
            {multi && (
              <div className="group lesson">
                {multi === "level" && L.set.startsWith("4-") ? "HSK 4 · " : ""}
                {L.name === "Angka" ? t.numbers : L.name} · {label(L.sub)}
              </div>
            )}
            {L.groups.map((g, gi) => {
              const ws = L.words.filter(w => w.g === gi);
              if (!ws.length) return null;
              return (
                <Fragment key={gi}>
                  <div className="group">{label(g)}</div>
                  {ws.map(w => (
                    <div key={w.k} className={"row " + (prog[w.k] || "")}>
                      <span className="n">{w.n}</span>
                      <div>
                        <div className="h">{w.h}</div>
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
                            {w.ex.zh}{" "}
                            <span style={{ color: "var(--muted)" }}>— {lang === "en" ? w.ex.en || w.ex.id : w.ex.id}</span>
                          </span>
                        )}
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
