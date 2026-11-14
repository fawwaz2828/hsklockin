import { VERS } from "../data/lessons.js";
import { useLang } from "../lib/i18n.jsx";

export default function LessonBar({ curSet, lessons, lesson, onSet, onLesson }) {
  const { t } = useLang();
  const [cl, cv] = curSet.split("-");
  const total = lessons.reduce((n, L) => n + L.words.length, 0);
  const short = L => (L.name === "Angka" ? t.numbers : L.short || L.name);
  return (
    <>
      <div className="panel">
        <h4 className="mono">{t.level}</h4>
        <div className="seg">
          {["1", "2", "3", "4"].map(k => (
            <button key={k} className={k === cl ? "on" : ""} onClick={() => onSet(`${k}-${cv}`)}>
              HSK {k}
            </button>
          ))}
        </div>
        <h4 className="mono">{t.version}</h4>
        <div className="seg two" style={{ marginBottom: 0 }}>
          {["3", "2"].map(v => (
            <button key={v} className={v === cv ? "on" : ""} onClick={() => onSet(`${cl}-${v}`)}>
              {VERS[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h4 className="mono">{t.lesson}</h4>
        <div className="lessons">
          {lessons.map(L => (
            <button key={L.id} className={"chip" + (lesson === L.id ? " on" : "")} onClick={() => onLesson(L.id)}>
              {short(L)} <span className="c">{L.words.length}</span>
            </button>
          ))}
          <button className={"chip" + (lesson === 0 ? " on" : "")} onClick={() => onLesson(0)}>
            {t.all} <span className="c">{total}</span>
          </button>
        </div>
      </div>
    </>
  );
}
