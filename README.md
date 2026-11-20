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
- **Audio** — pengucapan kata dari rekaman penutur asli (`public/audio/`, ±87% kata); kata 1 karakter memakai rekaman suku kata sesuai pinyin + nadanya (是 = shi4, 十 = shi2). Kata tanpa rekaman dan semua soal menyimak memakai audio Azure Neural TTS (`public/tts/`, kalau sudah dibuat); contoh kalimat dan sisanya memakai text-to-speech browser (zh-CN). Opsi "Suara otomatis" di flashcard.
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
| `public/audio/` + `src/data/audio.js` | rekaman pengucapan + peta hanzi → file (dibuat oleh `scripts/build-audio.mjs`) |
| `public/tts/` + `src/data/tts.js` | audio Azure Neural TTS (dibuat oleh `scripts/build-tts.mjs`) |
| `scripts/build-tts.mjs` | buat mp3 Azure: isi `.env` (lihat `.env.example`), lalu `node scripts/build-tts.mjs` (`--dry` untuk hitung saja). Bisa dihentikan & dilanjutkan |
| `scripts/build-audio.mjs` | salin rekaman dari [audio-cmn](https://github.com/hugolpz/audio-cmn): `node scripts/build-audio.mjs <audio-cmn/64k>` |
| `src/components/` | `Home`, `Study`, `CardView`, `QuizView`, `ListView`, `LessonBar` |

Dibuat dengan React 18, Vite, GSAP, dan Lenis.

## Login & sinkron progres (opsional)

Tanpa konfigurasi, progres hanya disimpan di browser. Dengan Supabase, pengguna bisa **Masuk dengan Google** dan progresnya (hafalan, jadwal Ulang, statistik, hasil Menyimak/Susun) tersinkron otomatis antar perangkat.

1. Buat project gratis di supabase.com, jalankan `supabase/schema.sql` di SQL Editor.
2. Authentication → Providers → Google: aktifkan (butuh OAuth Client ID & Secret dari Google Cloud Console).
3. Authentication → URL Configuration: masukkan alamat app (mis. `http://127.0.0.1:5173/` dan alamat hosting) di *Redirect URLs*.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `.env` (dan di pengaturan env hosting), lalu build ulang.

## Lisensi audio

Rekaman pengucapan di `public/audio/` berasal dari [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn) (SWAC / Shtooka, penutur Chen Wang), lisensi [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). File audio tersebut tetap berlisensi CC BY-SA 3.0.
