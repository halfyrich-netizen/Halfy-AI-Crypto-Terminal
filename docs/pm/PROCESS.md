# Proses Kerja — Halfy AI Crypto Terminal

Dokumen ini mengatur cara kita mengerjakan task sehari-hari. Ringkas sengaja — yang penting dipatuhi, bukan panjang.

## 1. Alur Kerja Task

```
pilih task di BACKLOG.md (status: todo)
  → pindahkan status ke doing
  → buat cabang kerja
  → kerjakan + verifikasi (lint & run dev)
  → update BACKLOG.md (done) + catat apa yang berubah
  → commit & push
```

Karena ini project solo, tidak ada formal review PR — verifikasi mandiri adalah review:

- [ ] `npm run lint` lolos tanpa error
- [ ] `npm run dev` jalan, fitur yang disentuh dicek manual di browser
- [ ] Tidak ada `console.log` Debug yang tertinggal
- [ ] Tidak ada secret (`GEMINI_API_KEY`) yang ter-commit — `.env` di luar git

## 2. Branching

| Cabang | Kegunaan |
|--------|----------|
| `main` | Selalu bisa dijalankan. Commit langsung diperbolehkan untuk perubahan kecil (docs, typo, fix 1-baris). |
| `feat/<id>-<slug>` | Untuk task backlog, mis. `feat/hac-1-binance-klines` |

Merge ke `main` setelah checklist verifikasi lolos. Hapus cabang setelah merge.

## 3. Format Commit

Mengikuti [Conventional Commits](https://www.conventionalcommits.org/id/):

```
<type>(<scope>): <deskripsi singkat dalam bahasa Indonesia>

Contoh:
feat(chart): integrasi candle historis asli dari Binance Klines
fix(server): validasi simbol untuk mencegah injection
docs(pm): update backlog setelah selesai HAC-1
chore: ganti nama package menjadi halfy-ai-crypto-terminal
```

Tipe yang dipakai: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Sertakan ID backlog di deskripsi atau body bila relevan (mis. `HAC-1`).

## 4. Definition of Done

Sebuah task disebut **done** hanya jika:

1. Kriteria "Definition of done" di ROADMAP (untuk milestone) atau catatan di BACKLOG terpenuhi,
2. Checklist verifikasi di atas lolos,
3. Status di `BACKLOG.md` sudah diubah ke `done`.

## 5. Ritual

- **Awal sesi kerja**: baca `BACKLOG.md`, pilih task P1 teratas yang tidak diblokir.
- **Akhir sesi kerja**: update status backlog, commit semua perubahan (jangan tinggalkan work in progress tidak ter-commit di `main`).
- **Setiap milestone selesai**: tandai di `ROADMAP.md` dan tulis ringkasan apa yang berubah.

## 6. Keputusan Penting (Decision Log)

Catat keputusan arsitektur/arah produk besar di sini agar tidak lupa kenapa diputuskan.

| Tanggal | Keputusan | Alasan |
|---------|-----------|--------|
| 2026-10-31 | Project berfokus ke **crypto** (bukan saham IDX/US seperti implementation plan AI Studio lama) | Kode sudah live sync Binance; plan lama usang |
| 2026-10-31 | Project management dikelola sebagai file markdown di `docs/pm/`, bukan GitHub Projects | Sederhana, version-controlled, cukup untuk tim solo — bisa dimigrasi ke GitHub Issues nanti kalau perlu |
