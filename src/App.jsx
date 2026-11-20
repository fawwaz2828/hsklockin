import { useEffect, useState } from "react";
import { startSmoothScroll, scrollTop } from "./lib/motion.js";
import Home from "./components/Home.jsx";
import Study from "./components/Study.jsx";

// Routing sederhana lewat hash: #/  ·  #/flashcard  ·  #/ulang  ·  #/kuis  ·  #/simak  ·  #/susun  ·  #/daftar
const ROUTES = { flashcard: "cards", ulang: "review", kuis: "quiz", simak: "listen", susun: "order", daftar: "list" };
const VIEW_TO_ROUTE = { cards: "flashcard", review: "ulang", quiz: "kuis", listen: "simak", order: "susun", list: "daftar" };

const readRoute = () => ROUTES[window.location.hash.replace(/^#\/?/, "")] || null;

export const go = view => {
  window.location.hash = view ? "/" + VIEW_TO_ROUTE[view] : "/";
};

export default function App() {
  const [view, setView] = useState(readRoute);

  useEffect(() => startSmoothScroll(), []);
  useEffect(() => {
    const on = () => { setView(readRoute()); scrollTop(); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return view ? <Study view={view} setView={go} /> : <Home />;
}
