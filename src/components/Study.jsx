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
import ReviewView from "./ReviewView.jsx";
import OrderView from "./OrderView.jsx";
import ListeningView from "./ListeningView.jsx";
import { loadSrs, saveSrs, today, isDue } from "../lib/srs.js";
import { logActivity, markLearned } from "../lib/stats.js";
import { changedKeys, stamp } from "../lib/stamps.js";
import StatsBar from "./StatsBar.jsx";
import AccountButton from "./AccountButton.jsx";
import { SYNC_EVENT } from "../lib/cloud.js";

const lessonsIn = set => LESSONS.filter(L => L.set === set);

function initialSet() {
  let s = getItem(KEYS.set);
  if (s === "3" || s === "2") s = "4-" + s;
  return s && LESSONS.some(L => L.set === s) ? s : "4-3";
}

const levelOf = L => +L.set.split("-")[0];
const verOf = set => set.split("-")[1];
/** Semua lesson satu versi, urut HSK 1 → 4. */
const lessonsOfVer = ver =>
  LESSONS.filter(L => verOf(L.set) === ver).sort((a, b) => levelOf(a) - levelOf(b) || a.id - b.id);

/** Lesson terpilih (array id, boleh lintas HSK dalam satu versi). Format lama: "0" = semua lesson. */
function initialSel(set) {
  const ids = lessonsIn(set).map(L => L.id);
  // lintas HSK hanya kalau mode "Gabung" aktif
  const verIds = getItem(KEYS.combine) === "1" ? lessonsOfVer(verOf(set)).map(L => L.id) : ids;
  const raw = getItem(KEYS.lesson) || "";
  if (raw === "0") return ids;
  const picked = raw.split(",").map(Number).filter(id => verIds.includes(id));
  return picked.length ? picked : [ids.includes(3) ? 3 : ids[0]];
}

const VIEWS = ["cards", "review", "quiz", "listen", "order", "list"];

/** Tab dengan blok merah yang meluncur ke tab aktif. */
function Tabs({ view, setView, due }) {
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
  }, [view, lang, due > 0]);
  return (
    <div className="tabs" role="tablist" ref={wrap}>
      <span className="pill" style={pill} />
      {VIEWS.map(v => (
        <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
          {t.views[v]}
          {v === "review" && due > 0 && <span className="tab-badge">{due}</span>}
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
  const [sel, setSel] = useState(() => initialSel(curSet));
  const [combine, setCombine] = useState(() => getItem(KEYS.combine) === "1");
  const [prog, setProg] = useState(loadProgress);
  const [srs, setSrs] = useState(loadSrs);
  const [hzFont, setHzFont] = useState(() => (getItem("hsk-hz-font") === "system" ? "system" : "serif"));

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(gsap.utils.toArray(".topbar, .study-head > *, .study-layout > *", root.current), {
      y: 20, opacity: 0, filter: "blur(8px)", duration: 0.6, ease: "power1.out", stagger: 0.07, clearProps: "filter",
    });
  }, { scope: root });

  const [lv, ver] = curSet.split("-");
  const setLessons = useMemo(() => lessonsIn(curSet), [curSet]);
  // pilihan bisa lintas HSK (versi sama); urut HSK 1 → 4 lalu nomor lesson, bukan urutan klik
  const picked = useMemo(() => lessonsOfVer(ver).filter(L => sel.includes(L.id)), [ver, sel]);
  const words = useMemo(() => picked.flatMap(L => L.words), [picked]);
  // ruang pencarian daftar kata: semua lesson HSK 1–4 di versi aktif
  const verLessons = useMemo(() => lessonsOfVer(ver), [ver]);
  const pickedLevels = [...new Set(picked.map(levelOf))];
  const crossLevel = pickedLevels.length > 1;
  // "Semua" = semua lesson HSK yang sedang dibuka sudah dipilih
  const allCur = setLessons.every(L => sel.includes(L.id));
  const all = allCur && picked.length === setLessons.length;
  const single = picked.length === 1 ? picked[0] : null;

  useEffect(() => { setItem(KEYS.set, curSet); }, [curSet]);
  useEffect(() => { setItem(KEYS.lesson, all && setLessons.length > 1 ? "0" : sel.join(",")); }, [sel, all, setLessons]);
  useEffect(() => { setItem(KEYS.combine, combine ? "1" : "0"); }, [combine]);
  useEffect(() => { saveProgress(prog); }, [prog]);
  useEffect(() => { saveSrs(srs); }, [srs]);

  // Statistik: setiap perubahan progres/SRS = aktivitas hari ini; kata yang baru jadi "hafal" dicatat tanggalnya
  const prevProg = useRef(prog), prevSrs = useRef(srs);
  useEffect(() => {
    const old = prevProg.current;
    prevProg.current = prog;
    if (old === prog) return;
    stamp("p", changedKeys(old, prog));
    markLearned(Object.keys(prog).filter(k => prog[k] === "k" && old[k] !== "k"));
    logActivity();
  }, [prog]);
  // data dari perangkat lain digabung (login) → muat ulang tanpa dihitung sebagai aktivitas hari ini
  useEffect(() => {
    const on = () => {
      const p = loadProgress(), s = loadSrs();
      prevProg.current = p; prevSrs.current = s;
      setProg(p); setSrs(s);
    };
    window.addEventListener(SYNC_EVENT, on);
    return () => window.removeEventListener(SYNC_EVENT, on);
  }, []);
  useEffect(() => {
    const old = prevSrs.current;
    prevSrs.current = srs;
    if (old === srs) return;
    stamp("s", changedKeys(old, srs));
    logActivity();
  }, [srs]);
  useEffect(() => { setItem("hsk-hz-font", hzFont); }, [hzFont]);

  // fn menerima salinan progres, mengubahnya, lalu mengembalikannya
  const updateProg = useCallback(fn => setProg(p => fn({ ...p })), []);
  const updateSrs = useCallback(fn => setSrs(s => fn({ ...s })), []);
  const day = today();
  const due = useMemo(() => Object.values(srs).filter(c => isDue(c, day)).length, [srs, day]);

  // Ganti versi => pilihan diganti ke lesson pertama.
  // Ganti HSK => tanpa "Gabung" pilihan langsung diganti; dengan "Gabung" pilihan dari HSK lain tetap disimpan.
  const chooseSet = set => {
    if (set === curSet) return;
    setCurSet(set);
    if (!combine || verOf(set) !== ver) setSel([lessonsIn(set)[0].id]);
  };

  const pickLesson = id => {
    if (!combine) return setSel([id]);
    setSel(s => (s.includes(id) ? (s.length > 1 ? s.filter(x => x !== id) : s) : [...s, id]));
  };
  const pickAll = () => {
    const ids = setLessons.map(L => L.id);
    if (!combine) return setSel(ids);
    // mode gabung: "Semua" menambah / melepas seluruh lesson HSK ini, pilihan HSK lain tidak disentuh
    setSel(s => {
      if (!allCur) return [...new Set([...s, ...ids])];
      const rest = s.filter(id => !ids.includes(id));
      return rest.length ? rest : [ids[0]];
    });
  };
  const toggleCombine = () => {
    // matikan gabung: sisakan lesson dari HSK yang sedang dibuka (satu saja, kecuali "Semua")
    if (combine) {
      const cur = picked.filter(L => L.set === curSet);
      if (allCur) setSel(setLessons.map(L => L.id));
      else setSel([(cur[0] || setLessons[0]).id]);
    }
    setCombine(c => !c);
  };

  const deckKey = ver + ":" + picked.map(L => L.id).join(","); // ganti pilihan => kartu & kuis di-reset
  const multi = crossLevel ? "level" : picked.length > 1;
  const short = L => (L.name === "Angka" ? t.numbers : L.short || L.name.replace("Lesson ", "L"));
  const titleLv = pickedLevels.length ? pickedLevels.join(" + ") : lv;
  const title = crossLevel ? t.lessonCount(picked.length)
    : all && picked.length > 1 ? t.allLessons
    : single ? lessonName(single, t)
    : picked.length <= 4 ? picked.map(short).join(" + ") : t.lessonCount(picked.length);

  // Menyimak & Susun punya pilihan sendiri (level/bagian, pola) dan tidak memakai versi/level/lesson di samping
  const solo = view === "listen" || view === "order";

  return (
    <section className={"study hz-" + hzFont} ref={root}>
      <header className="topbar">
        <a href="#/" className="mini-mark">HSKLOCKIN</a>
        <div className="topbar-right">
          <div className="toggles"><LangSwitch /><ThemeSwitch /></div>
          <a href="#/" className="back-link">{t.home}</a>
          <AccountButton />
        </div>
      </header>
      <div className="container">
        <div className="study-head">
          <div>
            {solo ? (
              <>
                <h2 className="study-title">{t.soloTitle[view]}</h2>
                <div className="study-sub">{t.soloSub[view]}</div>
              </>
            ) : (
              <>
                <h2 className="study-title">
                  HSK {titleLv} <em>{VERS[ver]}</em> · {title}
                </h2>
                <div className="study-sub">
                  {single ? t.wordsSub(words.length, label(single.sub)) : t.wordsAll(words.length, picked.length)}
                </div>
              </>
            )}
          </div>
          <Tabs view={view} setView={setView} due={due} />
        </div>

        <StatsBar prog={prog} />

        <div className={"study-layout" + (solo ? " solo" : "")}>
          {!solo && <aside>
            <LessonBar
              curSet={curSet} lessons={setLessons} sel={sel} all={all} allCur={allCur} combine={combine}
              picked={picked}
              onSet={chooseSet} onLesson={pickLesson} onAll={pickAll} onCombine={toggleCombine}
            />
          </aside>}
          <div>
            {view === "cards" && (
              <CardView
                key={deckKey} words={words} multi={multi} prog={prog} updateProg={updateProg}
                srs={srs} updateSrs={updateSrs}
                hzFont={hzFont} setHzFont={setHzFont}
              />
            )}
            {view === "review" && (
              <ReviewView pool={words} srs={srs} updateSrs={updateSrs} prog={prog} updateProg={updateProg} />
            )}
            {view === "order" && <OrderView />}
            {view === "listen" && <ListeningView defaultLevel={+lv} />}
            {view === "quiz" && <QuizView key={deckKey} words={words} updateProg={updateProg} />}
            {view === "list" && <ListView lessons={picked} pool={verLessons} ver={VERS[ver]} multi={multi} prog={prog} />}
          </div>
        </div>
      </div>
    </section>
  );
}
