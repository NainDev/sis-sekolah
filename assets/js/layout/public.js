/* layout/public.js — navbar kaca + footer untuk semua halaman publik */
import { db } from '../core/db.js';
import { initAuth, homeFor, ROLE_LABEL } from '../core/auth.js';
import { icon } from '../core/icons.js';
import { url, esc, $, $$ } from '../core/utils.js';

export const MENU = [
  { k: 'beranda', t: 'Beranda', h: 'index.html', i: 'home' },
  { k: 'profil', t: 'Profil', h: 'profil.html', i: 'building' },
  { k: 'berita', t: 'Berita', h: 'berita.html', i: 'newspaper' },
  { k: 'galeri', t: 'Galeri', h: 'galeri.html', i: 'image' },
  { k: 'ppdb', t: 'PPDB', h: 'ppdb.html', i: 'user-plus' },
  { k: 'kontak', t: 'Kontak', h: 'kontak.html', i: 'map-pin' }
];

export async function mountPublic(active) {
  const [cfg, user] = await Promise.all([db.get('pengaturan').catch(() => null), initAuth().catch(() => null)]);
  const s = cfg || {};
  const nama = s.singkat || 'Sekolah';
  const masuk = user
    ? `<a class="btn btn-primary" href="${homeFor(user.role)}">${icon('grid')}Portal ${esc(ROLE_LABEL[user.role])}</a>`
    : `<a class="btn btn-soft" href="${url('login.html')}">${icon('log-in')}Masuk</a><a class="btn btn-primary" href="${url('ppdb.html')}">Daftar PPDB</a>`;
  const links = MENU.map((m) => `<a href="${url(m.h)}" class="${m.k === active ? 'active' : ''}">${m.t}</a>`).join('');
  const dl = MENU.map((m) => `<a class="dl ${m.k === active ? 'active' : ''}" href="${url(m.h)}">${icon(m.i)}${m.t}</a>`).join('');

  $('#nav').innerHTML = `<header class="nav" id="navbar"><div class="wrap-w nav-in">
    <a class="brand" href="${url('index.html')}"><span class="brand-mark">${icon('graduation')}</span><span><b>${esc(nama)}</b><small>${esc(s.slogan || '')}</small></span></a>
    <nav class="nav-links" aria-label="Navigasi utama">${links}</nav>
    <div class="nav-cta">${masuk}</div>
    <button class="burger" id="burger" aria-label="Buka menu">${icon('menu', 22)}</button></div></header>
    <div class="drawer" id="drawer">${dl}${user ? `<a class="btn btn-primary btn-lg" href="${homeFor(user.role)}">Portal ${esc(ROLE_LABEL[user.role])}</a>` : `<a class="btn btn-soft btn-lg" href="${url('login.html')}">Masuk Portal</a><a class="btn btn-primary btn-lg" href="${url('ppdb.html')}">Daftar PPDB</a>`}</div>`;

  $('#foot').innerHTML = `<footer class="foot"><div class="wrap-w"><div class="foot-grid">
    <div><a class="brand" href="${url('index.html')}"><span class="brand-mark">${icon('graduation')}</span><span><b>${esc(s.nama || nama)}</b><small>NPSN ${esc(s.npsn || '-')}</small></span></a><p>${esc(s.slogan || '')}. Sistem informasi sekolah untuk layanan yang transparan dan mudah diakses.</p></div>
    <div><h4>Menu</h4>${MENU.map((m) => `<a href="${url(m.h)}">${m.t}</a>`).join('')}</div>
    <div><h4>Portal</h4><a href="${url('login.html')}">Masuk Siswa</a><a href="${url('login.html')}">Masuk Guru</a><a href="${url('login.html')}">Masuk Admin / TU</a><a href="${url('ppdb.html#status')}">Cek Status PPDB</a></div>
    <div><h4>Hubungi Kami</h4><div class="li">${icon('map-pin', 16)}<span>${esc(s.alamat || '')}</span></div><div class="li">${icon('phone', 16)}<span>${esc(s.telp || '')}</span></div><div class="li">${icon('mail', 16)}<span>${esc(s.email || '')}</span></div></div>
  </div><div class="foot-bottom"><span>© ${new Date().getFullYear()} ${esc(s.nama || nama)}. Seluruh hak cipta dilindungi.</span><span>Tahun Ajaran ${esc(s.tahunAjaran || '')}</span></div></div></footer>`;

  const nb = $('#navbar'); const onS = () => nb.classList.toggle('scrolled', scrollY > 10); onS(); addEventListener('scroll', onS, { passive: true });
  $('#burger').onclick = () => { const d = $('#drawer'); d.classList.toggle('open'); document.body.style.overflow = d.classList.contains('open') ? 'hidden' : ''; };
  document.title = `${document.title.split(' — ')[0]} — ${s.nama || nama}`;
  reveal();
  return s;
}

export function reveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
}

export const pageHero = (title, desc, crumb) => `<section class="page-hero"><div class="wrap-w"><div class="crumb"><a href="${url('index.html')}">Beranda</a>${icon('chevron-right', 14)}<span>${esc(crumb || title)}</span></div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div></section>`;
