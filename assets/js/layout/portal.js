/* layout/portal.js — kerangka portal (sidebar, topbar, bottom-nav) untuk siswa/guru/admin */
import { requireRole, logout, ROLE_LABEL, changePassword } from '../core/auth.js';
import { db } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, initials, $ } from '../core/utils.js';
import { modal, toast, eyeToggle } from '../core/ui.js';

const MENUS = {
  siswa: [['index', 'Dashboard', 'home', 'siswa/index.html'], ['jadwal', 'Jadwal Pelajaran', 'calendar', 'siswa/jadwal.html'], ['tugas', 'Materi & Tugas', 'book-open', 'siswa/tugas.html'], ['nilai', 'Nilai & Raport', 'chart', 'siswa/nilai.html'], ['absensi', 'Absensi', 'qr', 'siswa/absensi.html'], ['kartu', 'Kartu Pelajar & Profil', 'id-card', 'siswa/kartu.html']],
  guru: [['index', 'Dashboard Wali Kelas', 'home', 'guru/index.html'], ['murid', 'Murid Kelas', 'users', 'guru/murid.html'], ['absensi', 'Absensi Kelas', 'user-check', 'guru/absensi.html'], ['materi', 'Materi & Tugas', 'book-open', 'guru/materi.html'], ['nilai', 'Input Nilai', 'clipboard', 'guru/nilai.html'], ['profil', 'Profil Saya', 'user', 'guru/profil.html']],
  admin: [['index', 'Dashboard', 'home', 'admin/index.html'], ['berita', 'Berita & Pengumuman', 'newspaper', 'admin/berita.html'], ['galeri', 'Galeri', 'image', 'admin/galeri.html'], ['ppdb', 'PPDB', 'user-plus', 'admin/ppdb.html'], ['pengguna', 'Pengguna & Akses', 'users', 'admin/pengguna.html'], ['akademik', 'Data Master & Jadwal', 'layers', 'admin/akademik.html'], ['absensi', 'Absensi Harian', 'user-check', 'admin/absensi.html'], ['laporan', 'Laporan & Ekspor', 'download', 'admin/laporan.html'], ['pesan', 'Pesan Masuk', 'mail', 'admin/pesan.html'], ['pengaturan', 'Pengaturan', 'settings', 'admin/pengaturan.html']]
};
const BNAV = [['index', 'Beranda', 'home'], ['jadwal', 'Jadwal', 'calendar'], ['absensi', 'Absen', 'qr'], ['tugas', 'Tugas', 'book-open'], ['nilai', 'Nilai', 'chart']];

/** @returns {{user, el, settings}} el = elemen konten utama */
export async function mountPortal({ role, active, title, sub = '' }) {
  const user = await requireRole([role]);
  const settings = (await db.get('pengaturan')) || {};
  const menu = MENUS[role];
  const nav = menu.map(([k, t, i, h]) => `<a class="nl ${k === active ? 'active' : ''}" href="${url(h)}" data-k="${k}">${icon(i)}<span>${t}</span></a>`).join('');
  const kiosk = `<a class="nl" href="${url('gerbang.html')}" target="_blank" rel="noopener">${icon('monitor')}<span>Layar QR Gerbang</span>${icon('external', 14)}</a>`;
  const extra = role === 'guru' ? `<div class="side-label">Pintasan</div>${kiosk}<a class="nl" href="${url('index.html')}" target="_blank" rel="noopener">${icon('globe')}<span>Situs Sekolah</span></a>` : role === 'admin' ? `<div class="side-label">Pintasan</div>${kiosk}<a class="nl" href="${url('index.html')}" target="_blank" rel="noopener">${icon('globe')}<span>Lihat Situs Publik</span></a>` : `<div class="side-label">Sekolah</div><a class="nl" href="${url('index.html')}" target="_blank" rel="noopener">${icon('globe')}<span>Situs Sekolah</span></a>`;
  const sh = $('#shell');
  sh.className = 'shell';
  sh.innerHTML = `<aside class="side" id="side"><a class="brand" href="${url('index.html')}"><span class="brand-mark">${icon('graduation')}</span><span><b>${esc(settings.singkat || 'Sekolah')}</b><small>Portal ${ROLE_LABEL[role]}</small></span></a>
    <div class="side-label">Menu</div>${nav}${extra}
    <div class="side-foot"><div class="side-user"><div class="avatar avatar-sm">${esc(initials(user.nama))}</div><div class="grow" style="min-width:0"><b class="truncate">${esc(user.nama)}</b><small>${ROLE_LABEL[role]}</small></div></div></div></aside>
  <div class="scrim" id="scrim"></div>
  <div class="main-col"><header class="topbar"><button class="menu-btn" id="menuBtn" aria-label="Menu">${icon('menu', 22)}</button><div><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
    <div class="top-actions"><div class="user-chip" id="uchip" tabindex="0" role="button" aria-haspopup="menu"><div class="avatar avatar-sm">${esc(initials(user.nama))}</div><span class="nm truncate">${esc(user.nama)}</span>${icon('chevron-down', 16)}</div></div></header>
    <main class="content" id="content"></main></div>
  ${role === 'siswa' ? `<nav class="bnav" aria-label="Navigasi bawah">${BNAV.map(([k, t, i]) => `<a href="${url('siswa/' + (k === 'index' ? 'index' : k) + '.html')}" class="${k === active ? 'active' : ''} ${k === 'absensi' ? 'center' : ''}">${k === 'absensi' ? `<span class="fab">${icon(i, 24)}</span>` : icon(i)}<span>${t}</span></a>`).join('')}</nav>` : ''}`;
  document.title = `${title} — ${settings.singkat || 'Portal'}`;

  const side = $('#side'), scrim = $('#scrim');
  const tog = (on) => { side.classList.toggle('open', on); scrim.classList.toggle('on', on); };
  $('#menuBtn').onclick = () => tog(!side.classList.contains('open')); scrim.onclick = () => tog(false);

  const chip = $('#uchip');
  chip.onclick = (e) => {
    e.stopPropagation(); const old = chip.querySelector('.user-menu'); if (old) return old.remove();
    const m = document.createElement('div'); m.className = 'user-menu';
    m.innerHTML = `${role !== 'admin' ? `<a href="${url(role === 'siswa' ? 'siswa/kartu.html' : 'guru/profil.html')}">${icon('user')}Profil saya</a>` : ''}<button data-a="pw">${icon('key')}Ganti kata sandi</button><button data-a="out">${icon('log-out')}Keluar</button>`;
    m.onclick = (ev) => { const b = ev.target.closest('[data-a]'); if (!b) return; ev.stopPropagation(); m.remove(); b.dataset.a === 'out' ? logout() : pwModal(); };
    chip.appendChild(m);
  };
  document.addEventListener('click', () => chip.querySelector('.user-menu')?.remove());

  if (role === 'admin') badges();
  return { user, settings, el: $('#content') };
}

function badges() {
  const put = (k, n) => { const a = document.querySelector(`.side a[data-k="${k}"]`); if (!a) return; a.querySelector('.pill')?.remove(); if (n) a.insertAdjacentHTML('beforeend', `<span class="pill">${n}</span>`); };
  db.listen('pesan', (v) => put('pesan', Object.values(v || {}).filter((p) => !p.dibaca).length));
  db.listen('ppdb', (v) => put('ppdb', Object.values(v || {}).filter((p) => p.status === 'Diproses').length));
}

function pwModal() {
  modal({ title: 'Ganti kata sandi', size: 'sm', body: `<div class="field"><label>Kata sandi lama</label><div class="input-group"><input class="input" id="o" type="password" autocomplete="current-password"></div></div><div class="field"><label>Kata sandi baru</label><div class="input-group"><input class="input" id="n" type="password" autocomplete="new-password"><button type="button" class="toggle-eye">${icon('eye', 18)}</button></div><span class="hint">Minimal 6 karakter.</span></div><div class="field"><label>Ulangi kata sandi baru</label><input class="input" id="n2" type="password" autocomplete="new-password"></div>`,
    onMount: (m) => eyeToggle(m.el),
    actions: [{ label: 'Batal' }, { label: 'Simpan', kind: 'primary', keepOpen: true, onClick: async (m) => { const v = (id) => m.el.querySelector('#' + id).value; if (v('n') !== v('n2')) throw new Error('Pengulangan kata sandi tidak sama.'); await changePassword(v('o'), v('n')); toast('Kata sandi berhasil diganti.', 'ok'); m.close(); } }] });
}
