// Bantuan untuk latihan "Susun kalimat".

/** Acak potongan; dijamin hasil gabungannya tidak sama dengan kalimat yang benar. */
export function scramble(pieces) {
  const idx = pieces.map((_, i) => i);
  const answer = pieces.join("");
  for (let tries = 0; tries < 30; tries++) {
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (idx.map(i => pieces[i]).join("") !== answer) break;
  }
  return idx.map(i => ({ id: i, text: pieces[i] }));
}

export const shuffled = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
