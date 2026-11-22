import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, dateKey, fmtTanggal, sapaan, sortBy, sisaWaktu, warnaMapel, round1, avg, HARI } from '../core/utils.js';
import { loadRef, jadwalHari, hariSekolahBerikut, statusJam, statusTugas, STATUS_TUGAS, rekapNilai } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { statusBadge, badge, empty } from '../core/ui.js';
import { APP } from '../config.js';

const { user, settings, el } = await mountPortal({ role: 'siswa', active: 'index', title: 'Dashboard', sub: `Tahun ajaran ${(await db.get('pengaturan/tahunAjaran')) || ''}` });
const ref = await loadRef();
const kelas = ref.kelas[user.kelasId] || { nama: '-' };
const S = { jadwal: null, tugas: [], kumpul: {}, absensi: {}, berita: [], nilai: {} };
const todayKey = dateKey();

function render() {
  const now = new Date(), isSekolah = now.getDay() >= 1 && now.getDay() <= 5;
  const hari = isSekolah ? now : hariSekolahBerikut(now);
  const lessons = jadwalHari(S.jadwal, hari.getDay());
  const abs = Object.entries(S.absensi);
  const bulanIni = rekap(abs.filter(([k]) => k.slice(0, 7) === todayKey.slice(0, 7)).map(([, v]) => v));
  const all = rekap(abs.map(([, v]) => v));
  const hariIni = S.absensi[todayKey];
  const todo = S.tugas.map((t) => ({ ...t, st: statusTugas(t, S.kumpul[t.id]) })).filter((t) => t.st === 'belum' || t.st === 'terlambat').sort((a, b) => a.tenggat.localeCompare(b.tenggat));
  const sem = rekapNilai(S.nilai, settings.semesterKey).filter((x) => x.akhir != null);
  const rata = sem.length ? round1(avg(sem.map((x) => x.akhir))) : null;
  const peng = sortBy(S.berita, 'tanggal', -1).filter((b) => b.kategori === 'Pengumuman' || b.pinned).slice(0, 3);

  el.innerHTML = `
  <div class="stack">
  <div class="greet"><div><h2>${sapaan()}, ${esc(user.nama.split(' ')[0])}!</h2><p>${HARI[now.getDay()]}, ${fmtTanggal(todayKey)}</p>
    <div class="gchips"><span>${icon('users', 14)}Kelas ${esc(kelas.nama)}</span><span>${icon('id-card', 14)}NISN ${esc(user.nisn)}</span>${hariIni ? `<span>${icon('check-circle', 14)}Absen ${hariIni.jam ? 'pukul ' + hariIni.jam : ''} · ${esc(hariIni.status)}</span>` : `<span>${icon('clock', 14)}Belum absen hari ini</span>`}</div></div>
    ${hariIni ? '' : `<a class="btn btn-white btn-lg" href="${url('siswa/absensi.html')}">${icon('qr')}Absen Sekarang</a>`}</div>
  <div class="grid g-4">
    <div class="tile"><div class="ico ${hariIni ? (hariIni.status === 'hadir' ? 'ok' : 'warn') : 'err'}">${icon(hariIni ? 'check-circle' : 'clock')}</div><div><b style="font-size:18px;padding:3px 0;display:block">${hariIni ? esc(hariIni.status[0].toUpperCase() + hariIni.status.slice(1)) : 'Belum absen'}</b><span>Status hari ini</span></div></div>
    <div class="tile"><div class="ico warn">${icon('clipboard')}</div><div><b>${todo.length}</b><span>Tugas belum dikumpul</span></div></div>
    <div class="tile"><div class="ico ok">${icon('user-check')}</div><div><b>${bulanIni.total ? bulanIni.persen + '%' : '–'}</b><span>Kehadiran bulan ini</span></div></div>
    <div class="tile"><div class="ico vio">${icon('chart')}</div><div><b>${rata ?? '–'}</b><span>Rata-rata nilai semester</span></div></div>
  </div>
  <div class="dash-grid"><div class="stack">
    <div class="card"><div class="card-head"><h3>${isSekolah ? 'Jadwal hari ini' : 'Jadwal ' + HARI[hari.getDay()]}</h3><a class="btn btn-soft btn-sm" href="${url('siswa/jadwal.html')}">Semua jadwal</a></div>
    ${!isSekolah ? `<div class="alert mb-2">${icon('info')}<div>Hari ini akhir pekan. Berikut jadwal hari sekolah berikutnya.</div></div>` : ''}
    <div class="lessons">${lessons.length ? lessons.map((l) => { const c = statusJam(l, isSekolah); return `<div class="lesson ${c}" style="--c:${warnaMapel(l.mapelId)}"><div class="time">${l.mulai}<small>${l.selesai}</small></div><span class="bar"></span><div class="ttl"><b>${esc(ref.mapelNama(l.mapelId))}</b><span>${esc(ref.guruNama(l.guruUid))}</span></div>${c === 'now' ? `<span class="badge b-info now-tag">Berlangsung</span>` : ''}</div>`; }).join('') : empty('calendar', 'Belum ada jadwal', 'Jadwal kelas belum diatur oleh admin.')}</div></div>
    <div class="card"><div class="card-head"><h3>Tugas yang perlu dikerjakan</h3><a class="btn btn-soft btn-sm" href="${url('siswa/tugas.html')}">Lihat semua</a></div>
    <div class="list">${todo.length ? todo.slice(0, 4).map((t) => { const w = sisaWaktu(t.tenggat); return `<a class="item-card" href="${url('siswa/tugas.html')}?tab=tugas&id=${t.id}"><div class="ico" style="color:${warnaMapel(t.mapelId)}">${icon('clipboard')}</div><div class="grow"><h4>${esc(t.judul)}</h4><div class="meta"><span>${esc(ref.mapelNama(t.mapelId))}</span><span>Tenggat ${fmtTanggal(t.tenggat, { singkat: true })}</span></div></div>${badge(w.teks, w.telat ? 'err' : 'warn')}</a>`; }).join('') : empty('check-circle', 'Semua tugas beres', 'Tidak ada tugas yang menunggu. Kerja bagus!')}</div></div>
  </div><div class="stack">
    <div class="card"><div class="card-head"><h3>Rekap kehadiran</h3></div><div class="flex gap-3 items-center wrap"><div class="donut" style="--p:${all.persen}"><b>${all.persen}%</b></div><div class="grow small" style="min-width:150px;display:grid;gap:8px">${[['Hadir', all.hadir, 'ok'], ['Terlambat', all.terlambat, 'warn'], ['Sakit', all.sakit, 'info'], ['Izin', all.izin, 'vio'], ['Alfa', all.alfa, 'err']].map(([l, n, k]) => `<div class="flex between">${badge(l, k)}<b>${n}</b></div>`).join('')}</div></div><a class="btn btn-soft btn-block mt-3" href="${url('siswa/absensi.html')}">Riwayat lengkap</a></div>
    <div class="card"><div class="card-head"><h3>Pengumuman</h3></div><div class="list">${peng.length ? peng.map((b) => `<a class="item-card" href="${url('berita.html')}?id=${b.id}"><div class="ico">${icon('megaphone')}</div><div class="grow"><h4 style="font-size:14px">${esc(b.judul)}</h4><div class="meta"><span>${fmtTanggal(b.tanggal, { singkat: true })}</span>${badge(b.kategori, 'info')}</div></div></a>`).join('') : '<p class="small muted">Belum ada pengumuman.</p>'}</div></div>
  </div></div></div>`;
}

render();
db.listen('jadwal/' + user.kelasId, (v) => { S.jadwal = v; render(); });
db.listen('absensi/' + user.uid, (v) => { S.absensi = v || {}; render(); });
db.listen('pengumpulan/' + user.uid, (v) => { S.kumpul = v || {}; render(); });
db.listen('nilai/' + user.uid, (v) => { S.nilai = v; render(); });
db.listen('berita', (v) => { S.berita = toList(v); render(); });
S.tugas = await db.listBy('tugas', 'kelasId', user.kelasId); render();
setInterval(render, 60000);
