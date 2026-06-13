# ENHANCEMENT-2: Bug Fixes, Feature Updates, & UI/UX Overhaul

## 🎯 Objective

Fokus utama pada iterasi ini adalah memperbaiki bug navigasi/klik pada beberapa menu, merombak fitur pengelolaan data (Credentials & CSV), dan melakukan peningkatan signifikan pada UI/UX secara keseluruhan agar terlihat lebih modern dan profesional.

---

## 🐛 1. Bug Fixes

Terdapat error saat user berinteraksi dengan beberapa menu. Tolong perbaiki _click event_, _routing_, atau _state management_ pada bagian berikut agar bisa diakses tanpa error:

- **Audit**
- **Users**
- **Whitelist**

---

## ✨ 2. Feature Updates & Refactoring

### A. Credentials View

- **Tambahkan Fitur Search:** Buat agar data credentials mudah dicari.
- **Restrukturisasi Tampilan Data:** Ubah struktur tampilan _credentials_ menjadi berbasis hierarki. Tampilkan **Nama Database** sebagai parent, lalu ketika dilihat lebih detail (bisa menggunakan konsep _accordion_, _expandable row_, atau _nested list_), tampilkan **User** dan **Password** yang terasosiasi di dalamnya.
- **Tujuan:** Hierarki ini harus dibuat agar sistem _filtering_ dan pencarian data menjadi jauh lebih gampang dan intuitif bagi user.

### B. Pengelolaan CSV & Card Automation

- **Hapus Fitur Export:** Hilangkan tombol/fungsi "Export CSV" karena sudah tidak dibutuhkan.
- **Buat Fitur Import CSV:** Buat fitur baru untuk mengimpor file CSV (dari _spreadsheet_ yang sudah ada).
- **Auto-Generate Cards:** Setelah file CSV berhasil di-import, sistem harus mem-parsing data tersebut dan secara otomatis membuat komponen **Card** untuk masing-masing baris data.
- **Penyesuaian Ukuran Card:** Pastikan ukuran Card yang di-generate dibuat lebih _compact_ (tidak terlalu besar/lebar) agar menghemat ruang di layar dan terlihat rapi saat datanya banyak.

---

## 🎨 3. UI/UX Overhaul

Desain saat ini masih terlalu polos. Tolong rombak keseluruhan antarmuka pengguna (UI) dan pengalaman pengguna (UX) dengan kriteria berikut:

- **Gaya Visual:** Modern, clean, dan minimalis. Jadikan **vercel.com** sebagai referensi utama untuk _feel_ desainnya.
- **UI Library:** Gunakan komponen dari **`shadcn/ui`** dan **Tailwind CSS** untuk mempercepat proses _styling_ dan mendapatkan desain standar yang modern secara instan.
- **Detail Komponen:** Pastikan penggunaan _border_, _shadow_, _typography_, dan _spacing/padding_ disesuaikan agar terasa premium dan tidak kaku.
