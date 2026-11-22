/* g-absensi.js — Manajemen absensi kelas perwalian: log scan live + input manual */
import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, HARI, parseKey, initials } from '../core/utils.js';
import { loadRef, kelasWali } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { toast, statusBadge, STATUS_ABSEN, empty, badge } from '../core/ui.js';

const { user, el } = await mountPortal({ role: 'guru', active: 'absensi', title: 'Absensi Kelas', sub: 'Pantau scan QR dan koreksi kehadiran' });
const ref = await loadRef(); const wali = kelasWali(user.uid, ref);
if (!wali) { el.innerHTML = `<div class="alert warn">${icon('alert')}<div>Absensi kelas khusus wali kelas. Anda belum ditugaskan sebagai wali kelas; hubungi Tata Usaha.</div></div>`; await new Promise(() => {}); }
let tgl = dateKey(), siswa = [], rows = {}, off = null, dirty = false, prev = new Set();
const isToday = () => tgl === dateKey();
const MET = { qr: ['Scan QR', 'ok'], kode: ['Kode cadangan', 'info'], manual: ['Manual', 'vio'] };
const STATUS_MANUAL = ['hadir', 'terlambat', 'sakit', 'izin', 'alfa'];

function listen() { off?.(); prev = new Set(); off = db.listen('absensi_hari/' + tgl, (v) => { rows = Object.fromEntries(Object.entries(v || {}).filter(([, x]) => x.kelasId === wali.id)); if (!dirty) render(); else liveOnly(); }); }

function logHtml() {
  const log = siswa.filter((s) => rows[s.id] && rows[s.id].jam).map((s) => ({ s, a: rows[s.id] })).sort((a, b) => (b.a.ts || 0) - (a.a.ts || 0) || b.a.jam.localeCompare(a.a.jam));
  return log.length ? log.map(({ s, a }) => `<div class="flex gap-2 items-center ${prev.size && !prev.has(s.id) ? 'new-row' : ''}" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="avatar avatar-sm">${esc(initials(s.nama))}</div><div class="grow"><b style="font-weight:500;font-size:14px">${esc(s.nama)}</b><div class="xs muted">${badge(...(MET[a.metode] || MET.qr))}</div></div>${statusBadge(a.status)}<b style="font-family:var(--f-head);font-size:14px">${a.jam}</b></div>`).join('') : '<p class="small muted">Belum ada scan pada tanggal ini.</p>';
}
function liveOnly() { const l = el.querySelector('#log'); if (l) l.innerHTML = logHtml(); }

function render() {
  const mine = siswa.map((s) => rows[s.id]).filter(Boolean), r = rekap(mine), tot = siswa.length;
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="flex gap-2 wrap items-center"><span class="badge b-info" style="font-size:13px;padding:6px 12px">Kelas ${esc(wali.nama)}</span><input class="input" id="t" type="date" value="${tgl}" max="${dateKey()}" style="width:auto"></div><div class="flex gap-2"><a class="btn btn-ghost" href="../gerbang.html" target="_blank" rel="noopener">${icon('qr')}Layar QR</a><button class="btn btn-primary" id="sv">${icon('save')}Simpan perubahan</button></div></div>
  <div class="sum-tiles" style="grid-template-columns:repeat(5,1fr)">${[['Hadir', r.hadir, 'ok'], ['Terlambat', r.terlambat, 'warn'], ['Sakit', r.sakit, 'info'], ['Izin', r.izin, 'info'], ['Alfa', r.alfa, 'err']].map(([l, n, k]) => `<div class="sum-tile ${k}"><b ${l === 'Izin' ? 'style="color:var(--vio)"' : ''}>${n}</b><span>${l}</span></div>`).join('')}</div>
  <div class="dash-grid"><div class="card"><div class="card-head"><h3>${HARI[parseKey(tgl).getDay()]}, ${fmtTanggal(tgl)}</h3><span class="small muted">${tot - mine.length} murid belum tercatat</span></div>
  ${siswa.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Murid</th><th>Jam</th><th style="width:160px">Status</th><th>Catatan</th></tr></thead><tbody>${siswa.map((s) => { const v = rows[s.id] || {}; return `<tr data-u="${s.id}"><td><b style="font-weight:500">${esc(s.nama)}</b><div class="xs muted">${esc(s.nisn)}</div></td><td>${v.jam || '–'}</td><td><select class="select st" style="padding:8px 34px 8px 10px"><option value="">Belum absen</option>${STATUS_MANUAL.map((k) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${STATUS_ABSEN[k].label}</option>`).join('')}</select></td><td><input class="input ct" placeholder="Opsional" value="${esc(v.catatan || '')}" style="padding:8px"></td></tr>`; }).join('')}</tbody></table></div>` : empty('users', 'Belum ada murid', 'Kelas ini belum memiliki murid.')}</div>
  <div class="card"><div class="card-head"><h3>Log scan ${isToday() ? 'live' : ''}</h3>${isToday() ? '<span class="badge b-ok">Live</span>' : ''}</div><div id="log" style="max-height:520px;overflow:auto">${logHtml()}</div></div></div></div>`;
  prev = new Set(Object.keys(rows));
  el.querySelector('#t').onchange = (e) => { tgl = e.target.value || dateKey(); dirty = false; listen(); };
  el.querySelectorAll('.st,.ct').forEach((i) => i.addEventListener('input', () => { dirty = true; }));
  el.querySelector('#sv').onclick = async (e) => {
    const upd = {}; let n = 0;
    el.querySelectorAll('tr[data-u]').forEach((tr) => {
      const uid = tr.dataset.u, st = tr.querySelector('.st').value, ct = tr.querySelector('.ct').value.trim(), old = rows[uid];
      if ((old?.status || '') === st && (old?.catatan || '') === ct) return; n++;
      if (!st) { upd[`absensi/${uid}/${tgl}`] = null; upd[`absensi_hari/${tgl}/${uid}`] = null; return; }
      const sama = old?.status === st, rec = { status: st, jam: sama ? old.jam : null, ts: sama ? old.ts : null, metode: sama ? old.metode : 'manual', ...(ct ? { catatan: ct } : {}), oleh: user.uid };
      upd[`absensi/${uid}/${tgl}`] = rec; upd[`absensi_hari/${tgl}/${uid}`] = { status: st, jam: rec.jam, kelasId: wali.id, metode: rec.metode, ts: rec.ts };
    });
    if (!n) return toast('Tidak ada perubahan untuk disimpan.', 'info');
    e.target.disabled = true; try { await db.update('', upd); dirty = false; toast(`${n} data absensi diperbarui.`, 'ok'); } catch (er) { console.error(er); toast('Gagal menyimpan.', 'err'); } e.target.disabled = false;
  };
}
db.listenBy('users', 'kelasId', wali.id, (v) => { siswa = toList(v).filter((u) => u.role === 'siswa' && u.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama)); if (!dirty) render(); });
listen();
