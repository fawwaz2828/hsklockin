import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LESSONS, VERS } from "../data/lessons.js";
import { KEYS, getItem, setItem, loadProgress, saveProgress } from "../lib/storage.js";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/motion.js";
import { useLang, LangSwitch } from "../lib/i18n.jsx";
import { ThemeSwitch } from "../lib/theme.jsx";
import { enLabel } from "../data/en.js";
import LessonBar from "./LessonBar.jsx";
import CardView from "./CardView.jsx";
import QuizView from "./QuizView.jsx";
import ListView from "./ListView.jsx";

const lessonsIn = set => LESSONS.filter(L => L.set === set);

function initialSet() {
  let s = getItem(KEYS.set);
  if (s === "3" || s === "2") s = "4-" + s;
  return s && LESSONS.some(L => L.set === s) ? s : "4-3";
}

function initialLesson(set) {
  const n = parseInt(getItem(KEYS.lesson));
  const l = isNaN(n) ? 3 : n;
  return l === 0 || lessonsIn(set).some(L => L.id === l) ? l : lessonsIn(set)[0].id;
}

const VIEWS = ["cards", "quiz", "list"];

/** Tab dengan blok merah yang meluncur ke tab aktif. */
function Tabs({ view, setView }) {
  const { t, lang } = useLang();
  const wrap = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const b = wrap.current?.querySelector("button.on");
      if (b) setPill({ left: b.offsetLeft, width: b.offsetWidth });
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, lang]);
  return (
    <div className="tabs" role="tablist" ref={wrap}>
      <span className="pill" style={pill} />
      {VIEWS.map(v => (
        <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
          {t.views[v]}
        </button>
      ))}
    </div>
  );
}

/** Nama lesson sesuai bahasa ("Angka" → "Numbers"). */
export const lessonName = (L, t) => (L.name === "Angka" ? t.numbers : L.name);

export default function Study({ view, setView }) {
  const root = useRef(null);
  const { t, lang } = useLang();
  const label = s => (lang === "en" ? enLabel(s) : s);
  const [curSet, setCurSet] = useState(initialSet);
  const [lesson, setLesson] = useState(() => initialLesson(curSet));
  const [prog, setProg] = useState(loadProgress);
  const [hzFont, setHzFont] = useState(() => (getItem("hsk-hz-font") === "system" ? "system" : "serif"));

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(gsap.utils.toArray(".topbar, .study-head > *, .study-layout > *", root.current), {
      y: 20, opacity: 0, filter: "blur(8px)", duration: 0.6, ease: "power1.out", stagger: 0.07, clearProps: "filter",
    });
  }, { scope: root });

  const setLessons = useMemo(() => lessonsIn(curSet), [curSet]);
  const current = lesson === 0 ? null : LESSONS.find(L => L.id === lesson);
  const words = useMemo(
    () => (current ? current.words : setLessons.flatMap(L => L.words)),
    [current, setLessons]
  );

  useEffect(() => { setItem(KEYS.set, curSet); }, [curSet]);
  useEffect(() => { setItem(KEYS.lesson, String(lesson)); }, [lesson]);
  useEffect(() => { saveProgress(prog); }, [prog]);
  useEffect(() => { setItem("hsk-hz-font", hzFont); }, [hzFont]);

  // fn menerima salinan progres, mengubahnya, lalu mengembalikannya
  const updateProg = useCallback(fn => setProg(p => fn({ ...p })), []);

  const chooseSet = set => {
    if (set === curSet) return;
    setCurSet(set);
    setLesson(lessonsIn(set)[0].id);
  };

  const [lv, ver] = curSet.split("-");
  const deckKey = curSet + ":" + lesson; // ganti lesson => state kartu & kuis di-reset

  return (
    <section className={"study hz-" + hzFont} ref={root}>
      <header className="topbar">
        <a href="#/" className="mini-mark">HSKLOCKIN</a>
        <div className="topbar-right">
          <div className="toggles"><LangSwitch /><ThemeSwitch /></div>
          <a href="#/" className="back-link">{t.home}</a>
        </div>
      </header>
      <div className="container">
        <div className="study-head">
          <div>
            <h2 className="study-title">
              HSK {lv} <em>{VERS[ver]}</em> · {current ? lessonName(current, t) : t.allLessons}
            </h2>
            <div className="study-sub">
              {current ? t.wordsSub(words.length, label(current.sub)) : t.wordsAll(words.length, setLessons.length)}
            </div>
          </div>
          <Tabs view={view} setView={setView} />
        </div>

        <div className="study-layout">
          <aside>
            <LessonBar curSet={curSet} lessons={setLessons} lesson={lesson} onSet={chooseSet} onLesson={setLesson} />
          </aside>
          <div>
            {view === "cards" && (
              <CardView
                key={deckKey} words={words} multi={lesson === 0} prog={prog} updateProg={updateProg}
                hzFont={hzFont} setHzFont={setHzFont}
              />
            )}
            {view === "quiz" && <QuizView key={deckKey} words={words} updateProg={updateProg} />}
            {view === "list" && (
              <ListView lessons={current ? [current] : setLessons} multi={lesson === 0} prog={prog} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
