/* g-dashboard.js — Dashboard Wali Kelas: hanya data kelas perwalian guru yang login */
import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, dateKey, fmtTanggal, sapaan, HARI, warnaMapel, toMin, nowMin, initials, sortBy } from '../core/utils.js';
import { loadRef, jadwalHari, kelasWali } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { empty, badge, toast, STATUS_ABSEN } from '../core/ui.js';

const { user, settings, el } = await mountPortal({ role: 'guru', active: 'index', title: 'Dashboard Wali Kelas', sub: `Tahun ajaran ${(await db.get('pengaturan/tahunAjaran')) || ''}` });
const ref = await loadRef();
const wali = kelasWali(user.uid, ref);
const today = dateKey(), dow = new Date().getDay();
const jadwalAll = (await db.get('jadwal')) || {};
const S = { siswa: [], hari: {}, catatan: {} };

function jadwalSaya() {
  const mine = [];
  for (const [kid, days] of Object.entries(jadwalAll)) for (const l of jadwalHari(days, dow)) if (l.guruUid === user.uid) mine.push({ ...l, kelasId: kid });
  return mine.sort((a, b) => toMin(a.mulai) - toMin(b.mulai));
}
function blokJadwal() {
  const mine = jadwalSaya(), n = nowMin();
  return `<div class="card"><div class="card-head"><h3>Jadwal mengajar hari ini</h3></div><div class="lessons">${mine.length ? mine.map((l) => { const c = n >= toMin(l.selesai) ? 'past' : n >= toMin(l.mulai) ? 'now' : ''; return `<div class="lesson ${c}" style="--c:${warnaMapel(l.mapelId)}"><div class="time">${l.mulai}<small>${l.selesai}</small></div><span class="bar"></span><div class="ttl"><b>${esc(ref.mapelNama(l.mapelId))}</b><span>Kelas ${esc(ref.kelas[l.kelasId]?.nama)} · ${esc(ref.kelas[l.kelasId]?.ruang || '')}</span></div>${c === 'now' ? '<span class="badge b-info now-tag">Berlangsung</span>' : ''}</div>`; }).join('') : empty('calendar', dow === 0 || dow === 6 ? 'Akhir pekan' : 'Tidak ada jam mengajar', 'Tidak ada jadwal mengajar untuk hari ini.')}</div></div>`;
}

function render() {
  if (!wali) {
    el.innerHTML = `<div class="stack"><div class="greet"><div><h2>${sapaan()}, ${esc(user.nama.split(',')[0])}</h2><p>${HARI[dow]}, ${fmtTanggal(today)}</p></div></div><div class="alert warn">${icon('alert')}<div>Anda belum ditugaskan sebagai wali kelas, jadi data murid dan absensi kelas belum tersedia. Hubungi Tata Usaha untuk penugasan wali kelas. Fitur <a href="${url('guru/materi.html')}">Materi & Tugas</a> dan <a href="${url('guru/nilai.html')}">Input Nilai</a> tetap bisa dipakai.</div></div>${blokJadwal()}</div>`;
    return;
  }
  const ids = new Set(S.siswa.map((s) => s.id));
  const rows = S.siswa.map((s) => ({ s, a: S.hari[s.id] }));
  const r = rekap(rows.filter((x) => x.a).map((x) => x.a));
  const belum = rows.filter((x) => !x.a).map((x) => x.s);
  const log = rows.filter((x) => x.a && x.a.jam && x.a.metode !== 'manual').sort((a, b) => (b.a.ts || 0) - (a.a.ts || 0) || b.a.jam.localeCompare(a.a.jam)).slice(0, 6);
  const pentingList = []; for (const s of S.siswa) for (const [id, c] of Object.entries(S.catatan[s.id] || {})) if (c.penting) pentingList.push({ ...c, id, siswa: s });
  const hadir = r.hadir + r.terlambat;
  el.innerHTML = `<div class="stack">
  <div class="greet"><div><h2>Wali kelas ${esc(wali.nama)}</h2><p>${esc(user.nama)} · ${HARI[dow]}, ${fmtTanggal(today)}</p><div class="gchips"><span>${icon('users', 14)}${S.siswa.length} murid</span><span>${icon('building', 14)}${esc(wali.ruang || '-')}</span><span>${icon('check-circle', 14)}${hadir} sudah hadir</span></div></div><div class="flex gap-2 wrap"><a class="btn btn-white" href="${url('guru/absensi.html')}">${icon('user-check')}Kelola absensi</a><a class="btn btn-glass" href="${url('gerbang.html')}" target="_blank" rel="noopener">${icon('qr')}Layar QR gerbang</a></div></div>
  <div class="grid g-4"><div class="tile"><div class="ico">${icon('users')}</div><div><b>${S.siswa.length}</b><span>Jumlah murid</span></div></div><div class="tile"><div class="ico ok">${icon('check-circle')}</div><div><b>${hadir}/${S.siswa.length}</b><span>Hadir hari ini</span></div></div><div class="tile"><div class="ico err">${icon('clock')}</div><div><b>${belum.length}</b><span>Belum absen</span></div></div><div class="tile"><div class="ico warn">${icon('alert')}</div><div><b>${pentingList.length}</b><span>Catatan penting</span></div></div></div>
  <div class="card"><div class="card-head"><h3>Rekap kehadiran hari ini</h3><span class="small muted">Realtime dari scan QR dan input manual</span></div><div class="sum-tiles" style="grid-template-columns:repeat(5,1fr)">${[['Hadir', r.hadir, 'ok'], ['Terlambat', r.terlambat, 'warn'], ['Sakit', r.sakit, 'info'], ['Izin', r.izin, 'info'], ['Alfa', r.alfa, 'err']].map(([l, n, k]) => `<div class="sum-tile ${k}"><b ${l === 'Izin' ? 'style="color:var(--vio)"' : ''}>${n}</b><span>${l}</span></div>`).join('')}</div></div>
  <div class="dash-grid"><div class="stack">
    <div class="card"><div class="card-head"><h3>Murid belum absen ${belum.length ? badge(belum.length, 'err') : ''}</h3><a class="btn btn-soft btn-sm" href="${url('guru/absensi.html')}">Input manual</a></div>
    ${belum.length ? `<div class="list">${belum.map((s) => `<div class="item-card" style="padding:12px;align-items:center"><div class="avatar avatar-sm">${esc(initials(s.nama))}</div><div class="grow"><h4 style="font-size:14.5px">${esc(s.nama)}</h4><div class="meta"><span>NISN ${esc(s.nisn)}</span>${s.hp ? `<a href="tel:${esc(s.hp)}">${icon('phone', 13)} ${esc(s.hp)}</a>` : ''}</div></div><div class="flex gap-1">${['sakit', 'izin', 'alfa'].map((k) => `<button class="btn btn-ghost btn-sm" data-q="${s.id}|${k}">${STATUS_ABSEN[k].label}</button>`).join('')}</div></div>`).join('')}</div>` : empty('check-circle', 'Semua murid sudah tercatat', 'Tidak ada murid yang belum absen hari ini.')}</div>
    <div class="card"><div class="card-head"><h3>Catatan penting murid</h3><a class="btn btn-soft btn-sm" href="${url('guru/murid.html')}">Semua murid</a></div><div class="list">${pentingList.length ? pentingList.slice(0, 5).map((c) => `<a class="item-card" href="${url('guru/murid.html')}?id=${c.siswa.id}"><div class="ico" style="color:var(--warn);background:var(--warn-bg)">${icon('alert')}</div><div class="grow"><h4 style="font-size:14.5px">${esc(c.siswa.nama)} ${badge(c.kategori, 'info')}</h4><p class="small muted">${esc(c.teks)}</p></div></a>`).join('') : '<p class="small muted">Belum ada catatan penting.</p>'}</div></div>
  </div><div class="stack">
    <div class="card"><div class="card-head"><h3>Scan QR terbaru</h3><span class="badge b-ok"><i style="width:7px;height:7px;border-radius:50%;background:var(--ok)"></i>Live</span></div><div class="list">${log.length ? log.map((x) => `<div class="flex gap-2 items-center"><div class="avatar avatar-sm">${esc(initials(x.s.nama))}</div><div class="grow"><b style="font-weight:500;font-size:14px">${esc(x.s.nama)}</b></div>${badge(x.a.status === 'hadir' ? 'Hadir' : 'Terlambat', x.a.status === 'hadir' ? 'ok' : 'warn')}<span class="small muted">${x.a.jam}</span></div>`).join('') : '<p class="small muted">Belum ada scan hari ini.</p>'}</div></div>
    ${blokJadwal()}
  </div></div></div>`;
  el.querySelectorAll('[data-q]').forEach((b) => b.onclick = async () => {
    const [uid, st] = b.dataset.q.split('|'); b.disabled = true;
    try { await db.update('', { [`absensi/${uid}/${today}`]: { status: st, jam: null, ts: null, metode: 'manual', oleh: user.uid }, [`absensi_hari/${today}/${uid}`]: { status: st, jam: null, kelasId: wali.id, metode: 'manual' } }); toast('Status absensi disimpan.', 'ok'); } catch { toast('Gagal menyimpan.', 'err'); b.disabled = false; }
  });
}
render();
if (wali) {
  db.listenBy('users', 'kelasId', wali.id, (v) => { S.siswa = toList(v).filter((u) => u.role === 'siswa' && u.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama)); render(); });
  db.listen('absensi_hari/' + today, (v) => { S.hari = Object.fromEntries(Object.entries(v || {}).filter(([, x]) => x.kelasId === wali.id)); render(); });
  db.listen('catatan_siswa', (v) => { S.catatan = v || {}; render(); });
}
setInterval(render, 60000);
