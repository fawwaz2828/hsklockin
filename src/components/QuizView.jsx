import { useState } from "react";
import { useLang, meaning } from "../lib/i18n.jsx";

const TYPES = ["hz2id", "id2hz", "py2hz"];

function makeQuestion(words) {
  if (!words.length) return null;
  const word = words[Math.floor(Math.random() * words.length)];
  const others = words.filter(w => w.k !== word.k).sort(() => Math.random() - 0.5).slice(0, 3);
  return { word, opts: [word, ...others].sort(() => Math.random() - 0.5) };
}

export default function QuizView({ words, updateProg }) {
  const { t, lang } = useLang();
  const [type, setType] = useState("hz2id");
  const [q, setQ] = useState(() => makeQuestion(words));
  const [picked, setPicked] = useState(null); // key opsi yang dipilih
  const [score, setScore] = useState({ right: 0, total: 0 });

  const next = () => { setQ(makeQuestion(words)); setPicked(null); };

  const chooseType = ty => {
    setType(ty);
    setScore({ right: 0, total: 0 });
    next();
  };

  const answer = o => {
    if (picked) return;
    setPicked(o.k);
    const ok = o.k === q.word.k;
    setScore(s => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (!ok) updateProg(p => { p[q.word.k] = "u"; return p; });
  };

  if (!q) return <div className="empty">{t.noWords}</div>;
  const w = q.word;
  const m = x => meaning(x, lang);

  return (
    <section>
      <div className="toolbar" style={{ marginTop: 0 }}>
        {TYPES.map(ty => (
          <button key={ty} className={"chip" + (type === ty ? " on" : "")} onClick={() => chooseType(ty)}>
            {t.quizTypes[ty]}
          </button>
        ))}
      </div>
      <div className="quiz">
        <div className="score">
          {t.correct(score.right, score.total)}
          {picked && (type !== "hz2id" ? ` · ${w.h} = ${w.p}, ${m(w)}` : ` · ${w.p}`)}
        </div>
        <div className={"q" + (type === "hz2id" ? "" : " small") + (type === "py2hz" ? " pinyin" : "")}>
          {type === "hz2id" ? w.h : type === "id2hz" ? m(w) : w.p}
        </div>
        <div className="opts">
          {q.opts.map(o => {
            let cls = "opt" + (type === "hz2id" ? "" : " hz2");
            if (picked && o.k === w.k) cls += " right";
            else if (picked === o.k) cls += " wrong";
            return (
              <button key={o.k} className={cls} onClick={() => answer(o)}>
                {type === "hz2id" ? m(o) : o.h}
              </button>
            );
          })}
        </div>
        <button className="btn solid" style={{ marginTop: 18, width: "100%" }} disabled={!picked} onClick={next}>
          {t.nextQ}
        </button>
      </div>
    </section>
  );
}
