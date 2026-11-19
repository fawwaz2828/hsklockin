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
- **Gabung lesson** — centang "Gabung lesson" untuk menggabungkan beberapa lesson, bisa lintas HSK 1–4 (dalam satu versi), untuk flashcard, kuis, dan daftar kata.
- **Contoh kalimat** — setiap hanzi punya 5 contoh kalimat tambahan (hanzi, pinyin, arti ID/EN) yang bisa dibuka di flashcard dan daftar kata; dimuat per level dari `public/examples/`.
- **Audio** — pengucapan kata & contoh kalimat lewat text-to-speech browser (suara Mandarin zh-CN), opsi "Suara otomatis" di flashcard.
- **ID / EN** — antarmuka, arti, contoh kalimat, dan catatan tersedia dalam dua bahasa.
- Progres disimpan di `localStorage` browser.

Shortcut di flashcard: `↑` `↓` balik kartu · `←` `→` pindah · `N` belum hafal · `M` sudah hafal · `L` dengar pengucapan.

## Struktur

| Path | Isi |
|---|---|
| `src/data/lessons.js` | data kosakata (Indonesia) |
| `src/data/en.js` | terjemahan Inggris (arti HSK 1–3, contoh kalimat, catatan, judul lesson) |
| `src/lib/i18n.jsx` | teks antarmuka ID/EN |
| `src/lib/storage.js` | localStorage + migrasi progres lama |
| `src/lib/motion.js` | animasi GSAP + smooth scroll Lenis |
| `public/examples/hsk{1-4}.json` | 5 contoh kalimat per hanzi: `[hanzi, pinyin, id, en]` (dibuat AI, pinyin otomatis) |
| `scripts/build-examples.mjs` | gabungkan hasil contoh kalimat + buat pinyin (butuh `pinyin-pro`) |
| `src/components/` | `Home`, `Study`, `CardView`, `QuizView`, `ListView`, `LessonBar` |

Dibuat dengan React 18, Vite, GSAP, dan Lenis.
