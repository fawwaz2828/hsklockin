import { useEffect, useState } from "react";
import { getItem, setItem } from "./storage.js";
import { useLang } from "./i18n.jsx";

const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Tema aktif: pilihan yang tersimpan, atau ikut setelan sistem. */
function currentTheme() {
  const saved = getItem("hsk-theme");
  if (saved === "light" || saved === "dark") return saved;
  return dark().matches ? "dark" : "light";
}

/** Tombol matahari/bulan untuk ganti tema terang ↔ gelap. */
export function ThemeSwitch() {
  const { lang } = useLang();
  const [theme, setTheme] = useState(currentTheme);

  // kalau pengguna belum memilih, ikuti perubahan setelan sistem
  useEffect(() => {
    const mq = dark();
    const on = () => { if (!getItem("hsk-theme")) setTheme(mq.matches ? "dark" : "light"); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setItem("hsk-theme", next);
    document.documentElement.dataset.theme = next;
  };

  const label = theme === "dark"
    ? (lang === "en" ? "Switch to light mode" : "Ganti ke mode terang")
    : (lang === "en" ? "Switch to dark mode" : "Ganti ke mode gelap");

  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? (
        // matahari
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // bulan
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  );
}
