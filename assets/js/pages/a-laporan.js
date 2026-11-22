/* a-laporan.js — Laporan & ekspor: absensi per kelas/periode, nilai, data siswa (CSV + cetak) */
import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, addDays, parseKey, round1, predikat } from '../core/utils.js';
import { loadRef, rekapNilai, semesterList, semLabel } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { toast, empty } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'laporan', title: 'Laporan & Ekspor Data', sub: 'Unduh CSV (dibuka di Excel) atau cetak' });
const ref = await loadRef();
const siswa = (await db.listBy('users', 'role', 'siswa')).sort((a, b) => a.nama.localeCompare(b.nama));
const nilaiAll = (await db.get('nilai')) || {}, absAll = (await db.get('absensi')) || {};
const S = (await db.get('pengaturan')) || {};
const today = dateKey();
let tab = 'absensi', kelas = 'semua', dari = dateKey(addDays(new Date(), -29)), sampai = today, sem = S.semesterKey || '', mapel = 'semua', data = { head: [], rows: [], judul: '' };
const kNama = (id) => ref.kelas[id]?.nama || '–';
const kelasOpt = `<select class="select" id="k" style="width:auto"><option value="semua">Semua kelas</option>${Object.entries(ref.kelas).map(([id, k]) => `<option value="${id}">${esc(k.nama)}</option>`).join('')}</select>`;

function hitung() {
  const sis = siswa.filter((s) => kelas === 'semua' || s.kelasId === kelas);
  const filt = kelas === 'semua' ? 'Semua kelas' : kNama(kelas);
  if (tab === 'absensi') {
    const rows = sis.map((s) => {
      const recs = Object.entries(absAll[s.id] || {}).filter(([d]) => d >= dari && d <= sampai).map(([, v]) => v), r = rekap(recs);
      return [s.nama, s.nisn, kNama(s.kelasId), r.hadir, r.terlambat, r.sakit, r.izin, r.alfa, r.total, r.persen + '%'];
    });
    data = { judul: `Rekap Absensi — ${filt} — ${fmtTanggal(dari)} s.d. ${fmtTanggal(sampai)}`, head: ['Nama', 'NISN', 'Kelas', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', 'Total hari tercatat', 'Kehadiran'], rows, num: [3, 4, 5, 6, 7, 8, 9] };
  } else if (tab === 'nilai') {
    const rows = [];
    for (const s of sis) {
      const rn = rekapNilai(nilaiAll[s.id], sem).filter((x) => mapel === 'semua' || x.mapelId === mapel);
      for (const x of rn) if (x.akhir != null) rows.push([s.nama, s.nisn, kNama(s.kelasId), ref.mapel[x.mapelId]?.nama || x.mapelId, x.rata.Tugas == null ? '' : round1(x.rata.Tugas), x.rata.UH == null ? '' : round1(x.rata.UH), x.rata.UTS == null ? '' : round1(x.rata.UTS), x.rata.UAS == null ? '' : round1(x.rata.UAS), round1(x.akhir), predikat(x.akhir)]);
    }
    data = { judul: `Rekap Nilai — ${filt} — ${sem ? semLabel(sem) : 'Semua semester'}${mapel !== 'semua' ? ' — ' + (ref.mapel[mapel]?.nama || mapel) : ''}`, head: ['Nama', 'NISN', 'Kelas', 'Mata pelajaran', 'Tugas', 'UH', 'UTS', 'UAS', 'Nilai akhir', 'Predikat'], rows, num: [4, 5, 6, 7, 8] };
  } else {
    data = { judul: `Data Siswa — ${filt}`, head: ['Nama', 'NISN', 'Kelas', 'L/P', 'Tempat lahir', 'Tgl lahir', 'Alamat', 'Orang tua / wali', 'No. HP', 'Status akun'], rows: sis.map((s) => [s.nama, s.nisn, kNama(s.kelasId), s.jk, s.tempatLahir || '', s.tglLahir || '', s.alamat || '', s.ortu || '', s.hp || '', s.aktif === false ? 'Nonaktif' : 'Aktif']), num: [] };
  }
}
function render() {
  hitung();
  const sems = [...new Set([S.semesterKey, ...Object.values(nilaiAll).flatMap((n) => semesterList(n))].filter(Boolean))].sort().reverse();
  const filters = `<div class="flex gap-2 wrap">${kelasOpt}${tab === 'absensi' ? `<input class="input" type="date" id="d1" value="${dari}" style="width:auto" aria-label="Dari tanggal"><input class="input" type="date" id="d2" value="${sampai}" style="width:auto" aria-label="Sampai tanggal">` : ''}${tab === 'nilai' ? `<select class="select" id="sm" style="width:auto">${sems.map((x) => `<option value="${x}" ${x === sem ? 'selected' : ''}>${esc(semLabel(x))}</option>`).join('')}</select><select class="select" id="mp" style="width:auto"><option value="semua">Semua mapel</option>${Object.entries(ref.mapel).map(([id, m]) => `<option value="${id}" ${mapel === id ? 'selected' : ''}>${esc(m.nama)}</option>`).join('')}</select>` : ''}</div>`;
  el.innerHTML = `<div class="stack"><div class="tabs" id="tb">${[['absensi', 'Absensi'], ['nilai', 'Nilai'], ['siswa', 'Data siswa']].map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
  <div class="page-actions no-print">${filters}<div class="flex gap-2"><button class="btn btn-ghost" id="pr">${icon('printer')}Cetak</button><button class="btn btn-primary" id="csv">${icon('download')}Unduh CSV</button></div></div>
  <div class="card print-area"><div class="card-head"><h3>${esc(data.judul)}</h3><span class="muted small">${data.rows.length} baris · dicetak ${fmtTanggal(today)}</span></div>
  ${data.rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>${data.head.map((h, i) => `<th class="${data.num.includes(i) ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${data.rows.map((r) => `<tr>${r.map((c, i) => `<td class="${data.num.includes(i) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : empty('download', 'Tidak ada data', 'Ubah filter kelas, periode, atau semester.')}</div></div>`;
  el.querySelectorAll('#tb .tab').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
  const k = el.querySelector('#k'); k.value = kelas; k.onchange = (e) => { kelas = e.target.value; render(); };
  el.querySelector('#d1')?.addEventListener('change', (e) => { dari = e.target.value || dari; render(); });
  el.querySelector('#d2')?.addEventListener('change', (e) => { sampai = e.target.value || sampai; render(); });
  el.querySelector('#sm')?.addEventListener('change', (e) => { sem = e.target.value; render(); });
  el.querySelector('#mp')?.addEventListener('change', (e) => { mapel = e.target.value; render(); });
  el.querySelector('#pr').onclick = () => window.print();
  el.querySelector('#csv').onclick = () => {
    if (!data.rows.length) return toast('Tidak ada data untuk diunduh.', 'warn');
    const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const txt = '﻿' + [data.head, ...data.rows].map((r) => r.map(c).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = `laporan-${tab}-${kelas === 'semua' ? 'semua-kelas' : kNama(kelas).replace(/\s+/g, '-').toLowerCase()}-${today}.csv`; a.click(); URL.revokeObjectURL(a.href);
    toast('CSV diunduh. Buka dengan Excel atau Google Sheets.', 'ok');
  };
}
render();
