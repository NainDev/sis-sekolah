import { db, toList } from '../core/db.js';
import { mountPublic, pageHero, reveal } from '../layout/public.js';
import { icon } from '../core/icons.js';
import { esc, url, art, fmtTanggal, qs, sortBy, debounce } from '../core/utils.js';
import { empty } from '../core/ui.js';

await mountPublic('berita');
const app = document.getElementById('app');
const KAT = ['Semua', 'Berita', 'Pengumuman', 'Artikel', 'Prestasi'];
let all = [], kat = 'Semua', q = '';

const id = qs('id');
if (id) {
  db.listen('berita/' + id, (b) => {
    if (!b) { app.innerHTML = pageHero('Berita tidak ditemukan', 'Berita yang Anda cari mungkin sudah dihapus.') + `<section class="sec"><div class="wrap-w">${empty('newspaper', 'Tidak ada data', '', `<a class="btn btn-primary mt-2" href="${url('berita.html')}">Kembali ke daftar</a>`)}</div></section>`; return; }
    document.title = b.judul;
    app.innerHTML = `<section class="page-hero" style="padding-bottom:40px"><div class="wrap-w"><div class="crumb"><a href="${url('index.html')}">Beranda</a>${icon('chevron-right', 14)}<a href="${url('berita.html')}">Berita</a>${icon('chevron-right', 14)}<span>${esc(b.kategori)}</span></div></div></section>
    <section class="sec" style="padding-top:0"><div class="wrap-w"><article class="article" style="margin-top:-8px"><div class="cover"><img src="${art(id + b.judul, { w: 1200, h: 600 })}" alt=""></div>
    <span class="badge b-info">${esc(b.kategori)}</span><h1>${esc(b.judul)}</h1><div class="meta"><span class="flex items-center gap-1">${icon('calendar', 16)}${fmtTanggal(b.tanggal, { hari: true })}</span><span class="flex items-center gap-1">${icon('user', 16)}${esc(b.penulis)}</span><span class="flex items-center gap-1">${icon('eye', 16)}${b.dilihat || 0}x dilihat</span></div>
    <div class="prose">${String(b.isi || '').split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="divider mt-4"></div><a class="btn btn-ghost" href="${url('berita.html')}">${icon('arrow-left')}Kembali ke daftar berita</a></article></div></section>`;
  });
  sessionStorage.getItem('v_' + id) || (sessionStorage.setItem('v_' + id, 1), db.get('berita/' + id + '/dilihat').then((n) => db.set('berita/' + id + '/dilihat', (n || 0) + 1).catch(() => {})));
} else {
  app.innerHTML = pageHero('Berita, Artikel & Pengumuman', 'Kabar terbaru dari lingkungan sekolah, prestasi siswa, dan informasi penting lainnya.', 'Berita') + `<section class="sec"><div class="wrap-w"><div class="toolbar"><div class="chips" id="chips"></div><div class="input-group">${icon('search')}<input class="input" id="q" type="search" placeholder="Cari judul atau isi berita…"></div></div><div class="news-grid" id="grid"></div></div></section>`;
  const chips = document.getElementById('chips');
  const draw = () => {
    chips.innerHTML = KAT.map((k) => `<button class="chip ${k === kat ? 'active' : ''}" data-k="${k}">${k}</button>`).join('');
    const t = q.toLowerCase();
    const list = all.filter((b) => (kat === 'Semua' || b.kategori === kat) && (!t || (b.judul + ' ' + b.ringkasan + ' ' + b.isi).toLowerCase().includes(t)));
    document.getElementById('grid').innerHTML = list.length ? list.map((b) => `<a class="news reveal" href="${url('berita.html')}?id=${b.id}"><div class="thumb"><img loading="lazy" src="${art(b.id + b.judul)}" alt=""><span class="badge">${esc(b.kategori)}</span></div><div class="body"><div class="meta">${icon('calendar', 14)}${fmtTanggal(b.tanggal)}</div><h3>${esc(b.judul)}</h3><p>${esc(b.ringkasan)}</p><span class="more">Baca selengkapnya${icon('arrow-right', 16)}</span></div></a>`).join('') : `<div style="grid-column:1/-1">${empty('search', 'Tidak ada hasil', 'Coba kata kunci atau kategori lain.')}</div>`;
    reveal();
  };
  chips.onclick = (e) => { const b = e.target.closest('.chip'); if (b) { kat = b.dataset.k; draw(); } };
  document.getElementById('q').oninput = debounce((e) => { q = e.target.value.trim(); draw(); }, 200);
  db.listen('berita', (v) => { all = sortBy(toList(v), 'tanggal', -1); draw(); });
}
