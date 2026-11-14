import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Blur reveal per baris (pola dari neutomni): setiap elemen [data-reveal="blur"]
 * di dalam `scope` dipecah per baris lalu muncul dari blur(10px) saat di-scroll.
 */
export function blurReveal(scope) {
  if (prefersReducedMotion()) return;
  gsap.utils.toArray('[data-reveal="blur"]', scope).forEach(el => {
    SplitText.create(el, {
      type: "lines",
      autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(
          self.lines,
          { opacity: 0, filter: "blur(10px)", y: 15 },
          {
            opacity: 1, filter: "blur(0px)", y: 0,
            duration: 0.6, ease: "power1.out", stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }
        );
      },
    });
  });
  // elemen biasa (bukan teks) yang muncul naik + fade
  gsap.utils.toArray('[data-reveal="up"]', scope).forEach(el => {
    gsap.from(el, {
      y: 40, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });
}

/* ---------- Lenis smooth scroll ---------- */
let lenis = null;

export function startSmoothScroll() {
  if (prefersReducedMotion() || lenis) return () => {};
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  lenis = new Lenis({ lerp: isMobile ? 0.3 : 0.08 });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = time => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
  };
}

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function scrollTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}
