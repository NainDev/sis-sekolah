import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, fmtTanggal, round1, avg, predikat, scoreClass, sortBy, warnaMapel } from '../core/utils.js';
import { loadRef, rekapNilai, semesterList, semLabel } from '../core/akademik.js';
import { empty, modal, badge } from '../core/ui.js';
import { APP } from '../config.js';

const { user, settings, el } = await mountPortal({ role: 'siswa', active: 'nilai', title: 'Nilai & Raport Digital' });
const ref = await loadRef(); const kelas = ref.kelas[user.kelasId] || {};
let nilai = null, sem = settings.semesterKey;
const fmt = (n) => (n == null ? '–' : round1(n));
const cell = (n) => (n == null ? '<span class="faint">–</span>' : `<span class="score ${scoreClass(n)}">${round1(n)}</span>`);

function render() {
  const sems = semesterList(nilai); if (!sems.includes(sem)) sem = sems[0] || sem;
  const data = rekapNilai(nilai, sem).map((r) => ({ ...r, nama: ref.mapelNama(r.mapelId) })).sort((a, b) => a.nama.localeCompare(b.nama));
  const ak = data.filter((d) => d.akhir != null);
  const rata = ak.length ? avg(ak.map((d) => d.akhir)) : null;
  const best = [...ak].sort((a, b) => b.akhir - a.akhir)[0], low = ak.filter((d) => d.akhir < APP.kkm);
  el.innerHTML = `<div class="stack">
  <div class="flex between items-center wrap gap-2 no-print"><div class="tabs" id="sm">${sems.map((s) => `<button class="tab ${s === sem ? 'active' : ''}" data-s="${s}">${semLabel(s)}</button>`).join('')}</div><button class="btn btn-ghost" id="pr">${icon('printer')}Cetak raport</button></div>
  <div class="raport-head"><h2>${esc(settings.nama)}</h2><p>RAPORT DIGITAL · ${semLabel(sem)}</p><p>${esc(user.nama)} · NISN ${esc(user.nisn)} · Kelas ${esc(kelas.nama)}</p></div>
  <div class="grid g-4">
    <div class="tile"><div class="ico vio">${icon('chart')}</div><div><b>${rata == null ? '–' : round1(rata)}</b><span>Rata-rata nilai akhir</span></div></div>
    <div class="tile"><div class="ico ok">${icon('trophy')}</div><div><b style="font-size:16px">${best ? esc(best.nama) : '–'}</b><span>Nilai tertinggi${best ? ' · ' + round1(best.akhir) : ''}</span></div></div>
    <div class="tile"><div class="ico ${low.length ? 'err' : 'ok'}">${icon(low.length ? 'alert' : 'check-circle')}</div><div><b>${low.length}</b><span>Mapel di bawah KKM (${APP.kkm})</span></div></div>
    <div class="tile"><div class="ico">${icon('book')}</div><div><b>${data.length}</b><span>Mata pelajaran</span></div></div></div>
  ${data.length ? `<div class="card"><div class="card-head"><h3>Raport ${semLabel(sem)}</h3><span class="small muted">Bobot: Tugas ${APP.bobot.Tugas * 100}% · UH ${APP.bobot.UH * 100}% · UTS ${APP.bobot.UTS * 100}% · UAS ${APP.bobot.UAS * 100}%</span></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Mata pelajaran</th><th class="num">Tugas</th><th class="num">UH</th><th class="num">UTS</th><th class="num">UAS</th><th class="num">Nilai akhir</th><th class="num">Predikat</th><th>Keterangan</th><th class="no-print"></th></tr></thead><tbody>${data.map((d) => `<tr><td><b style="font-weight:500">${esc(d.nama)}</b></td><td class="num">${cell(d.rata.Tugas)}</td><td class="num">${cell(d.rata.UH)}</td><td class="num">${cell(d.rata.UTS)}</td><td class="num">${cell(d.rata.UAS)}</td><td class="num"><b class="score ${d.akhir != null ? scoreClass(d.akhir) : ''}">${fmt(d.akhir)}</b></td><td class="num">${d.akhir != null ? `<span class="pred ${predikat(d.akhir)}">${predikat(d.akhir)}</span>` : '–'}</td><td>${d.akhir == null ? badge('Belum lengkap') : d.akhir >= APP.kkm ? badge('Tuntas', 'ok') : badge('Remedial', 'err')}</td><td class="no-print"><button class="btn btn-soft btn-sm" data-m="${d.mapelId}">Rincian</button></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted mt-2">Nilai akhir dihitung dari komponen yang sudah tersedia. UAS semester berjalan belum diumumkan.</p></div>
  <div class="card no-print"><div class="card-head"><h3>Grafik nilai akhir</h3></div><div class="bars">${ak.map((d) => `<div class="bar-row"><span class="truncate">${esc(d.nama)}</span><div class="progress"><i style="width:${Math.round(d.akhir)}%;background:${warnaMapel(d.mapelId)}"></i></div><span class="v">${round1(d.akhir)}</span></div>`).join('')}</div></div>` : `<div class="card">${empty('chart', 'Belum ada nilai', 'Nilai semester ini belum tersedia.')}</div>`}</div>`;
  el.querySelectorAll('#sm .tab').forEach((b) => b.onclick = () => { sem = b.dataset.s; render(); });
  el.querySelector('#pr').onclick = () => print();
  el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { const d = data.find((x) => x.mapelId === b.dataset.m); modal({ title: d.nama, body: `<div class="table-wrap"><table class="table"><thead><tr><th>Penilaian</th><th>Jenis</th><th>Tanggal</th><th class="num">Nilai</th></tr></thead><tbody>${sortBy(d.items, 'tanggal', 1).map((i) => `<tr><td>${esc(i.judul)}</td><td>${badge(i.jenis, 'info')}</td><td>${fmtTanggal(i.tanggal, { singkat: true })}</td><td class="num">${cell(Number(i.nilai))}</td></tr>`).join('')}</tbody></table></div>`, actions: [{ label: 'Tutup' }] }); });
}
db.listen('nilai/' + user.uid, (v) => { nilai = v; render(); });
