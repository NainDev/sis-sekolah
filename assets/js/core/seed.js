/* ============================================================
   seed.js — data awal realistis (fiktif) agar sistem langsung bisa dicoba.
   Tanggal dibuat relatif terhadap hari ini, jadi selalu terasa "baru".
   Dipakai oleh mode demo (otomatis) dan setup.html (untuk Firebase).
   ============================================================ */
import { dateKey, addDays, pad, clamp, fmtTanggal, HARI_KEY } from './utils.js';

export const SEED_VERSION = 4;

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const MAPEL = [
  { id: 'mtk', nama: 'Matematika', kode: 'MTK' }, { id: 'bin', nama: 'Bahasa Indonesia', kode: 'BIN' },
  { id: 'big', nama: 'Bahasa Inggris', kode: 'BIG' }, { id: 'fis', nama: 'Fisika', kode: 'FIS' },
  { id: 'bdt', nama: 'Basis Data', kode: 'BDT' }, { id: 'pgd', nama: 'Pemrograman Dasar', kode: 'PGD' },
  { id: 'sej', nama: 'Sejarah Indonesia', kode: 'SEJ' }, { id: 'pkn', nama: 'Pendidikan Pancasila', kode: 'PKN' },
  { id: 'inf', nama: 'Informatika', kode: 'INF' }, { id: 'pjk', nama: 'PJOK', kode: 'PJK' }
];
// Urutan rotasi jadwal (pasangan mapel satu guru berjarak 5 agar tidak bentrok)
const ROTASI = ['pjk', 'bin', 'mtk', 'fis', 'bdt', 'pkn', 'sej', 'big', 'inf', 'pgd'];

const GURU = [
  { key: 'siti', nama: 'Siti Rahmawati, S.Pd.', nip: '198503122010012005', mapel: ['mtk'], hp: '081322110001' },
  { key: 'budi', nama: 'Budi Santoso, M.Pd.', nip: '197912052006041003', mapel: ['fis', 'inf'], hp: '081322110002' },
  { key: 'dewi', nama: 'Dewi Lestari, S.Pd.', nip: '198807192015022001', mapel: ['bin', 'sej'], hp: '081322110003' },
  { key: 'agus', nama: 'Agus Hermawan, S.Pd.', nip: '198204302009031004', mapel: ['big'], hp: '081322110004' },
  { key: 'nurul', nama: 'Nurul Hidayah, S.Kom.', nip: '199001142018012002', mapel: ['bdt', 'pgd'], hp: '081322110005' },
  { key: 'rudi', nama: 'Rudi Hartono, S.Pd.', nip: '198110252008011006', mapel: ['pjk', 'pkn'], hp: '081322110006' }
];
const KELAS = [
  { id: 'x1', nama: 'X RPL 1', jurusan: 'rpl', tingkat: 10, wali: 'siti', ruang: 'R. 101' },
  { id: 'x2', nama: 'X RPL 2', jurusan: 'rpl', tingkat: 10, wali: 'dewi', ruang: 'R. 102' },
  { id: 'xi1', nama: 'XI TKJ 1', jurusan: 'tkj', tingkat: 11, wali: 'nurul', ruang: 'R. 201' },
  { id: 'xii1', nama: 'XII RPL 1', jurusan: 'rpl', tingkat: 12, wali: 'budi', ruang: 'R. 301' }
];
const SISWA = [
  ['Aditya Nugraha', 'L'], ['Bunga Citra Lestari', 'P'], ['Dimas Prasetyo', 'L'], ['Eka Wulandari', 'P'], ['Fajar Ramadhan', 'L'],
  ['Gita Permata Sari', 'P'], ['Hendra Kurniawan', 'L'], ['Intan Maharani', 'P'], ['Kevin Alamsyah', 'L'], ['Laila Zahra', 'P'],
  ['Ahmad Rizki Pratama', 'L'], ['Nabila Putri Azzahra', 'P'], ['Muhammad Farhan', 'L'], ['Salsabila Anindya', 'P'], ['Rafi Aditya Wijaya', 'L'],
  ['Putri Ayu Ningrum', 'P'], ['Bagas Wicaksono', 'L'], ['Cantika Dewi', 'P'], ['Yoga Pratama', 'L'], ['Zahra Amalia', 'P']
];
export const DEMO_SISWA_INDEX = 10; // Ahmad Rizki Pratama (XI TKJ 1)

const TOPIK = {
  mtk: ['Fungsi Kuadrat dan Grafiknya', 'Trigonometri Dasar', 'Statistika: Ukuran Pemusatan Data'],
  bin: ['Teks Eksposisi dan Argumentasi', 'Menyusun Laporan Hasil Observasi', 'Analisis Unsur Intrinsik Cerpen'],
  big: ['Narrative Text dan Simple Past Tense', 'Procedure Text: Giving Instructions', 'Descriptive Text tentang Tempat Wisata'],
  fis: ['Gerak Lurus Beraturan', 'Hukum Newton dan Penerapannya', 'Usaha dan Energi'],
  bdt: ['Model Data dan ERD', 'Perintah SQL Dasar (SELECT, JOIN)', 'Normalisasi Basis Data'],
  pgd: ['Algoritma dan Flowchart', 'Percabangan dan Perulangan', 'Fungsi dan Array'],
  sej: ['Kerajaan Hindu-Buddha di Nusantara', 'Masuk dan Berkembangnya Islam', 'Pergerakan Nasional Indonesia'],
  pkn: ['Pancasila sebagai Dasar Negara', 'Norma dan Hukum di Masyarakat', 'Hak dan Kewajiban Warga Negara'],
  inf: ['Berpikir Komputasional', 'Dasar Pemrograman Python', 'Jaringan Komputer dan Internet'],
  pjk: ['Permainan Bola Besar: Basket', 'Kebugaran Jasmani dan Pengukurannya', 'Atletik: Lari Estafet']
};
const INSTRUKSI = [
  'Kerjakan soal latihan pada modul dan unggah jawaban berupa teks ringkas atau tautan Google Drive.',
  'Buat rangkuman satu halaman dengan bahasamu sendiri, lalu sertakan tautan berkas hasil kerjamu.',
  'Jawab lima soal studi kasus pada lembar kerja. Tuliskan langkah penyelesaiannya secara runtut.',
  'Kerjakan secara mandiri. Kumpulkan sebelum tenggat; keterlambatan dapat memengaruhi nilai.'
];

export function buildSeed({ withPasswords = false, today = new Date() } = {}) {
  const rnd = mulberry32(20261121);
  const R = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const T = (n) => dateKey(addDays(today, n));
  const tsAt = (key, h, m) => { const [y, mo, d] = key.split('-').map(Number); return new Date(y, mo - 1, d, h, m).getTime(); };
  const todayKey = dateKey(today);
  const tree = {}; const accounts = [];
  const pw = (p) => (withPasswords ? { password: p } : {});

  /* ---------- Pengaturan, statistik, profil ---------- */
  tree.pengaturan = {
    nama: 'SMK Harapan Bangsa Cirebon', singkat: 'SMK Harapan Bangsa', slogan: 'Cerdas, Berkarakter, Berprestasi',
    npsn: '20212345', alamat: 'Jl. Pemuda No. 128, Kesambi, Kota Cirebon, Jawa Barat 45134',
    telp: '(0231) 555-0123', wa: '0812-3456-7890', email: 'info@smaharapanbangsa.sch.id',
    jamOperasional: 'Senin – Jumat: 06.30 – 16.00 WIB', jamOperasional2: 'Sabtu: 07.00 – 12.00 WIB (layanan administrasi)',
    mapQuery: 'Cirebon, Jawa Barat', instagram: '@smk.harapanbangsa', youtube: 'SMK Harapan Bangsa TV',
    jamMasuk: '07:00', toleransiMenit: 0, jamPulang: '14:00', qrDetik: 20, modeUji: true, tahunAjaran: '2026/2027', semester: 'Ganjil', semesterKey: '2026-1',
    ppdbBuka: true, ppdbTahun: '2027/2028', ppdbGelombang: 'Gelombang 1', ppdbTutup: '2027-02-28', ppdbKuota: 288,
    kepsek: {
      nama: 'Drs. H. Ahmad Fauzi, M.Pd.', jabatan: 'Kepala Sekolah',
      sambutan: [
        'Assalamu\'alaikum warahmatullahi wabarakatuh. Selamat datang di laman resmi SMK Harapan Bangsa Cirebon. Kami percaya bahwa sekolah bukan sekadar tempat belajar, tetapi rumah kedua tempat karakter, kecerdasan, dan mimpi anak-anak bangsa tumbuh bersama.',
        'Melalui sistem informasi sekolah ini, kami berupaya menghadirkan layanan yang transparan dan mudah diakses: dari informasi kegiatan, pendaftaran peserta didik baru, hingga portal belajar bagi siswa dan guru. Orang tua pun dapat mengikuti perkembangan putra-putri mereka dengan lebih dekat.',
        'Mari bersama-sama menjaga semangat belajar, disiplin, dan kolaborasi. Terima kasih atas kepercayaan seluruh keluarga besar Harapan Bangsa.'
      ]
    },
    libur: { '2026-08-17': 'Hari Kemerdekaan RI', '2026-12-25': 'Hari Raya Natal', '2027-01-01': 'Tahun Baru Masehi' }
  };
  tree.statistik = { siswa: 1086, guru: 74, prestasi: 126, ekskul: 24 };
  tree.profil = {
    pengantar: 'SMK Harapan Bangsa Cirebon adalah sekolah menengah kejuruan yang berkomitmen mencetak lulusan berakhlak mulia, berpikir kritis, dan siap bersaing di tingkat nasional maupun global. Sekolah kami menerapkan Kurikulum Merdeka dengan penguatan literasi, numerasi, teknologi, dan budaya lokal Cirebon.',
    sejarah: [
      { tahun: '1987', judul: 'Perintisan sekolah', teks: 'Berdiri atas prakarsa tokoh pendidikan setempat dengan 3 ruang kelas dan 96 siswa angkatan pertama di kawasan Kesambi.' },
      { tahun: '1996', judul: 'Menjadi sekolah negeri', teks: 'Resmi berstatus negeri dan mulai membuka kelas peminatan IPA dan IPS dengan tenaga pendidik tetap.' },
      { tahun: '2008', judul: 'Akreditasi A pertama', teks: 'Meraih predikat akreditasi A dan membangun laboratorium IPA serta perpustakaan baru.' },
      { tahun: '2016', judul: 'Gedung dan jaringan digital', teks: 'Peresmian gedung tiga lantai, laboratorium komputer, dan jaringan Wi-Fi di seluruh area sekolah.' },
      { tahun: '2022', judul: 'Implementasi Kurikulum Merdeka', teks: 'Menjadi sekolah pelaksana Kurikulum Merdeka dengan proyek penguatan profil pelajar Pancasila bertema budaya Cirebon.' },
      { tahun: '2026', judul: 'Sistem informasi sekolah terpadu', teks: 'Meluncurkan portal siswa, guru, dan PPDB online, termasuk absensi QR di gerbang sekolah.' }
    ],
    visi: 'Terwujudnya peserta didik yang beriman, berakhlak mulia, cerdas, mandiri, dan berprestasi dengan tetap berakar pada budaya bangsa.',
    misi: [
      'Menyelenggarakan pembelajaran yang aktif, kreatif, dan bermakna berbasis Kurikulum Merdeka.',
      'Menumbuhkan keimanan, ketakwaan, dan karakter melalui pembiasaan harian di sekolah.',
      'Mengembangkan minat dan bakat melalui ekstrakurikuler serta kompetisi di berbagai tingkat.',
      'Memanfaatkan teknologi informasi untuk layanan pendidikan yang transparan dan efisien.',
      'Membangun kemitraan yang erat dengan orang tua, alumni, dunia usaha, dan masyarakat.'
    ],
    struktur: [
      { jabatan: 'Kepala Sekolah', nama: 'Drs. H. Ahmad Fauzi, M.Pd.', level: 0 },
      { jabatan: 'Wakasek Kurikulum', nama: 'Hj. Rina Kartika, M.Pd.', level: 1 },
      { jabatan: 'Wakasek Kesiswaan', nama: 'Teguh Prasetyo, S.Pd.', level: 1 },
      { jabatan: 'Wakasek Sarana Prasarana', nama: 'Dedi Mulyadi, S.T.', level: 1 },
      { jabatan: 'Wakasek Humas', nama: 'Yuliana Sari, S.Sos.', level: 1 },
      { jabatan: 'Kepala Tata Usaha', nama: 'Hendra Gunawan, S.Kom.', level: 2 },
      { jabatan: 'Koordinator BK', nama: 'Maya Anggraini, S.Psi.', level: 2 },
      { jabatan: 'Koordinator Laboratorium', nama: 'Nurul Hidayah, S.Kom.', level: 2 },
      { jabatan: 'Pustakawan', nama: 'Ratna Dewi, S.IP.', level: 2 }
    ],
    fasilitas: [
      { nama: 'Laboratorium Jaringan', ikon: 'globe', teks: 'Lab TKJ dengan router, switch, dan perangkat praktik jaringan.' },
      { nama: 'Laboratorium Komputer', ikon: 'monitor', teks: '40 unit komputer terhubung internet fiber.' },
      { nama: 'Perpustakaan Digital', ikon: 'book-open', teks: '12.000 koleksi buku cetak dan akses e-book.' },
      { nama: 'Lapangan Olahraga', ikon: 'trophy', teks: 'Lapangan basket, futsal, voli, dan lintasan lari.' },
      { nama: 'Aula Serbaguna', ikon: 'building', teks: 'Berkapasitas 600 orang untuk acara sekolah.' },
      { nama: 'Ruang Seni & Musik', ikon: 'music', teks: 'Studio musik, paduan suara, dan sanggar tari.' },
      { nama: 'Wi-Fi Area Sekolah', ikon: 'wifi', teks: 'Jaringan nirkabel di seluruh ruang kelas.' },
      { nama: 'Kantin Sehat', ikon: 'coffee', teks: 'Makanan bergizi dengan pengawasan kebersihan.' },
      { nama: 'Mushola', ikon: 'moon', teks: 'Tempat ibadah yang luas dan nyaman.' }
    ],
    akreditasi: { peringkat: 'A', skor: 96, lembaga: 'BAN-S/M', nomor: 'Contoh: 1234/BAP-SM/XII/2022', berlaku: '2022 – 2027', keterangan: 'Unggul' }
  };

  /* ---------- Akun & direktori ---------- */
  tree.users = {}; tree.guru = {};
  const admins = [
    { uid: 'u_admin', username: 'admin', nama: 'Hendra Gunawan, S.Kom.', jabatan: 'Kepala Tata Usaha' },
    { uid: 'u_tu01', username: 'tu01', nama: 'Rina Marlina', jabatan: 'Staf Tata Usaha' }
  ];
  admins.forEach((a) => { tree.users[a.uid] = { role: 'admin', nama: a.nama, username: a.username, jabatan: a.jabatan, aktif: true, ...pw('admin123') }; accounts.push({ uid: a.uid, username: a.username, password: 'admin123', role: 'admin' }); });

  const guruUid = {}; const guruByMapel = {};
  GURU.forEach((g) => {
    const uid = 'u_' + g.nip; guruUid[g.key] = uid;
    g.mapel.forEach((m) => { guruByMapel[m] = uid; });
    tree.users[uid] = { role: 'guru', nama: g.nama, username: g.nip, nip: g.nip, jabatan: 'Guru Mata Pelajaran', hp: g.hp, aktif: true, ...pw('guru123') };
    tree.guru[uid] = { nama: g.nama, nip: g.nip, mapel: Object.fromEntries(g.mapel.map((m) => [m, true])) };
    accounts.push({ uid, username: g.nip, password: 'guru123', role: 'guru' });
  });

  tree.jurusan = {
    rpl: { kode: 'RPL', nama: 'Rekayasa Perangkat Lunak', kaprog: 'Budi Santoso, M.Pd.' },
    tkj: { kode: 'TKJ', nama: 'Teknik Komputer dan Jaringan', kaprog: 'Nurul Hidayah, S.Kom.' },
    akl: { kode: 'AKL', nama: 'Akuntansi dan Keuangan Lembaga', kaprog: 'Dewi Lestari, S.Pd.' }
  };
  tree.tahunAjaran = {
    '2026-1': { nama: '2026/2027 Ganjil', tahun: '2026/2027', semester: 'Ganjil', semesterKey: '2026-1', aktif: true },
    '2025-2': { nama: '2025/2026 Genap', tahun: '2025/2026', semester: 'Genap', semesterKey: '2025-2', aktif: false }
  };
  tree.kelas = {}; KELAS.forEach((k) => { tree.kelas[k.id] = { nama: k.nama, jurusanId: k.jurusan, tingkat: k.tingkat, wali: guruUid[k.wali], ruang: k.ruang }; });
  tree.mapel = {}; MAPEL.forEach((m) => { tree.mapel[m.id] = { nama: m.nama, kode: m.kode }; });

  const kecamatan = ['Kesambi', 'Harjamukti', 'Kejaksan', 'Lemahwungkuk', 'Pekalipan'];
  const jalan = ['Jl. Pemuda No.', 'Jl. Tuparev No.', 'Jl. Kesambi Raya No.', 'Jl. Cipto Mangunkusumo No.', 'Jl. Evakuasi No.', 'Jl. Perjuangan No.', 'Perum Griya Asri Blok C-'];
  const ortuNama = ['Sutrisno', 'Hartono', 'Wahyudi', 'Slamet', 'Darmawan', 'Supriyadi', 'Fauzan', 'Rosyid', 'Junaedi', 'Kurniadi'];
  const siswa = SISWA.map(([nama, jk], i) => {
    const ki = Math.floor(i / 5), k = KELAS[ki], nisn = `00512345${pad(i + 1)}`, uid = 'u_' + nisn;
    const th = k.tingkat === 10 ? R(2010, 2011) : k.tingkat === 11 ? R(2009, 2010) : R(2008, 2009);
    const s = {
      uid, nisn, nama, jk, kelasId: k.id, ki,
      profil: {
        role: 'siswa', nama, username: nisn, nisn, kelasId: k.id, jk, aktif: true,
        tempatLahir: pick(['Cirebon', 'Indramayu', 'Kuningan', 'Majalengka']), tglLahir: `${th}-${pad(R(1, 12))}-${pad(R(1, 28))}`,
        alamat: `${pick(jalan)} ${R(3, 98)}, Kec. ${pick(kecamatan)}, Kota Cirebon`, hp: `0812${R(1000, 9999)}${R(1000, 9999)}`,
        ortu: `${jk === 'L' ? 'Bpk.' : 'Bpk.'} ${pick(ortuNama)}`, tahunMasuk: 2026 - (k.tingkat - 10), ...pw('siswa123')
      }
    };
    tree.users[uid] = s.profil; accounts.push({ uid, username: nisn, password: 'siswa123', role: 'siswa' });
    return s;
  });
  const demo = siswa[DEMO_SISWA_INDEX];
  demo.profil.alamat = 'Jl. Kesambi Raya No. 45, Kec. Kesambi, Kota Cirebon';

  /* ---------- Jadwal pelajaran ---------- */
  const BLOK = [['07:00', '08:30'], ['08:30', '10:00'], ['10:30', '12:00'], ['12:30', '14:00']];
  const BLOK_JUM = [['07:00', '08:30'], ['08:30', '10:00'], ['10:30', '11:30']];
  tree.jadwal = {};
  KELAS.forEach((k, ci) => {
    let t = 0; tree.jadwal[k.id] = {};
    for (let h = 1; h <= 5; h++) {
      tree.jadwal[k.id][HARI_KEY[h]] = {};
      (h === 5 ? BLOK_JUM : BLOK).forEach(([mulai, selesai], bi) => {
        const mapelId = ROTASI[(t + 3 * ci) % 10]; t++;
        tree.jadwal[k.id][HARI_KEY[h]]['b' + (bi + 1)] = { mulai, selesai, mapelId, guruUid: guruByMapel[mapelId] };
      });
    }
  });

  /* ---------- Materi & tugas ---------- */
  tree.materi = {}; tree.tugas = {};
  const TENGGAT = [-9, -6, -2, 1, 3, 6];
  KELAS.forEach((k, ci) => {
    MAPEL.forEach((m, mi) => {
      [0, 1].forEach((n) => {
        const judul = TOPIK[m.id][(ci + n) % 3];
        tree.materi[`m_${k.id}_${m.id}_${n + 1}`] = {
          kelasId: k.id, mapelId: m.id, guruUid: guruByMapel[m.id], judul, tanggal: T(-R(3, 40)),
          deskripsi: `Ringkasan materi ${judul.toLowerCase()} beserta contoh soal dan latihan mandiri untuk kelas ${k.nama}.`,
          tautan: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(judul)
        };
      });
      const topik = TOPIK[m.id][(ci + 2) % 3], off = TENGGAT[(mi + ci) % 6];
      tree.tugas[`t_${k.id}_${m.id}`] = {
        kelasId: k.id, mapelId: m.id, guruUid: guruByMapel[m.id], judul: `Tugas ${topik}`,
        deskripsi: INSTRUKSI[(mi + ci) % 4], tanggal: T(off - 7), tenggat: T(off)
      };
    });
  });

  /* ---------- Nilai, pengumpulan tugas ---------- */
  tree.nilai = {}; tree.pengumpulan = {};
  let nc = 0; const nid = () => 'n' + (++nc).toString(36);
  const KOMENTAR = ['Bagus, pertahankan.', 'Perlu ketelitian pada langkah akhir.', 'Lengkap dan rapi.', 'Tambahkan penjelasan agar lebih lengkap.', 'Sangat baik, analisismu tajam.'];
  siswa.forEach((s) => {
    const isDemo = s === demo, ability = isDemo ? 87 : R(66, 92);
    const base = {}; MAPEL.forEach((m) => { base[m.id] = ability + R(-6, 6) + (isDemo ? ({ mtk: 5, fis: 5, inf: 4, bin: -5, sej: -3 }[m.id] || 0) : 0); });
    const sc = (b, v = 6) => clamp(Math.round(b + R(-v, v)), 45, 100);
    tree.nilai[s.uid] = {}; tree.pengumpulan[s.uid] = {};
    const N = tree.nilai[s.uid];
    MAPEL.forEach((m) => {
      N[nid()] = { mapelId: m.id, jenis: 'UH', judul: 'Ulangan Harian 1', nilai: sc(base[m.id]), semester: '2026-1', tanggal: T(-48) };
      N[nid()] = { mapelId: m.id, jenis: 'UH', judul: 'Ulangan Harian 2', nilai: sc(base[m.id]), semester: '2026-1', tanggal: T(-30) };
      N[nid()] = { mapelId: m.id, jenis: 'UTS', judul: 'Penilaian Tengah Semester', nilai: sc(base[m.id], 8), semester: '2026-1', tanggal: T(-38) };
      if (KELAS[s.ki].tingkat > 10) {
        N[nid()] = { mapelId: m.id, jenis: 'Tugas', judul: 'Tugas Proyek 1', nilai: sc(base[m.id] + 3), semester: '2025-2', tanggal: T(-185) };
        N[nid()] = { mapelId: m.id, jenis: 'Tugas', judul: 'Tugas Proyek 2', nilai: sc(base[m.id] + 3), semester: '2025-2', tanggal: T(-170) };
        N[nid()] = { mapelId: m.id, jenis: 'UH', judul: 'Ulangan Harian 1', nilai: sc(base[m.id] - 2), semester: '2025-2', tanggal: T(-175) };
        N[nid()] = { mapelId: m.id, jenis: 'UH', judul: 'Ulangan Harian 2', nilai: sc(base[m.id] - 2), semester: '2025-2', tanggal: T(-160) };
        N[nid()] = { mapelId: m.id, jenis: 'UTS', judul: 'Penilaian Tengah Semester', nilai: sc(base[m.id], 8), semester: '2025-2', tanggal: T(-168) };
        N[nid()] = { mapelId: m.id, jenis: 'UAS', judul: 'Penilaian Akhir Semester', nilai: sc(base[m.id], 8), semester: '2025-2', tanggal: T(-150) };
      }
    });
    // pengumpulan tugas semester berjalan
    Object.entries(tree.tugas).filter(([, t]) => t.kelasId === s.kelasId).forEach(([tid, t]) => {
      const past = t.tenggat < todayKey;
      const submit = past ? rnd() < (isDemo ? 0.8 : 0.86) : rnd() < 0.22;
      if (!submit) return;
      const [y, mo, d] = t.tenggat.split('-').map(Number);
      const waktu = past ? new Date(y, mo - 1, d - R(0, 2), R(8, 21), R(0, 59)).getTime() : Date.now() - R(1, 20) * 3600e3;
      const row = { waktu, teks: 'Jawaban sudah saya kerjakan dan dilampirkan pada tautan berikut.', tautan: 'https://drive.google.com/' };
      const off = Math.round((new Date(y, mo - 1, d) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
      if (past && off <= -5) {
        row.nilai = sc(base[t.mapelId] + 2); row.catatan = pick(KOMENTAR);
        N[nid()] = { mapelId: t.mapelId, jenis: 'Tugas', judul: t.judul, nilai: row.nilai, semester: '2026-1', tanggal: t.tenggat, tugasId: tid };
      }
      tree.pengumpulan[s.uid][tid] = row;
    });
  });

  /* ---------- Absensi 60 hari terakhir ---------- */
  tree.absensi = {}; tree.absensi_hari = {};
  const SAKIT = ['Demam', 'Flu dan batuk', 'Sakit perut'], IZIN = ['Keperluan keluarga', 'Mengikuti lomba', 'Mengurus dokumen'];
  siswa.forEach((s) => { tree.absensi[s.uid] = {}; });
  for (let off = -60; off <= 0; off++) {
    const d = addDays(today, off), key = dateKey(d), dow = d.getDay();
    if (dow === 0 || dow === 6 || tree.pengaturan.libur[key]) continue;
    tree.absensi_hari[key] = {};
    siswa.forEach((s) => {
      const isDemo = s === demo;
      if (off === 0 && isDemo) return; // siswa demo belum absen hari ini → bisa uji pindai QR
      let r = rnd();
      if (off === 0 && r > 0.88) return; // sebagian siswa belum tiba hari ini
      let status = r < 0.86 ? 'hadir' : r < 0.93 ? 'terlambat' : r < 0.96 ? 'sakit' : r < 0.98 ? 'izin' : 'alfa';
      if (isDemo && status === 'alfa') status = 'hadir';
      if (off === 0 && (status === 'sakit' || status === 'izin' || status === 'alfa')) status = 'hadir';
      let rec;
      if (status === 'hadir') { const h = 6, m = R(28, 59); rec = { status, jam: `${pad(h)}:${pad(m)}`, ts: tsAt(key, h, m), metode: 'qr' }; }
      else if (status === 'terlambat') { const m = R(2, 38); rec = { status, jam: `07:${pad(m)}`, ts: tsAt(key, 7, m), metode: 'qr' }; }
      else if (status === 'sakit') rec = { status, metode: 'manual', catatan: pick(SAKIT) };
      else if (status === 'izin') rec = { status, metode: 'manual', catatan: pick(IZIN) };
      else rec = { status, metode: 'manual' };
      tree.absensi[s.uid][key] = rec;
      tree.absensi_hari[key][s.uid] = { status, jam: rec.jam || null, kelasId: s.kelasId };
    });
    if (!Object.keys(tree.absensi_hari[key]).length) delete tree.absensi_hari[key];
  }

  /* ---------- Berita, galeri ---------- */
  const PAS_MULAI = T(9), PAS_AKHIR = T(14), RAPORT = T(28);
  const B = (id, judul, kategori, off, ringkasan, isi, pinned = false, dilihat = R(80, 900)) => [id, { judul, kategori, tanggal: T(off), ringkasan, isi: isi.join('\n\n'), penulis: 'Humas Sekolah', pinned, dilihat }];
  tree.berita = Object.fromEntries([
    B('b1', 'Tim Robotik Harapan Bangsa Raih Juara 2 Kompetisi Robotik Tingkat Provinsi', 'Prestasi', -4,
      'Tiga siswa kelas XI dan XII membawa pulang medali perak setelah bersaing dengan 42 tim dari seluruh Jawa Barat.',
      ['Tim Robotik SMK Harapan Bangsa berhasil meraih Juara 2 pada Kompetisi Robotik Tingkat Provinsi Jawa Barat yang digelar akhir pekan lalu di Bandung. Tim beranggotakan tiga siswa kelas XI dan XII ini bersaing dengan 42 tim dari berbagai kabupaten dan kota.',
        'Robot rancangan tim dinilai unggul pada kategori kecepatan navigasi dan ketepatan manuver. Persiapan dilakukan selama dua bulan, dengan latihan rutin setiap sore dan bimbingan dari guru Informatika serta alumni yang kini kuliah di bidang teknik.',
        'Kepala sekolah menyampaikan apresiasi dan berharap prestasi ini memotivasi siswa lain untuk berani mencoba. Tim akan melanjutkan persiapan menuju seleksi tingkat nasional pada semester depan.'], true, 612),
    B('b2', 'Jadwal Penilaian Akhir Semester (PAS) Ganjil 2026/2027', 'Pengumuman', -2,
      `Penilaian Akhir Semester Ganjil dilaksanakan ${fmtTanggal(PAS_MULAI, { singkat: true })} sampai ${fmtTanggal(PAS_AKHIR, { singkat: true })}.`,
      [`Diberitahukan kepada seluruh siswa bahwa Penilaian Akhir Semester (PAS) Ganjil Tahun Pelajaran 2026/2027 akan dilaksanakan pada ${fmtTanggal(PAS_MULAI, { hari: true })} sampai ${fmtTanggal(PAS_AKHIR, { hari: true })}.`,
        'Siswa wajib hadir 15 menit sebelum ujian dimulai (pukul 06.45 WIB), mengenakan seragam sesuai ketentuan, dan membawa kartu pelajar. Siswa yang belum menyelesaikan administrasi diminta menghubungi Tata Usaha paling lambat tiga hari sebelum pelaksanaan.',
        'Kisi-kisi dan materi tersedia pada menu Materi & Tugas di portal siswa. Selamat belajar dan semoga sukses.'], false, 845),
    B('b3', 'Pendaftaran Peserta Didik Baru (PPDB) 2027/2028 Gelombang 1 Resmi Dibuka', 'Pengumuman', -6,
      'Pendaftaran online dibuka melalui laman sekolah. Tersedia jalur zonasi, prestasi, afirmasi, dan perpindahan orang tua.',
      ['SMK Harapan Bangsa Cirebon membuka pendaftaran peserta didik baru tahun pelajaran 2027/2028 Gelombang 1. Seluruh proses dilakukan secara online melalui menu PPDB pada laman ini, mulai dari pengisian formulir hingga unggah berkas.',
        'Tersedia empat jalur: zonasi, prestasi, afirmasi, dan perpindahan orang tua. Calon peserta didik perlu menyiapkan pas foto, akta kelahiran, kartu keluarga, serta rapor atau surat keterangan lulus.',
        'Status pendaftaran dapat dipantau kapan saja menggunakan nomor pendaftaran dan NISN pada menu Cek Status.'], false, 1203),
    B('b4', 'Peringatan Hari Pahlawan: Upacara dan Lomba Baca Puisi Perjuangan', 'Berita', -11,
      'Seluruh warga sekolah mengikuti upacara bendera dan lomba baca puisi bertema keteladanan pahlawan.',
      ['SMK Harapan Bangsa memperingati Hari Pahlawan 10 November dengan upacara bendera yang diikuti seluruh siswa, guru, dan tenaga kependidikan. Bertindak sebagai pembina upacara, Wakil Kepala Sekolah Bidang Kesiswaan mengajak siswa meneladani semangat juang para pahlawan dalam bentuk belajar sungguh-sungguh.',
        'Usai upacara, OSIS menggelar lomba baca puisi perjuangan yang diikuti 24 peserta dari kelas X hingga XII. Juara pertama diraih siswa kelas X RPL 2 dengan penampilan yang membuat penonton larut dalam suasana.'], false, 321),
    B('b5', 'Tips Belajar Efektif Menjelang Ujian Akhir Semester', 'Artikel', -8,
      'Bagi waktu belajar, gunakan teknik pengulangan berjarak, dan jangan abaikan tidur. Berikut panduan singkat dari tim BK.',
      ['Menjelang ujian, banyak siswa terjebak belajar semalam suntuk. Padahal, penelitian tentang memori menunjukkan bahwa pengulangan berjarak (spaced repetition) jauh lebih efektif daripada belajar menumpuk di satu malam.',
        'Mulailah dengan membuat daftar materi dan menandai bagian yang paling sulit. Belajarlah dalam sesi 25–30 menit dengan jeda singkat, lalu uji dirimu dengan mengerjakan soal latihan tanpa melihat catatan.',
        'Jangan lupa tidur cukup 7–8 jam dan sarapan bergizi di hari ujian. Tubuh yang segar membantu otak mengingat dengan lebih baik. Bila merasa cemas berlebihan, tim Bimbingan Konseling siap membantu di ruang BK.'], false, 540),
    B('b6', 'Libur Akhir Semester dan Pembagian Raport', 'Pengumuman', -1,
      `Pembagian raport semester Ganjil dijadwalkan pada ${fmtTanggal(RAPORT, { hari: true })}.`,
      [`Pembagian raport semester Ganjil Tahun Pelajaran 2026/2027 dijadwalkan pada ${fmtTanggal(RAPORT, { hari: true })}. Raport dibagikan oleh wali kelas masing-masing dan dapat dilihat versi digitalnya di portal siswa.`,
        'Libur akhir semester dimulai setelah pembagian raport hingga dua minggu berikutnya. Kegiatan belajar mengajar semester Genap dimulai kembali sesuai kalender pendidikan.'], false, 260),
    B('b7', 'Pelatihan Guru: Pembelajaran Mendalam dan Asesmen Formatif', 'Berita', -15,
      'Seluruh guru mengikuti pelatihan dua hari untuk memperkuat praktik asesmen formatif di kelas.',
      ['Sebanyak 74 guru mengikuti pelatihan dua hari yang diselenggarakan di aula sekolah. Materi mencakup perancangan pembelajaran mendalam, asesmen formatif, serta pemanfaatan platform digital untuk umpan balik cepat kepada siswa.',
        'Pelatihan dipandu narasumber dari perguruan tinggi negeri di Cirebon. Peserta mempraktikkan langsung penyusunan rubrik dan instrumen asesmen untuk mata pelajaran masing-masing.'], false, 198),
    B('b8', 'Jumat Bersih dan Penanaman 200 Pohon di Lingkungan Sekolah', 'Berita', -20,
      'Kegiatan rutin Jumat Bersih kali ini ditutup dengan penanaman 200 bibit pohon peneduh dan buah.',
      ['Program Jumat Bersih edisi November melibatkan seluruh kelas dengan pembagian zona tanggung jawab. Selain membersihkan kelas dan selokan, siswa menanam 200 bibit pohon peneduh dan pohon buah di area belakang sekolah.',
        'Kegiatan ini bagian dari program Adiwiyata yang mendorong sekolah menjadi lingkungan yang bersih, hijau, dan sehat. Setiap kelas bertanggung jawab merawat pohon yang mereka tanam.'], false, 176),
    B('b9', 'Siswa Kami Lolos Seleksi Olimpiade Sains Tingkat Kota', 'Prestasi', -27,
      'Lima siswa lolos ke babak final olimpiade sains kota pada bidang Matematika, Fisika, dan Informatika.',
      ['Lima siswa SMK Harapan Bangsa dinyatakan lolos ke babak final Olimpiade Sains tingkat Kota Cirebon untuk bidang Matematika, Fisika, dan Informatika. Mereka terpilih dari lebih dari 300 peserta yang mengikuti seleksi tertulis.',
        'Pembinaan intensif dilakukan setiap Rabu dan Sabtu oleh guru pembimbing. Sekolah berharap para finalis mampu melaju ke tingkat provinsi.'], false, 289)
  ]);
  const G = (id, judul, kategori, jenis, off, deskripsi) => [id, { judul, kategori, jenis, tanggal: T(off), deskripsi, url: '' }];
  tree.galeri = Object.fromEntries([
    G('g1', 'Upacara Peringatan Hari Pahlawan', 'Upacara', 'foto', -11, 'Upacara bendera yang diikuti seluruh warga sekolah di lapangan utama.'),
    G('g2', 'Latihan Pramuka Penggalang', 'Ekstrakurikuler', 'foto', -9, 'Latihan rutin Pramuka setiap Jumat sore: tali-temali dan semaphore.'),
    G('g3', 'Praktikum Kimia: Titrasi Asam Basa', 'Akademik', 'foto', -13, 'Siswa kelas XI mempraktikkan titrasi di laboratorium kimia.'),
    G('g4', 'Final Basket Antarkelas', 'Olahraga', 'foto', -17, 'Pertandingan final yang berlangsung seru di lapangan basket.'),
    G('g5', 'Pentas Seni Akhir Tahun', 'Seni', 'foto', -30, 'Penampilan tari kolosal bertema budaya Cirebon.'),
    G('g6', 'Tim Robotik di Arena Kompetisi', 'Akademik', 'foto', -4, 'Persiapan akhir tim robotik sebelum babak final.'),
    G('g7', 'Literasi Pagi di Perpustakaan', 'Akademik', 'foto', -19, 'Gerakan literasi 15 menit sebelum jam pelajaran pertama.'),
    G('g8', 'Kegiatan Jumat Bersih', 'Kegiatan', 'foto', -20, 'Bergotong-royong membersihkan lingkungan dan menanam pohon.'),
    G('g9', 'Profil SMK Harapan Bangsa', 'Kegiatan', 'video', -40, 'Video profil singkat sekolah, fasilitas, dan kegiatan siswa.'),
    G('g10', 'Dokumentasi Pentas Seni', 'Seni', 'video', -30, 'Cuplikan penampilan terbaik Pentas Seni akhir tahun.'),
    G('g11', 'Latihan Paduan Suara', 'Seni', 'foto', -22, 'Persiapan paduan suara untuk acara wisuda dan upacara.'),
    G('g12', 'Class Meeting Futsal', 'Olahraga', 'foto', -33, 'Kemeriahan class meeting futsal antarkelas.')
  ]);

  /* ---------- Catatan wali kelas ---------- */
  tree.catatan_siswa = {};
  const CAT = [
    ['Akademik', 'Nilai Matematika turun dua periode berturut-turut. Perlu pendampingan belajar dan komunikasi dengan orang tua.', true],
    ['Perilaku', 'Aktif memimpin kelompok dan membantu teman saat praktik di laboratorium.', false],
    ['Kesehatan', 'Orang tua melaporkan sering izin kontrol rutin ke dokter; mohon dimaklumi bila terlambat.', true],
    ['Lainnya', 'Mengikuti seleksi lomba kompetensi siswa tingkat kota; perlu dispensasi latihan.', false],
    ['Akademik', 'Konsisten menyelesaikan tugas tepat waktu. Direkomendasikan mengikuti pengayaan.', false]
  ];
  siswa.forEach((s, i) => {
    if (i % 3 !== 0 && i !== DEMO_SISWA_INDEX + 1) return;
    const [kategori, teks, penting] = CAT[i % CAT.length], wali = tree.kelas[s.kelasId].wali;
    tree.catatan_siswa[s.uid] = { ['c' + (i + 1)]: { kategori, teks, penting, tanggal: T(-R(2, 20)), oleh: wali, namaOleh: tree.users[wali].nama } };
  });

  /* ---------- Pesan, PPDB ---------- */
  tree.pesan = {
    ps1: { nama: 'Ibu Marlina', email: 'marlina@example.com', subjek: 'Informasi biaya pendaftaran', isi: 'Selamat siang, apakah ada biaya pendaftaran untuk PPDB 2027/2028? Terima kasih.', tanggal: Date.now() - 2 * 864e5, dibaca: false },
    ps2: { nama: 'Bapak Rahmat', email: 'rahmat@example.com', subjek: 'Kunjungan sekolah', isi: 'Kami ingin berkunjung melihat fasilitas sekolah bersama anak. Kapan waktu yang tepat?', tanggal: Date.now() - 5 * 864e5, dibaca: true },
    ps3: { nama: 'Alumni 2019', email: 'alumni19@example.com', subjek: 'Legalisir ijazah', isi: 'Apakah legalisir ijazah bisa diambil hari Sabtu? Terima kasih.', tanggal: Date.now() - 9 * 864e5, dibaca: true }
  };
  const PP = [
    ['K7M3Q', 'Arumi Safitri', '0098765432', 'P', 'Zonasi', 'Diproses', 'SMP Negeri 3 Cirebon', -2],
    ['A9X2B', 'Raka Mahendra', '0098765433', 'L', 'Prestasi', 'Terverifikasi', 'SMP Negeri 1 Cirebon', -4],
    ['T4R8N', 'Nayla Khairunnisa', '0098765434', 'P', 'Afirmasi', 'Diterima', 'SMP Islam Al-Azhar', -9],
    ['P2D6W', 'Gilang Ramadhan', '0098765435', 'L', 'Zonasi', 'Diterima', 'SMP Negeri 5 Cirebon', -12],
    ['H5Z1C', 'Tasya Aulia', '0098765436', 'P', 'Perpindahan Orang Tua', 'Ditolak', 'SMP Negeri 2 Kuningan', -14],
    ['M8V4J', 'Daffa Alfarizi', '0098765437', 'L', 'Prestasi', 'Diproses', 'SMP Negeri 4 Cirebon', -1]
  ];
  tree.ppdb = {}; tree.ppdb_status = {}; tree.ppdb_berkas = {};
  PP.forEach(([kode, nama, nisn, jk, jalur, status, asal, off], i) => {
    const id = 'p' + (i + 1), noDaftar = `PPDB-2027-${kode}`, tanggal = Date.now() + off * 864e5;
    const catatan = status === 'Ditolak' ? 'Berkas Kartu Keluarga tidak terbaca dan kuota jalur sudah terpenuhi.' : status === 'Diterima' ? 'Selamat! Silakan daftar ulang pada jadwal yang telah ditentukan.' : status === 'Terverifikasi' ? 'Berkas lengkap. Menunggu pengumuman hasil seleksi.' : '';
    tree.ppdb[id] = { noDaftar, nama, nisn, jk, jalur, asalSekolah: asal, tempatLahir: 'Cirebon', tglLahir: `2011-0${(i % 9) + 1}-1${i}`, alamat: `Jl. Merdeka No. ${10 + i}, Kota Cirebon`, namaOrtu: `Bpk. ${pick(ortuNama)}`, hp: `0813${R(1000, 9999)}${R(1000, 9999)}`, status, catatan, tanggal };
    tree.ppdb_status[noDaftar] = { nama, nisn, status, catatan, jalur, tanggal };
    tree.ppdb_berkas[id] = { pasFoto: { nama: 'pas-foto.jpg', tipe: 'image/jpeg', ukuran: 84000 }, aktaLahir: { nama: 'akta-kelahiran.jpg', tipe: 'image/jpeg', ukuran: 132000 }, kartuKeluarga: { nama: 'kartu-keluarga.jpg', tipe: 'image/jpeg', ukuran: 141000 }, rapor: { nama: 'rapor-smp.pdf', tipe: 'application/pdf', ukuran: 260000 } };
  });

  return { tree, accounts, demo: { siswa: demo.nisn, guru: GURU[4].nip, admin: 'admin' } };
}
