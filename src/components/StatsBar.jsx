// Strip statistik: streak harian, kata dihafal minggu ini, total, aktivitas 7 hari (Sen–Min).
import { useLang } from "../lib/i18n.jsx";
import { today } from "../lib/srs.js";
import { streak, useStats, weekStart } from "../lib/stats.js";

export default function StatsBar({ prog }) {
  const { t } = useLang();
  const s = useStats();
  const d = today();
  const ws = weekStart(d);
  const st = streak(s.days, d);
  const doneToday = !!s.days[d];
  const known = Object.keys(prog).filter(k => prog[k] === "k");
  const week = known.filter(k => s.learned[k] >= ws).length;
  const bars = Array.from({ length: 7 }, (_, i) => s.days[ws + i] || 0);
  const max = Math.max(1, ...bars);

  return (
    <div className="stats-bar">
      <div className={"stat streak" + (doneToday ? " on" : "")} title={doneToday ? t.stats.todayDone : st ? t.stats.keepIt : ""}>
        <span className="stat-big">🔥 {st}</span>
        <span className="stat-lbl">{t.stats.streak(st)}</span>
      </div>
      <div className="stat">
        <span className="stat-big">{week}</span>
        <span className="stat-lbl">{t.stats.week}</span>
      </div>
      <div className="stat">
        <span className="stat-big">{known.length}</span>
        <span className="stat-lbl">{t.stats.total}</span>
      </div>
      <div className="stat week-bars" aria-label={t.stats.activity}>
        <div className="bars">
          {bars.map((n, i) => (
            <i key={i} className={(ws + i === d ? "today " : "") + (n ? "has" : "")}
              style={{ height: n ? 6 + (n / max) * 22 + "px" : "3px" }} title={`${t.stats.dayNames[i]}: ${n}`} />
          ))}
        </div>
        <div className="bar-days">{t.stats.dayNames.map((x, i) => <span key={i}>{x[0]}</span>)}</div>
      </div>
      {!doneToday && st > 0 && <div className="stat-note">{t.stats.keepIt}</div>}
    </div>
  );
}
