// Semua akses localStorage dibungkus try/catch (bisa gagal di private mode).
export const KEYS = {
  progress: "hsk4-flash-progress",
  set: "hsk4-flash-set",
  lesson: "hsk4-flash-lesson",
  combine: "hsk4-flash-combine",
};

export function getItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// dipasang oleh cloud.js: dipanggil setiap ada tulisan, untuk sinkron otomatis
let writeHook = null;
export const setWriteHook = fn => { writeHook = fn; };

export function setItem(key, value) {
  try { localStorage.setItem(key, value); } catch { /* abaikan */ }
  writeHook?.(key);
}

/** Muat progres ("lessonId-n" -> "k" | "u") + migrasi dari versi lama. */
export function loadProgress() {
  let prog = {};
  try {
    prog = JSON.parse(localStorage.getItem(KEYS.progress) || "{}") || {};
    const old = JSON.parse(localStorage.getItem("hsk4-l1-progress") || "null");
    if (old) {
      Object.keys(old).forEach(n => { if (!prog["1-" + n]) prog["1-" + n] = old[n]; });
      localStorage.removeItem("hsk4-l1-progress");
    }
    // versi sebelumnya sempat menyimpan kata sewa-rumah sebagai "3-": kembalikan ke Lesson 2
    if (!localStorage.getItem("hsk4-flash-v3")) {
      Object.keys(prog).forEach(k => {
        if (k.startsWith("3-")) { const nk = "2-" + k.slice(2); if (!prog[nk]) prog[nk] = prog[k]; delete prog[k]; }
      });
      localStorage.setItem("hsk4-flash-v3", "1");
    }
    // pembagian lesson 2.0 diperbarui: hapus progres 2.0 versi lama (nomor kata berubah)
    if (!localStorage.getItem("hsk4-flash-v4")) {
      Object.keys(prog).forEach(k => { if (parseInt(k) > 100) delete prog[k]; });
      localStorage.setItem("hsk4-flash-v4", "1");
    }
    localStorage.setItem(KEYS.progress, JSON.stringify(prog));
  } catch { /* abaikan */ }
  return prog;
}

export function saveProgress(prog) {
  setItem(KEYS.progress, JSON.stringify(prog));
}

export const shuffle = arr =>
  arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
