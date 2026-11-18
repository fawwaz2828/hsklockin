import { useState } from "react";
import { useLang, meaning } from "../lib/i18n.jsx";

const TYPES = ["hz2id", "id2hz", "py2hz"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ambil soal berikutnya dari antrean acak: setiap kata keluar sekali per putaran,
// baru diacak ulang setelah semua kata sudah muncul.
// Fungsi murni (tidak mengubah argumen) supaya aman dipanggil ulang oleh StrictMode.
function makeQuestion(words, queue = [], lastKey = null) {
  if (!words.length) return { q: null, queue: [] };
  let rest = queue;
  if (!rest.length) {
    rest = shuffle(words);
    // jangan sampai kata terakhir putaran lalu langsung muncul lagi di awal putaran baru
    if (rest.length > 1 && rest[0].k === lastKey) rest = [...rest.slice(1), rest[0]];
  }
  const [word, ...remaining] = rest;
  // pengecoh: hanzi & arti harus beda dari jawaban dan satu sama lain
  const seen = new Set([word.h, word.id]);
  const others = shuffle(words.filter(w => w.k !== word.k))
    .filter(w => (seen.has(w.h) || seen.has(w.id) ? false : (seen.add(w.h), seen.add(w.id), true)))
    .slice(0, 3);
  return { q: { word, opts: shuffle([word, ...others]) }, queue: remaining };
}

export default function QuizView({ words, updateProg }) {
  const { t, lang } = useLang();
  const [type, setType] = useState("hz2id");
  const [state, setState] = useState(() => makeQuestion(words));
  const { q, queue } = state;
  const [picked, setPicked] = useState(null); // key opsi yang dipilih
  const [score, setScore] = useState({ right: 0, total: 0 });

  const next = () => {
    setState(s => makeQuestion(words, s.queue, s.q?.word.k));
    setPicked(null);
  };

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
          {` · ${words.length - queue.length} / ${words.length}`}
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
