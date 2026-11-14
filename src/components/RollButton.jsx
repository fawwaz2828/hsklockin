/** Tombol dengan teks yang berguling 3D saat hover (pola tombol neutomni). */
export default function RollButton({ children, onClick, ghost }) {
  return (
    <button type="button" className={"roll-btn" + (ghost ? " ghost" : "")} onClick={onClick}>
      <span className="roll">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      <span className="arrow" aria-hidden="true">→</span>
    </button>
  );
}
