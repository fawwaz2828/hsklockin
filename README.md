# HSK Lock-in

Flashcard, kuis, dan daftar kosakata HSK 1–4 (versi 2.0 & 3.0) — 3.083 kata dengan hanzi, pinyin, arti, dan contoh kalimat. Tampilan bisa Bahasa Indonesia atau Inggris.

## Menjalankan

```bash
npm install
npm run dev      # http://127.0.0.1:5180
npm run build    # hasil statis di dist/
```

## Fitur

- **Flashcard** — balik kartu, tandai hafal / belum hafal, acak, filter "belum hafal", pilihan sisi depan (hanzi, hanzi + pinyin, arti), font hanzi serif atau standar.
- **Kuis** — pilihan ganda: hanzi → arti, arti → hanzi, pinyin → hanzi. Jawaban salah otomatis ditandai "belum hafal".
- **Daftar kata** — semua kata per lesson beserta catatan dan contoh kalimat.
- **ID / EN** — antarmuka, arti, contoh kalimat, dan catatan tersedia dalam dua bahasa.
- Progres disimpan di `localStorage` browser.

Shortcut di flashcard: `Spasi` balik kartu · `←` `→` pindah · `1` belum hafal · `2` sudah hafal.

## Struktur

| Path | Isi |
|---|---|
| `src/data/lessons.js` | data kosakata (Indonesia) |
| `src/data/en.js` | terjemahan Inggris (arti HSK 1–3, contoh kalimat, catatan, judul lesson) |
| `src/lib/i18n.jsx` | teks antarmuka ID/EN |
| `src/lib/storage.js` | localStorage + migrasi progres lama |
| `src/lib/motion.js` | animasi GSAP + smooth scroll Lenis |
| `src/components/` | `Home`, `Study`, `CardView`, `QuizView`, `ListView`, `LessonBar` |

Dibuat dengan React 18, Vite, GSAP, dan Lenis.
