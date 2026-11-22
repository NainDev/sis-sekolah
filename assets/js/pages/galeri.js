import { db, toList } from '../core/db.js';
import { mountPublic, pageHero, reveal } from '../layout/public.js';
import { icon } from '../core/icons.js';
import { esc, art, fmtTanggal, sortBy } from '../core/utils.js';
import { empty, modal } from '../core/ui.js';

await mountPublic('galeri');
document.getElementById('app').innerHTML = pageHero('Galeri Foto & Video', 'Dokumentasi kegiatan sekolah dan ekstrakurikuler.', 'Galeri') + `<section class="sec"><div class="wrap-w"><div class="toolbar"><div class="chips" id="chips"></div><div class="tabs" id="jenis"></div></div><div class="gallery" id="gal"></div></div></section>`;
let all = [], kat = 'Semua', jenis = 'semua';
const src = (g, w = 800, h = 520) => (g.url && g.jenis === 'foto' ? g.url : art(g.id + g.judul, { w, h: g.jenis === 'video' ? 450 : h }));
const ytId = (u) => { const m = String(u || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : null; };
function draw() {
  const cats = ['Semua', ...new Set(all.map((g) => g.kategori))];
  document.getElementById('chips').innerHTML = cats.map((k) => `<button class="chip ${k === kat ? 'active' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('');
  document.getElementById('jenis').innerHTML = [['semua', 'Semua'], ['foto', 'Foto'], ['video', 'Video']].map(([k, t]) => `<button class="tab ${k === jenis ? 'active' : ''}" data-k="${k}">${t}</button>`).join('');
  const list = all.filter((g) => (kat === 'Semua' || g.kategori === kat) && (jenis === 'semua' || g.jenis === jenis));
  document.getElementById('gal').innerHTML = list.length ? list.map((g, i) => `<button class="g-item reveal" data-i="${i}" aria-label="${esc(g.judul)}"><img loading="lazy" src="${src(g, 800, [520, 640, 440][i % 3])}" alt="${esc(g.judul)}"><span class="tag">${esc(g.kategori)}</span>${g.jenis === 'video' ? `<span class="play">${icon('play', 22)}</span>` : ''}<span class="cap">${esc(g.judul)}<small>${fmtTanggal(g.tanggal)}</small></span></button>`).join('') : empty('image', 'Belum ada dokumentasi', 'Coba pilih kategori lain.');
  document.getElementById('gal').onclick = (e) => { const b = e.target.closest('.g-item'); if (b) open(list, +b.dataset.i); };
  reveal();
}
function open(list, i) {
  const g = list[i], yt = g.jenis === 'video' && ytId(g.url);
  modal({ title: g.judul, size: 'lg', body: `<div class="lightbox"><div class="stage">${yt ? `<iframe src="https://www.youtube.com/embed/${yt}" allowfullscreen></iframe>` : `<img src="${src(g, 1200, 800)}" alt="">`}${list.length > 1 ? `<button class="nav-btn prev" data-d="-1">${icon('chevron-left')}</button><button class="nav-btn next" data-d="1">${icon('chevron-right')}</button>` : ''}</div><div><span class="badge b-info">${esc(g.kategori)}</span> <span class="small muted">${fmtTanggal(g.tanggal)}</span><p class="mt-1">${esc(g.deskripsi)}</p>${g.jenis === 'video' && !yt ? '<p class="small muted mt-1">Video ini belum memiliki tautan YouTube. Admin dapat menambahkannya dari menu Kelola Galeri.</p>' : ''}</div></div>`,
    onMount: (m) => { m.el.querySelectorAll('.nav-btn').forEach((b) => b.onclick = () => { m.close(); open(list, (i + +b.dataset.d + list.length) % list.length); }); } });
}
document.getElementById('chips').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { kat = b.dataset.k; draw(); } };
document.getElementById('jenis').onclick = (e) => { const b = e.target.closest('.tab'); if (b) { jenis = b.dataset.k; draw(); } };
db.listen('galeri', (v) => { all = sortBy(toList(v), 'tanggal', -1); draw(); });
