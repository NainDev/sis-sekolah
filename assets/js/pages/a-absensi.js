import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, BULAN, HARI, parseKey } from '../core/utils.js';
import { loadRef } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { toast, STATUS_ABSEN, badge, empty } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'absensi', title: 'Rekap Absensi' });
const ref = await loadRef();
const siswaAll = (await db.listBy('users', 'role', 'siswa')).sort((a, b) => a.nama.localeCompare(b.nama));
let tab = 'harian', tgl = dateKey(), kelas = 'semua', bulan = dateKey().slice(0, 7), hari = {}, all = {}, off = null;

function render() {
  const sis = siswaAll.filter((s) => kelas === 'semua' || s.kelasId === kelas);
  const kSel = `<select class="select" id="k" style="width:auto"><option value="semua">Semua kelas</option>${Object.entries(ref.kelas).map(([id, k]) => `<option value="${id}" ${kelas === id ? 'selected' : ''}>Kelas ${esc(k.nama)}</option>`).join('')}</select>`;
  let body;
  if (tab === 'harian') {
    const mine = sis.map((s) => hari[s.id]).filter(Boolean), r = rekap(mine);
    body = `<div class="page-actions"><div class="flex gap-2 wrap">${kSel}<input class="input" id="t" type="date" value="${tgl}" style="width:auto"></div><button class="btn btn-primary" id="sv">${icon('save')}Simpan koreksi</button></div>
    <div class="sum-tiles mb-3"><div class="sum-tile ok"><b>${r.hadir}</b><span>Hadir</span></div><div class="sum-tile warn"><b>${r.terlambat}</b><span>Terlambat</span></div><div class="sum-tile info"><b>${r.sakit + r.izin}</b><span>Sakit / izin</span></div><div class="sum-tile err"><b>${r.alfa + Math.max(0, sis.length - mine.length)}</b><span>Alfa / belum absen</span></div></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Kelas</th><th>Jam</th><th style="width:170px">Status</th></tr></thead><tbody>${sis.map((s) => { const v = hari[s.id] || {}; return `<tr data-u="${s.id}" data-k="${s.kelasId}"><td>${esc(s.nama)}</td><td>${esc(ref.kelas[s.kelasId]?.nama)}</td><td>${v.jam || '–'}</td><td><select class="select st" style="padding:8px 34px 8px 10px"><option value="">Belum absen</option>${Object.entries(STATUS_ABSEN).map(([k, x]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${x.label}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>`;
  } else {
    const [y, m] = bulan.split('-'), months = [...new Set([bulan, ...Object.keys(all).flatMap((u) => Object.keys(all[u] || {}).map((k) => k.slice(0, 7)))])].sort().reverse();
    body = `<div class="page-actions"><div class="flex gap-2 wrap">${kSel}<select class="select" id="b" style="width:auto">${months.map((x) => `<option value="${x}" ${x === bulan ? 'selected' : ''}>${BULAN[+x.slice(5) - 1]} ${x.slice(0, 4)}</option>`).join('')}</select></div><button class="btn btn-ghost" id="csv">${icon('download')}Ekspor CSV</button></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Kelas</th><th class="num">Hadir</th><th class="num">Terlambat</th><th class="num">Sakit</th><th class="num">Izin</th><th class="num">Alfa</th><th class="num">%</th></tr></thead><tbody>${sis.map((s) => { const r = rekap(Object.entries(all[s.id] || {}).filter(([k]) => k.startsWith(bulan)).map(([, v]) => v)); return `<tr><td>${esc(s.nama)}</td><td>${esc(ref.kelas[s.kelasId]?.nama)}</td><td class="num">${r.hadir}</td><td class="num">${r.terlambat}</td><td class="num">${r.sakit}</td><td class="num">${r.izin}</td><td class="num">${r.alfa}</td><td class="num"><b class="score ${r.persen >= 90 ? 'good' : r.persen >= 75 ? 'mid' : 'low'}">${r.total ? r.persen + '%' : '–'}</b></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  el.innerHTML = `<div class="stack"><div class="tabs" id="tb"><button class="tab ${tab === 'harian' ? 'active' : ''}" data-t="harian">Harian</button><button class="tab ${tab === 'bulanan' ? 'active' : ''}" data-t="bulanan">Rekap bulanan</button></div>${body}</div>`;
  el.querySelectorAll('#tb .tab').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
  el.querySelector('#k').onchange = (e) => { kelas = e.target.value; render(); };
  el.querySelector('#t')?.addEventListener('change', (e) => { tgl = e.target.value || dateKey(); listen(); });
  el.querySelector('#b')?.addEventListener('change', (e) => { bulan = e.target.value; render(); });
  el.querySelector('#csv')?.addEventListener('click', () => { const c = (v) => `"${String(v).replace(/"/g, '""')}"`; const rows = sis.map((s) => { const r = rekap(Object.entries(all[s.id] || {}).filter(([k]) => k.startsWith(bulan)).map(([, v]) => v)); return [s.nama, ref.kelas[s.kelasId]?.nama, r.hadir, r.terlambat, r.sakit, r.izin, r.alfa, r.persen].map(c).join(','); }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [['Nama', 'Kelas', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', 'Persen'].map(c).join(','), ...rows].join('\n')], { type: 'text/csv' })); a.download = `absensi-${bulan}.csv`; a.click(); });
  el.querySelector('#sv')?.addEventListener('click', async (e) => {
    const upd = {}; let n = 0;
    el.querySelectorAll('tr[data-u]').forEach((tr) => { const uid = tr.dataset.u, st = tr.querySelector('.st').value, old = hari[uid]; if ((old?.status || '') === st) return; n++; if (!st) { upd[`absensi/${uid}/${tgl}`] = null; upd[`absensi_hari/${tgl}/${uid}`] = null; return; } upd[`absensi/${uid}/${tgl}`] = { status: st, jam: old?.jam || null, ts: old?.ts || null, metode: old?.metode || 'manual' }; upd[`absensi_hari/${tgl}/${uid}`] = { status: st, jam: old?.jam || null, kelasId: tr.dataset.k }; });
    if (!n) return toast('Tidak ada perubahan.', 'info'); e.target.disabled = true; try { await db.update('', upd); toast(`${n} data diperbarui.`, 'ok'); } catch { toast('Gagal menyimpan.', 'err'); } e.target.disabled = false;
  });
}
function listen() { off?.(); off = db.listen('absensi_hari/' + tgl, (v) => { hari = v || {}; if (tab === 'harian') render(); }); }
listen();
db.listen('absensi', (v) => { all = v || {}; if (tab === 'bulanan') render(); });
render();
