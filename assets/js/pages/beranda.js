import { db, toList } from '../core/db.js';
import { mountPublic, reveal } from '../layout/public.js';
import { icon } from '../core/icons.js';
import { esc, url, art, fmtTanggal, fmtNum, initials, sortBy } from '../core/utils.js';

const s = await mountPublic('beranda');
const app = document.getElementById('app');
const st = (await db.get('statistik')) || {};
const FITUR = [
  ['graduation', 'Kurikulum Merdeka', 'Pembelajaran berdiferensiasi dengan penguatan literasi, numerasi, dan karakter.'],
  ['qr', 'Absensi QR di Gerbang', 'Siswa cukup memindai QR dinamis di gerbang; status hadir atau terlambat tercatat otomatis.'],
  ['monitor', 'Portal Belajar Digital', 'Jadwal, materi, tugas, nilai, dan raport digital dalam satu tempat.'],
  ['trophy', 'Ekstrakurikuler Beragam', `${st.ekskul || 24} kegiatan dari robotik, pramuka, paduan suara, hingga olahraga.`]
];
app.innerHTML = `
<section class="hero"><div class="grain"></div><div class="wrap-w hero-in">
  <div>
    <span class="eyebrow"><i></i>${s.ppdbBuka ? `PPDB ${esc(s.ppdbTahun)} ${esc(s.ppdbGelombang)} dibuka` : 'Tahun Ajaran ' + esc(s.tahunAjaran)}</span>
    <h1>${esc(s.nama)}</h1>
    <p class="lead">${esc(s.slogan)}. Tempat tumbuhnya generasi yang cerdas, berkarakter, dan siap menghadapi masa depan, berakar pada budaya Cirebon.</p>
    <div class="hero-cta">
      <a class="btn btn-white btn-lg" href="${url('ppdb.html')}">${icon('user-plus')}Daftar Siswa Baru</a>
      <a class="btn btn-glass btn-lg" href="${url('profil.html')}">Kenali Sekolah Kami${icon('arrow-right')}</a>
    </div>
  </div>
  <aside class="hero-card"><h3>${icon('megaphone', 18)}Pengumuman Terbaru</h3><div class="hero-list" id="heroList"></div></aside>
</div></section>
<section class="stats"><div class="wrap-w"><div class="stats-in">
  ${[['users', st.siswa, 'Siswa aktif'], ['user-check', st.guru, 'Guru & tenaga pendidik'], ['award', st.prestasi, 'Prestasi tahun ini'], ['trophy', st.ekskul, 'Ekstrakurikuler']].map(([i, n, l]) => `<div class="stat"><div class="ico">${icon(i)}</div><div><b data-count="${n || 0}">0</b><span>${l}</span></div></div>`).join('')}
</div></div></section>
<section class="sec"><div class="wrap-w"><div class="welcome reveal">
  <figure class="kepsek"><span class="mono">${esc(initials(s.kepsek?.nama))}</span><figcaption><b>${esc(s.kepsek?.nama)}</b>${esc(s.kepsek?.jabatan)}</figcaption></figure>
  <div><div class="sec-head" style="margin-bottom:18px"><span class="kicker">Sambutan Kepala Sekolah</span><h2>Selamat datang di keluarga besar Harapan Bangsa</h2></div>
  <blockquote><div class="qmark">“</div>${(s.kepsek?.sambutan || []).map((p) => `<p>${esc(p)}</p>`).join('')}</blockquote>
  <div class="mt-3"><a class="btn btn-soft" href="${url('profil.html')}">Profil lengkap sekolah${icon('arrow-right')}</a></div></div>
</div></div></section>
<section class="sec alt"><div class="wrap-w"><div class="sec-head center reveal"><span class="kicker">Keunggulan</span><h2>Belajar nyaman dengan layanan yang modern</h2><p>Kami memadukan pembelajaran bermakna dengan teknologi agar proses belajar lebih mudah diikuti siswa dan orang tua.</p></div>
  <div class="grid g-4">${FITUR.map(([i, t, d]) => `<div class="feat reveal"><div class="ico">${icon(i)}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
<section class="sec"><div class="wrap-w"><div class="sec-row reveal"><div class="sec-head"><span class="kicker">Kabar Sekolah</span><h2>Berita & pengumuman terbaru</h2></div><a class="btn btn-ghost" href="${url('berita.html')}">Lihat semua${icon('arrow-right')}</a></div>
  <div class="news-grid" id="newsGrid"><div class="skeleton" style="height:260px;grid-column:span 3"></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap-w"><div class="cta reveal"><div><h2>${s.ppdbBuka ? `Pendaftaran siswa baru ${esc(s.ppdbTahun)} sudah dibuka` : 'Bergabunglah bersama kami'}</h2><p>Daftar online dari rumah, unggah berkas, dan pantau status pendaftaran kapan saja. Kuota ${fmtNum(s.ppdbKuota || 0)} kursi, ditutup ${esc(fmtTanggal(s.ppdbTutup))}.</p></div><a class="btn btn-white btn-lg" href="${url('ppdb.html')}">${icon('user-plus')}Daftar Sekarang</a></div></div></section>`;

document.querySelectorAll('[data-count]').forEach((el) => {
  const to = +el.dataset.count, t0 = performance.now();
  const f = (t) => { const p = Math.min(1, (t - t0) / 1100); el.textContent = fmtNum(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});

const card = (b, feature) => `<a class="news reveal ${feature ? 'feature' : ''}" href="${url('berita.html')}?id=${b.id}"><div class="thumb"><img loading="lazy" src="${art(b.id + b.judul)}" alt=""><span class="badge">${esc(b.kategori)}</span></div><div class="body"><div class="meta">${icon('calendar', 14)}${fmtTanggal(b.tanggal)}</div><h3>${esc(b.judul)}</h3><p>${esc(b.ringkasan)}</p><span class="more">Baca selengkapnya${icon('arrow-right', 16)}</span></div></a>`;
db.listen('berita', (v) => {
  const list = sortBy(toList(v), 'tanggal', -1);
  const pin = list.find((b) => b.pinned) || list[0];
  const rest = list.filter((b) => b !== pin).slice(0, 3);
  document.getElementById('newsGrid').innerHTML = pin ? card(pin, true) + rest.map((b) => card(b)).join('') : '<p class="muted">Belum ada berita.</p>';
  const peng = list.filter((b) => b.kategori === 'Pengumuman').slice(0, 3);
  document.getElementById('heroList').innerHTML = peng.map((b) => `<a class="hero-item" href="${url('berita.html')}?id=${b.id}"><span class="ico">${icon('bell', 18)}</span><span><b>${esc(b.judul)}</b><small>${fmtTanggal(b.tanggal, { singkat: true })}</small></span></a>`).join('') || '<p style="opacity:.8">Belum ada pengumuman.</p>';
  reveal();
});
reveal();
