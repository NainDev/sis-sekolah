import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, dateKey, fmtTanggal, sapaan, addDays, HARI, sortBy, round1 } from '../core/utils.js';
import { badge, empty, statusBadge } from '../core/ui.js';

const { user, settings, el } = await mountPortal({ role: 'admin', active: 'index', title: 'Dashboard Admin', sub: `Tahun ajaran ${(await db.get('pengaturan/tahunAjaran')) || ''}` });
const S = { users: [], ppdb: [], pesan: [], hari: {} };
const today = dateKey();
const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6)).filter((d) => d.getDay() % 6 !== 0 || false);

function render() {
  const siswa = S.users.filter((u) => u.role === 'siswa'), guru = S.users.filter((u) => u.role === 'guru');
  const hr = Object.values(S.hari[today] || {}), hadir = hr.filter((x) => x.status === 'hadir' || x.status === 'terlambat').length;
  const baru = S.ppdb.filter((p) => p.status === 'Diproses'), unread = S.pesan.filter((p) => !p.dibaca);
  const chart = days.map((d) => { const k = dateKey(d), rows = Object.values(S.hari[k] || {}), h = rows.filter((x) => x.status === 'hadir' || x.status === 'terlambat').length, p = siswa.length ? Math.round((h / siswa.length) * 100) : 0; return { k, d, p, has: rows.length > 0 }; });
  el.innerHTML = `<div class="stack"><div class="greet"><div><h2>${sapaan()}, ${esc(user.nama.split(',')[0])}</h2><p>${HARI[new Date().getDay()]}, ${fmtTanggal(today)} · ${esc(settings.nama)}</p></div><a class="btn btn-white btn-lg" href="${url('gerbang.html')}" target="_blank" rel="noopener">${icon('qr')}Buka Layar QR Gerbang</a></div>
  <div class="grid g-4"><div class="tile"><div class="ico">${icon('users')}</div><div><b>${siswa.length}</b><span>Siswa terdaftar (akun)</span></div></div><div class="tile"><div class="ico vio">${icon('user-check')}</div><div><b>${guru.length}</b><span>Guru</span></div></div><div class="tile"><div class="ico ok">${icon('check-circle')}</div><div><b>${hadir}/${siswa.length}</b><span>Hadir hari ini</span></div></div><div class="tile"><div class="ico warn">${icon('user-plus')}</div><div><b>${baru.length}</b><span>Pendaftar PPDB baru</span></div></div></div>
  <div class="dash-grid"><div class="stack"><div class="card"><div class="card-head"><h3>Kehadiran 7 hari terakhir</h3><a class="btn btn-soft btn-sm" href="${url('admin/absensi.html')}">Rekap</a></div><div class="mini-bars" style="margin-bottom:28px;padding-top:22px">${chart.map((c) => `<div style="height:${Math.max(4, c.p)}%;${c.has ? '' : 'opacity:.3'}"><i>${c.has ? c.p + '%' : '–'}</i><span>${HARI[c.d.getDay()].slice(0, 3)} ${c.d.getDate()}</span></div>`).join('')}</div></div>
  <div class="card"><div class="card-head"><h3>Pendaftar PPDB terbaru</h3><a class="btn btn-soft btn-sm" href="${url('admin/ppdb.html')}">Kelola</a></div>${S.ppdb.length ? `<div class="table-wrap"><table class="table"><tbody>${sortBy(S.ppdb, 'tanggal', -1).slice(0, 5).map((p) => `<tr><td><b style="font-weight:500">${esc(p.nama)}</b><div class="small muted">${esc(p.noDaftar)} · ${esc(p.jalur)}</div></td><td class="right">${badge(p.status, p.status === 'Diterima' ? 'ok' : p.status === 'Ditolak' ? 'err' : p.status === 'Terverifikasi' ? 'info' : 'warn')}</td></tr>`).join('')}</tbody></table></div>` : empty('user-plus', 'Belum ada pendaftar', '')}</div></div>
  <div class="stack"><div class="card"><div class="card-head"><h3>Pesan masuk ${unread.length ? badge(unread.length + ' baru', 'err') : ''}</h3><a class="btn btn-soft btn-sm" href="${url('admin/pesan.html')}">Buka</a></div><div class="list">${S.pesan.length ? sortBy(S.pesan, 'tanggal', -1).slice(0, 3).map((p) => `<a class="item-card" href="${url('admin/pesan.html')}"><div class="ico">${icon('mail')}</div><div class="grow"><h4 style="font-size:14px;${p.dibaca ? 'font-weight:400' : ''}">${esc(p.subjek)}</h4><div class="meta"><span>${esc(p.nama)}</span><span>${new Date(p.tanggal).toLocaleDateString('id-ID')}</span></div></div></a>`).join('') : '<p class="small muted">Belum ada pesan.</p>'}</div></div>
  <div class="card"><div class="card-head"><h3>Pintasan</h3></div><div class="list">${[['newspaper', 'Tulis berita', 'admin/berita.html'], ['users', 'Tambah pengguna', 'admin/pengguna.html'], ['layers', 'Atur jadwal', 'admin/akademik.html'], ['settings', 'Pengaturan sekolah', 'admin/pengaturan.html']].map(([i, t, h]) => `<a class="item-card" href="${url(h)}"><div class="ico">${icon(i)}</div><div class="grow"><h4 style="font-size:14.5px">${t}</h4></div>${icon('chevron-right')}</a>`).join('')}</div></div></div></div></div>`;
}
render();
db.listen('ppdb', (v) => { S.ppdb = toList(v); render(); });
db.listen('pesan', (v) => { S.pesan = toList(v); render(); });
db.listen('absensi_hari', (v) => { S.hari = v || {}; render(); });
S.users = toList(await db.get('users')); render();
