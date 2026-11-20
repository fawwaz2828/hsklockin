// Tombol akun (ujung kanan header): "Masuk dengan Google" / foto profil + menu status sinkron & keluar.
// Tidak tampil kalau Supabase belum dikonfigurasi.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cloudEnabled, signIn, signOut, useCloud } from "../lib/cloud.js";
import { useLang } from "../lib/i18n.jsx";

const GAP = 12; // jarak minimum menu dari tepi layar

export default function AccountButton() {
  const { t } = useLang();
  const { user, status } = useCloud();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const menu = useRef(null);
  const btn = useRef(null);

  // menu memakai position: fixed yang dihitung dari posisi tombol → tidak pernah terpotong tepi layar (HP)
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const vw = document.documentElement.clientWidth;
    const width = Math.min(280, vw - GAP * 2);
    const left = Math.min(Math.max(GAP, r.right - width), vw - width - GAP);
    setPos({ top: r.bottom + 8, left, width });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!box.current?.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open]);

  if (!cloudEnabled || status === "loading") return null;
  if (!user) {
    return (
      <button type="button" className="acct-btn signin" onClick={() => signIn()} title={t.acct.signInTip} aria-label={t.acct.signInTip}>
        <GoogleIcon /> <span className="acct-label">{t.acct.signIn}</span>
      </button>
    );
  }
  const name = user.user_metadata?.full_name || user.email || "";
  const pic = user.user_metadata?.avatar_url;
  const avatar = big => (pic
    ? <img src={pic} alt="" referrerPolicy="no-referrer" className={big ? "big" : ""} />
    : <span className={"acct-initial" + (big ? " big" : "")}>{name.slice(0, 1).toUpperCase()}</span>);
  return (
    <div className="acct" ref={box}>
      <button type="button" ref={btn} className={"acct-btn me" + (open ? " open" : "")} onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-haspopup="menu" aria-label={name} title={t.acct.status[status]}>
        {avatar(false)}
        <span className={"acct-dot " + status} aria-hidden="true" />
      </button>
      {open && pos && createPortal(
        <div className="acct-menu" ref={menu} role="menu" style={{ top: pos.top, left: pos.left, width: pos.width }}>
          <div className="acct-who">
            {avatar(true)}
            <div className="acct-id">
              <div className="acct-name">{name}</div>
              {user.email && name !== user.email && <div className="acct-mail">{user.email}</div>}
            </div>
          </div>
          <div className="acct-status"><span className={"acct-dot " + status} /> {t.acct.status[status]}</div>
          <button type="button" className="acct-out" role="menuitem" onClick={() => { setOpen(false); signOut(); }}>
            {t.acct.signOut}
          </button>
        </div>,
        document.body, // di luar header (backdrop-filter/transform di header mengubah acuan position: fixed)
      )}
    </div>
  );
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="14" height="14" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
