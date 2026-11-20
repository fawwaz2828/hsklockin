// Login (opsional) + sinkron progres ke Supabase.
// Tanpa login / tanpa konfigurasi: app tetap memakai localStorage saja.
// Konfigurasi: VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env (lihat supabase/schema.sql untuk tabelnya).
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getItem, setWriteHook } from "./storage.js";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(URL_ && KEY_);
// PKCE: hasil login kembali sebagai ?code=… (bukan #token), jadi tidak bentrok dengan routing #/…
const sb = cloudEnabled ? createClient(URL_, KEY_, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true } }) : null;

/** Kunci localStorage yang disinkron (pengaturan tampilan tetap per perangkat). */
const SYNC = ["hsk4-flash-progress", "hsk-srs", "hsk-stats", "hsk-listen", "hsk-order", "hsk-stamps"];
const TABLE = "progress";
export const SYNC_EVENT = "hsk-synced"; // dikirim setelah data cloud digabung ke localStorage

// ---------- status untuk UI ----------
let state = { user: null, status: cloudEnabled ? "loading" : "off" }; // off | loading | out | syncing | synced | offline | error
const subs = new Set();
const set = patch => { state = { ...state, ...patch }; subs.forEach(f => f(state)); };
export function useCloud() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); setS(state); return () => subs.delete(setS); }, []);
  return s;
}

// ---------- gabung data dua perangkat ----------
const parse = s => { try { return JSON.parse(s || "{}") || {}; } catch { return {}; } };
// Per kata: yang cap waktunya (hsk-stamps) lebih baru menang, termasuk penghapusan/reset.
// Kata tanpa cap waktu (data lama) memakai aturan cadangan `tie`.
function lww(a, b, ta, tb, tie) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = ta[k] || 0, y = tb[k] || 0;
    const v = x > y ? a[k] : y > x ? b[k] : a[k] === undefined ? b[k] : b[k] === undefined ? a[k] : tie(a[k], b[k]);
    if (v !== undefined) o[k] = v;
  }
  return o;
}
const maxMap = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k]); return o; };

const MERGE = {
  // cadangan: hafal di salah satu perangkat → hafal
  "hsk4-flash-progress": (a, b, L, R) => lww(a, b, L.p || {}, R.p || {}, (x, y) => (x === "k" || y === "k" ? "k" : x)),
  // cadangan: kartu yang lebih sering diulang; seri → jatuh tempo lebih lambat
  "hsk-srs": (a, b, L, R) => lww(a, b, L.s || {}, R.s || {},
    (x, y) => ((y.n || 0) > (x.n || 0) || ((y.n || 0) === (x.n || 0) && y.due > x.due) ? y : x)),
  // hari aktif digabung (ambil angka terbesar, bukan dijumlah, supaya tidak dobel); tanggal hafal = yang paling awal
  "hsk-stats": (a, b) => {
    const days = { ...(a.days || {}) }, learned = { ...(a.learned || {}) };
    for (const d in b.days || {}) days[d] = Math.max(days[d] || 0, b.days[d]);
    for (const k in b.learned || {}) learned[k] = learned[k] == null ? b.learned[k] : Math.min(learned[k], b.learned[k]);
    return { days, learned };
  },
  // hasil latihan: pernah benar (1) menang
  "hsk-listen": (a, b) => { const o = { ...b, ...a }; for (const k in b) if (b[k] === 1) o[k] = 1; return o; },
  "hsk-order": (a, b) => { const o = { ...b, ...a }; for (const k in b) if (b[k] === 1) o[k] = 1; return o; },
  "hsk-stamps": (a, b) => ({ p: maxMap(a.p, b.p), s: maxMap(a.s, b.s) }),
};

const localData = () => Object.fromEntries(SYNC.map(k => [k, parse(getItem(k))]));

// ---------- tarik & dorong ----------
let ready = false;      // dorong hanya setelah data cloud sudah digabung (perangkat baru tidak menimpa cloud dengan data kosong)
let timer = null;
let suppress = false;   // jangan picu dorong saat kita sendiri menulis hasil gabungan

async function pull(user) {
  set({ status: "syncing" });
  const { data, error } = await sb.from(TABLE).select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  const remote = data?.data || {};
  const local = localData();
  let changed = false;
  suppress = true;
  try {
    for (const k of SYNC) {
      // cap waktu dibandingkan dari data ASLI kedua sisi (sebelum digabung)
      const merged = remote[k] ? MERGE[k](local[k], remote[k], local["hsk-stamps"], remote["hsk-stamps"] || {}) : local[k];
      const s = JSON.stringify(merged);
      if (s !== JSON.stringify(local[k])) { localStorage.setItem(k, s); changed = true; }
    }
  } finally { suppress = false; }
  ready = true;
  if (changed) window.dispatchEvent(new Event(SYNC_EVENT));
  await push();
}

async function push() {
  clearTimeout(timer);
  timer = null;
  if (!ready || !state.user) return;
  if (!navigator.onLine) return set({ status: "offline" });
  set({ status: "syncing" });
  const { error } = await sb.from(TABLE).upsert({ user_id: state.user.id, data: localData(), updated_at: new Date().toISOString() });
  set({ status: error ? "error" : "synced" });
}

const schedule = () => {
  if (!ready || !state.user || suppress) return;
  clearTimeout(timer);
  timer = setTimeout(() => push().catch(() => set({ status: "error" })), 2500);
};

async function onUser(user) {
  if (user?.id === state.user?.id && ready) return;
  ready = false;
  set({ user, status: user ? "syncing" : "out" });
  if (user) await pull(user).catch(() => set({ status: navigator.onLine ? "error" : "offline" }));
}

if (sb) {
  setWriteHook(key => { if (SYNC.includes(key)) schedule(); });
  sb.auth.getSession().then(({ data }) => {
    // setelah login: buang ?code=… dari alamat & kembali ke halaman sebelum login
    if (location.search.includes("code=")) {
      let back = "";
      try { back = sessionStorage.getItem("hsk-login-back") || ""; sessionStorage.removeItem("hsk-login-back"); } catch { /* abaikan */ }
      history.replaceState(null, "", location.pathname + (back || location.hash));
      if (back) window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    onUser(data.session?.user || null);
  });
  sb.auth.onAuthStateChange((_e, session) => { onUser(session?.user || null); });
  window.addEventListener("online", () => { if (state.user) (ready ? push() : pull(state.user)).catch(() => {}); });
  // simpan segera saat tab ditutup / disembunyikan
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && timer) push().catch(() => {}); });
}

export async function signIn() {
  if (!sb) return;
  // redirect tanpa #… (kode login ditaruh di ?code=), halaman asal disimpan sebentar
  try { sessionStorage.setItem("hsk-login-back", location.hash); } catch { /* abaikan */ }
  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
}

export async function signOut() {
  if (!sb) return;
  if (timer) await push().catch(() => {});
  await sb.auth.signOut();
}
