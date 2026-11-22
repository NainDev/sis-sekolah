/* g-murid.js — Daftar murid kelas perwalian: pencarian, ringkasan, detail, catatan wali */
import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, qs, debounce, initials, fmtTanggal, round1, avg, scoreClass, dateKey, sortBy } from '../core/utils.js';
import { loadRef, kelasWali, rekapNilai, semLabel } from '../core/akademik.js';
import { rekap } from '../core/absensi.js';
import { empty, badge, modal, toast, confirmBox, statusBadge } from '../core/ui.js';
import { APP } from '../config.js';

const { user, settings, el } = await mountPortal({ role: 'guru', active: 'murid', title: 'Murid Kelas', sub: 'Data dan catatan murid perwalian' });
const ref = await loadRef(); const wali = kelasWali(user.uid, ref);
if (!wali) { el.innerHTML = `<div class="alert warn">${icon('alert')}<div>Halaman ini khusus wali kelas. Anda belum ditugaskan sebagai wali kelas; hubungi Tata Usaha.</div></div>`; await new Promise(() => {}); }
const S = { siswa: [], absensi: {}, nilai: {}, catatan: {}, q: '', opened: false };
const KAT = ['Akademik', 'Perilaku', 'Kesehatan', 'Lainnya'];

const stat = (uid) => { const r = rekap(Object.values(S.absensi[uid] || {})); return r; };
const rataNilai = (uid) => { const a = rekapNilai(S.nilai[uid], settings.semesterKey).filter((x) => x.akhir != null); return a.length ? round1(avg(a.map((x) => x.akhir))) : null; };
const notes = (uid) => sortBy(toList(S.catatan[uid]), 'tanggal', -1);

function render() {
  const t = S.q.toLowerCase(), list = S.siswa.filter((s) => !t || (s.nama + s.nisn).toLowerCase().includes(t));
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="flex gap-2 wrap items-center"><span class="badge b-info" style="font-size:13px;padding:6px 12px">Kelas ${esc(wali.nama)} · ${S.siswa.length} murid</span><div class="input-group">${icon('search')}<input class="input" id="q" type="search" placeholder="Cari nama atau NISN…" value="${esc(S.q)}"></div></div></div>
  ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Murid</th><th>NISN</th><th>Kontak wali</th><th class="num">Kehadiran</th><th class="num">Rata-rata nilai</th><th>Catatan</th><th></th></tr></thead><tbody>${list.map((s) => { const r = stat(s.id), n = rataNilai(s.id), c = notes(s.id), imp = c.filter((x) => x.penting).length; return `<tr><td><div class="flex gap-2 items-center"><div class="avatar">${esc(initials(s.nama))}</div><div><b style="font-weight:500">${esc(s.nama)}</b><div class="small muted">${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</div></div></div></td><td class="muted">${esc(s.nisn)}</td><td><div class="small">${esc(s.ortu || '–')}</div>${s.hp ? `<a class="small" href="tel:${esc(s.hp)}">${esc(s.hp)}</a>` : '<span class="faint small">–</span>'}</td><td class="num"><b class="score ${r.persen >= 90 ? 'good' : r.persen >= 75 ? 'mid' : 'low'}">${r.total ? r.persen + '%' : '–'}</b><div class="xs muted">${r.sakit + r.izin} S/I · ${r.alfa} A</div></td><td class="num">${n == null ? '<span class="faint">–</span>' : `<b class="score ${scoreClass(n)}">${n}</b>`}</td><td>${c.length ? badge(c.length + ' catatan', imp ? 'warn' : 'info') : '<span class="faint small">–</span>'}</td><td class="right"><button class="btn btn-soft btn-sm" data-d="${s.id}">Detail</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="card">${empty('users', 'Tidak ada murid', S.siswa.length ? 'Tidak ada hasil pencarian.' : 'Belum ada murid di kelas ini. Tata Usaha dapat menambahkannya dari menu Pengguna.')}</div>`}</div>`;
  el.querySelector('#q').oninput = debounce((e) => { S.q = e.target.value; render(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(S.q.length, S.q.length); }, 250);
  el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => detail(b.dataset.d));
  if (!S.opened && qs('id') && S.siswa.length) { S.opened = true; detail(qs('id')); }
}

function detail(uid) {
  const s = S.siswa.find((x) => x.id === uid); if (!s) return;
  const abs = Object.entries(S.absensi[uid] || {}).sort((a, b) => b[0].localeCompare(a[0])), r = rekap(abs.map(([, v]) => v));
  const nl = rekapNilai(S.nilai[uid], settings.semesterKey).map((x) => ({ ...x, nama: ref.mapelNama(x.mapelId) })).sort((a, b) => a.nama.localeCompare(b.nama));
  const c = notes(uid);
  const m = modal({ title: s.nama, size: 'lg', body: `
  <div class="flex gap-3 items-center mb-3 wrap"><div class="avatar avatar-lg">${esc(initials(s.nama))}</div><div class="grow"><h3 style="font-size:19px">${esc(s.nama)}</h3><div class="small muted">NISN ${esc(s.nisn)} · Kelas ${esc(wali.nama)} · ${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</div></div></div>
  <div class="grid g-2"><dl class="kv" style="grid-template-columns:110px 1fr"><dt>TTL</dt><dd>${esc(s.tempatLahir || '–')}, ${fmtTanggal(s.tglLahir)}</dd><dt>Alamat</dt><dd>${esc(s.alamat || '–')}</dd><dt>Orang tua / wali</dt><dd>${esc(s.ortu || '–')}</dd><dt>Kontak</dt><dd>${s.hp ? `<a href="tel:${esc(s.hp)}">${esc(s.hp)}</a>` : '–'}</dd><dt>Tahun masuk</dt><dd>${esc(s.tahunMasuk || '–')}</dd></dl>
  <div><div class="label mb-1">Kehadiran (${r.total} hari tercatat)</div><div class="flex gap-1 wrap mb-2">${badge('Hadir ' + r.hadir, 'ok')}${badge('Terlambat ' + r.terlambat, 'warn')}${badge('Sakit ' + r.sakit, 'info')}${badge('Izin ' + r.izin, 'vio')}${badge('Alfa ' + r.alfa, 'err')}</div><div class="progress"><i style="width:${r.persen}%"></i></div><div class="small muted mt-1">Tingkat kehadiran ${r.persen}%</div>
  <div class="berkas mt-2">${abs.slice(0, 4).map(([k, v]) => `<div><span class="grow small">${fmtTanggal(k, { singkat: true })}${v.jam ? ' · ' + v.jam : ''}</span>${statusBadge(v.status)}</div>`).join('') || '<span class="small muted">Belum ada data.</span>'}</div></div></div>
  <div class="divider"></div><div class="label mb-1">Nilai ${semLabel(settings.semesterKey)}</div>
  ${nl.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Mata pelajaran</th><th class="num">Nilai akhir</th><th>Keterangan</th></tr></thead><tbody>${nl.map((x) => `<tr><td>${esc(x.nama)}</td><td class="num"><b class="score ${x.akhir != null ? scoreClass(x.akhir) : ''}">${x.akhir != null ? round1(x.akhir) : '–'}</b></td><td>${x.akhir == null ? badge('Belum lengkap') : x.akhir >= APP.kkm ? badge('Tuntas', 'ok') : badge('Perlu remedial', 'err')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Belum ada nilai semester ini.</p>'}
  <div class="divider"></div><div class="flex between items-center mb-2"><div class="label">Catatan wali kelas</div></div>
  <div class="list mb-3" id="cl">${c.length ? c.map((n) => `<div class="item-card" style="padding:12px"><div class="grow"><div class="flex gap-1 wrap mb-1">${badge(n.kategori, 'info')}${n.penting ? badge('Penting', 'warn') : ''}<span class="small muted">${fmtTanggal(n.tanggal, { singkat: true })} · ${esc(n.namaOleh || '')}</span></div><p class="small">${esc(n.teks)}</p></div><button class="btn btn-danger btn-icon btn-sm" data-dc="${n.id}" aria-label="Hapus catatan">${icon('trash', 15)}</button></div>`).join('') : '<p class="small muted">Belum ada catatan.</p>'}</div>
  <div class="card card-tint card-flat"><div class="row-2"><div class="field"><label>Kategori</label><select class="select" id="ck">${KAT.map((k) => `<option>${k}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><label class="check" style="padding-top:10px"><input type="checkbox" id="cp"><span>Tandai penting (tampil di dashboard)</span></label></div></div><div class="field"><textarea class="textarea" id="ct" rows="2" placeholder="Tulis catatan tentang murid ini…"></textarea></div><button class="btn btn-primary btn-sm" id="ca">${icon('plus', 16)}Tambah catatan</button></div>`,
    actions: [{ label: 'Tutup' }] });
  m.el.querySelector('#ca').onclick = async () => {
    const teks = m.el.querySelector('#ct').value.trim(); if (!teks) return toast('Tulis isi catatan terlebih dahulu.', 'warn');
    await db.push('catatan_siswa/' + uid, { kategori: m.el.querySelector('#ck').value, teks, penting: m.el.querySelector('#cp').checked, tanggal: dateKey(), oleh: user.uid, namaOleh: user.nama });
    toast('Catatan ditambahkan.', 'ok'); m.close(); setTimeout(() => detail(uid), 150);
  };
  m.el.querySelectorAll('[data-dc]').forEach((b) => b.onclick = async () => { if (await confirmBox('Hapus catatan ini?', { danger: true, ok: 'Hapus' })) { await db.remove(`catatan_siswa/${uid}/${b.dataset.dc}`); m.close(); setTimeout(() => detail(uid), 150); } });
}
render();
db.listenBy('users', 'kelasId', wali.id, (v) => { S.siswa = toList(v).filter((u) => u.role === 'siswa' && u.aktif !== false).sort((a, b) => a.nama.localeCompare(b.nama)); render(); });
db.listen('absensi', (v) => { S.absensi = v || {}; render(); });
db.listen('nilai', (v) => { S.nilai = v || {}; render(); });
db.listen('catatan_siswa', (v) => { S.catatan = v || {}; render(); });
