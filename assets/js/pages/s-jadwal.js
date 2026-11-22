import { mountPortal } from '../layout/portal.js';
import { db } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, HARI, warnaMapel } from '../core/utils.js';
import { loadRef, jadwalHari, statusJam } from '../core/akademik.js';
import { empty } from '../core/ui.js';

const { user, el } = await mountPortal({ role: 'siswa', active: 'jadwal', title: 'Jadwal Pelajaran' });
const ref = await loadRef(); const kelas = ref.kelas[user.kelasId] || {};
const wali = ref.guruNama(kelas.wali);
let jadwal = null, view = 'hari'; let day = new Date().getDay(); if (day < 1 || day > 5) day = 1;
const today = new Date().getDay();

function render() {
  const tabs = [1, 2, 3, 4, 5].map((d) => `<button class="day-tab ${d === day ? 'active' : ''} ${d === today ? 'today' : ''}" data-d="${d}">${HARI[d]}<small>${jadwalHari(jadwal, d).length} pelajaran</small></button>`).join('');
  const lessons = jadwalHari(jadwal, day);
  const hari = `<div class="day-tabs mb-3">${tabs}</div><div class="lessons">${lessons.length ? lessons.map((l, i) => { const c = statusJam(l, day === today); return `${i === 2 ? `<div class="break">${icon('coffee', 14)}Istirahat</div>` : ''}<div class="lesson ${c}" style="--c:${warnaMapel(l.mapelId)}"><div class="time">${l.mulai}<small>${l.selesai}</small></div><span class="bar"></span><div class="ttl"><b>${esc(ref.mapelNama(l.mapelId))}</b><span>${esc(ref.guruNama(l.guruUid))} · ${esc(kelas.ruang || '')}</span></div>${c === 'now' ? '<span class="badge b-info now-tag">Berlangsung</span>' : ''}</div>`; }).join('') : empty('calendar', 'Tidak ada pelajaran', 'Belum ada jadwal pada hari ini.')}</div>`;
  const minggu = `<div class="table-wrap" style="padding:14px;overflow-x:auto"><div class="week-grid">${[1, 2, 3, 4, 5].map((d) => `<div class="week-col ${d === today ? 'today' : ''}"><h4>${HARI[d]}</h4>${jadwalHari(jadwal, d).map((l) => `<div class="week-cell" style="--c:${warnaMapel(l.mapelId)}"><b>${esc(ref.mapelNama(l.mapelId))}</b><small>${l.mulai}–${l.selesai}</small><small>${esc(ref.guruNama(l.guruUid))}</small></div>`).join('') || '<small class="faint">–</small>'}</div>`).join('')}</div></div>`;
  el.innerHTML = `<div class="stack"><div class="card card-tint flex between items-center wrap gap-2"><div class="flex gap-2 items-center"><div class="avatar">${icon('users', 22)}</div><div><h3>Kelas ${esc(kelas.nama)}</h3><span class="small muted">${esc(kelas.ruang || '')} · Wali kelas: ${esc(wali)}</span></div></div><div class="tabs" id="v"><button class="tab ${view === 'hari' ? 'active' : ''}" data-v="hari">Per hari</button><button class="tab ${view === 'minggu' ? 'active' : ''}" data-v="minggu">Mingguan</button></div></div>${view === 'hari' ? hari : minggu}</div>`;
  el.querySelectorAll('.day-tab').forEach((b) => b.onclick = () => { day = +b.dataset.d; render(); });
  el.querySelectorAll('#v .tab').forEach((b) => b.onclick = () => { view = b.dataset.v; render(); });
}
db.listen('jadwal/' + user.kelasId, (v) => { jadwal = v; render(); });
setInterval(render, 60000);
