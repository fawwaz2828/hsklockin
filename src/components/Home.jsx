import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "../lib/motion.js";
import { LESSONS, ALL } from "../data/lessons.js";
import { useLang, LangSwitch } from "../lib/i18n.jsx";
import { ThemeSwitch } from "../lib/theme.jsx";
import RollButton from "./RollButton.jsx";

const WORD = "HSKLOCKIN".split("");

function useBeijingClock() {
  const fmt = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Shanghai", hour12: false });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function Home() {
  const root = useRef(null);
  const time = useBeijingClock();
  const { t, lang } = useLang();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const total = ALL.length.toLocaleString(locale);

  // animasi masuk sekali saat halaman dibuka
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const q = gsap.utils.selector(root);
    gsap.timeline()
      .from(q(".wordmark span"), { yPercent: -110, duration: 1.4, ease: "power3.out", stagger: { each: 0.05, from: "center" } })
      .from(q(".subrow > *"), { y: 20, opacity: 0, duration: 0.5, ease: "power1.out", stagger: 0.06 }, 0.6)
      .from(q(".home-text > *, .home-foot > *"), { y: 20, opacity: 0, filter: "blur(10px)", duration: 0.7, ease: "power1.out", stagger: 0.1, clearProps: "filter" }, 0.8);
  }, { scope: root });

  // ganti bahasa: teks muncul ulang dengan blur per baris
  const firstLang = useRef(true);
  useGSAP(() => {
    if (firstLang.current) { firstLang.current = false; return; }
    if (prefersReducedMotion()) return;
    const split = SplitText.create(root.current.querySelector(".statement"), { type: "lines" });
    gsap.from([...split.lines, root.current.querySelector(".desc")], {
      y: 12, opacity: 0, filter: "blur(10px)", duration: 0.5, ease: "power1.out", stagger: 0.08,
      onComplete: () => split.revert(),
    });
  }, { scope: root, dependencies: [lang] });

  return (
    <div className="home" ref={root}>
      <h1 className="wordmark" aria-label="HSK Lock-in">
        {WORD.map((c, i) => <span key={i} aria-hidden="true">{c}</span>)}
      </h1>

      <div className="subrow">
        <span>{t.tagline}</span>
        <div className="toggles"><LangSwitch /><ThemeSwitch /></div>
        <span className="it">加油, jiāyóu!</span>
      </div>

      <main className="home-main">
        <div className="home-text">
          <h2 className="statement">
            {t.statement[0]} <em>{t.statement[1]}</em>
          </h2>
          <p className="desc">{t.desc(total)}</p>
          <div className="home-cta">
            <RollButton onClick={() => (window.location.hash = "/flashcard")}>{t.start}</RollButton>
            <span className="cta-note mono">{t.views.cards} · {t.views.quiz} · {t.views.list}</span>
          </div>
        </div>
      </main>

      <footer className="home-foot mono">
        <span>{t.beijing}<br />{time} (GMT+8)</span>
        <span><i className="sq" /> {t.lessonsWords(LESSONS.length, total)}</span>
      </footer>
    </div>
  );
}
