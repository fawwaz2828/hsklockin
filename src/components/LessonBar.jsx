import { VERS } from "../data/lessons.js";
import { useLang } from "../lib/i18n.jsx";

export default function LessonBar({ curSet, lessons, sel, all, allCur, combine, picked, onSet, onLesson, onAll, onCombine }) {
  const { t } = useLang();
  const [cl, cv] = curSet.split("-");
  const total = lessons.reduce((n, L) => n + L.words.length, 0);
  const short = L => (L.name === "Angka" ? t.numbers : L.short || L.name);
  // "Semua" menyala sendiri; saat semua dipilih chip lesson tidak ikut menyala (kecuali mode gabung)
  const isOn = id => sel.includes(id) && (combine || !all || lessons.length === 1);
  // jumlah lesson terpilih per HSK (ditampilkan saat mode gabung)
  const countIn = k => picked.filter(L => L.set.startsWith(k + "-")).length;
  return (
    <>
      <div className="panel">
        <h4 className="mono">{t.version}</h4>
        <div className="seg two">
          {["3", "2"].map(v => (
            <button key={v} className={v === cv ? "on" : ""} onClick={() => onSet(`${cl}-${v}`)}>
              {VERS[v]}
            </button>
          ))}
        </div>
        <h4 className="mono">{t.level}</h4>
        <div className="seg" style={{ marginBottom: 0 }}>
          {["1", "2", "3", "4"].map(k => (
            <button key={k} className={k === cl ? "on" : ""} onClick={() => onSet(`${k}-${cv}`)}>
              HSK {k}
              {combine && countIn(k) > 0 && <span className="badge">{countIn(k)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="lesson-head">
          <h4 className="mono">{t.lesson}</h4>
          <button className={"combine" + (combine ? " on" : "")} role="switch" aria-checked={combine} onClick={onCombine}>
            <span className="box" aria-hidden="true">{combine ? "✓" : ""}</span>
            {t.combine}
          </button>
        </div>
        {combine && <div className="combine-hint">{t.combineHint(picked.length)}</div>}
        <div className="lessons">
          {lessons.map(L => (
            <button key={L.id} className={"chip" + (isOn(L.id) ? " on" : "")} aria-pressed={isOn(L.id)} onClick={() => onLesson(L.id)}>
              {short(L)} <span className="c">{L.words.length}</span>
            </button>
          ))}
          {lessons.length > 1 && (
            <button className={"chip" + ((combine ? allCur : all) ? " on" : "")} aria-pressed={combine ? allCur : all} onClick={onAll}>
              {t.all} <span className="c">{total}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
