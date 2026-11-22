// Pembuat cangkang HTML (jalankan: node gen-html.mjs). Tiap halaman hanya memuat satu modul JS.
import fs from 'fs'; import path from 'path';
const head = (root, title, css) => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2f80ed">
<title>${title}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%232f80ed'/%3E%3Cpath d='M6 13l10-5 10 5-10 5z M10 16v5c3 3 9 3 12 0v-5' fill='none' stroke='white' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/css/base.css">
${css.map((c) => `<link rel="stylesheet" href="${root}assets/css/${c}.css">`).join('\n')}
</head>`;
const pub = (root, title, js) => `${head(root, title, ['public'])}
<body class="pub">
<div id="nav"></div>
<main id="app"></main>
<div id="foot"></div>
<noscript><p style="padding:40px;text-align:center">Aplikasi ini memerlukan JavaScript.</p></noscript>
<script type="module" src="${root}assets/js/pages/${js}.js"></script>
</body>
</html>
`;
const portal = (root, title, js, bnav = false) => `${head(root, title, ['public', 'portal'])}
<body class="portal${bnav ? ' has-bnav' : ''}">
<div id="shell"></div>
<noscript><p style="padding:40px;text-align:center">Aplikasi ini memerlukan JavaScript.</p></noscript>
<script type="module" src="${root}assets/js/pages/${js}.js"></script>
</body>
</html>
`;
const w = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const P = [['index', 'Beranda', 'beranda'], ['profil', 'Profil Sekolah', 'profil'], ['berita', 'Berita & Pengumuman', 'berita'], ['galeri', 'Galeri', 'galeri'], ['ppdb', 'PPDB Online', 'ppdb'], ['kontak', 'Kontak & Lokasi', 'kontak']];
P.forEach(([f, t, j]) => w(`${f}.html`, pub('', t, j)));
w('login.html', `${head('', 'Masuk Portal', ['public', 'portal'])}\n<body class="login-body">\n<div id="app" style="width:100%;display:grid;place-items:center"></div>\n<script type="module" src="assets/js/pages/login.js"></script>\n</body>\n</html>\n`);
w('setup.html', `${head('', 'Setup Firebase', ['public', 'portal'])}\n<body class="pub" style="background:var(--bg)">\n<div id="app"></div>\n<script type="module" src="assets/js/pages/setup.js"></script>\n</body>\n</html>\n`);
w('gerbang.html', `${head('', 'Layar QR Gerbang', ['public', 'portal'])}\n<body class="gate">\n<div id="app" style="width:100%"></div>\n<script type="module" src="assets/js/pages/gerbang.js"></script>\n</body>\n</html>\n`);
[['index', 'Dashboard', 's-dashboard'], ['jadwal', 'Jadwal Pelajaran', 's-jadwal'], ['tugas', 'Materi & Tugas', 's-tugas'], ['nilai', 'Nilai & Raport', 's-nilai'], ['absensi', 'Absensi', 's-absensi'], ['kartu', 'Kartu Pelajar & Profil', 's-kartu']].forEach(([f, t, j]) => w(`siswa/${f}.html`, portal('../', t, j, true)));
[['index', 'Dashboard Wali Kelas', 'g-dashboard'], ['murid', 'Murid Kelas', 'g-murid'], ['materi', 'Materi & Tugas', 'g-materi'], ['nilai', 'Input Nilai', 'g-nilai'], ['absensi', 'Absensi Kelas', 'g-absensi'], ['profil', 'Profil', 'g-profil']].forEach(([f, t, j]) => w(`guru/${f}.html`, portal('../', t, j)));
[['index', 'Dashboard Admin', 'a-dashboard'], ['berita', 'Kelola Berita', 'a-berita'], ['galeri', 'Kelola Galeri', 'a-galeri'], ['ppdb', 'Kelola PPDB', 'a-ppdb'], ['pengguna', 'Pengguna', 'a-pengguna'], ['akademik', 'Kelas & Jadwal', 'a-akademik'], ['absensi', 'Absensi', 'a-absensi'], ['laporan', 'Laporan & Ekspor', 'a-laporan'], ['pesan', 'Pesan Masuk', 'a-pesan'], ['pengaturan', 'Pengaturan', 'a-pengaturan']].forEach(([f, t, j]) => w(`admin/${f}.html`, portal('../', t, j)));
console.log('HTML dibuat');
