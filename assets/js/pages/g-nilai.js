import { mountPortal } from '../layout/portal.js';
import { db } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, scoreClass, round1, avg } from '../core/utils.js';
import { loadRef, pasanganGuru, siswaKelas, semLabel } from '../core/akademik.js';
import { empty, toast } from '../core/ui.js';
import { APP } from '../config.js';

const { user, settings, el } = await mountPortal({ role: 'guru', active: 'nilai', title: 'Input Nilai', sub: 'Tugas, UH, UTS, dan UAS per kelas' });
const ref = await loadRef(); const pairs = await pasanganGuru(user.uid);
const JENIS = ['UH', 'UTS', 'UAS', 'Tugas'];
let sel = pairs[0] ? `${pairs[0].kelasId}|${pairs[0].mapelId}` : '', siswa = [], nilai = {}, pen = 'baru', draft = { jenis: 'UH', judul: '', tanggal: dateKey() };
const sem = settings.semesterKey;

async function load() { const [k] = sel.split('|'); siswa = await siswaKelas(k); const all = (await db.get('nilai')) || {}; nilai = Object.fromEntries(siswa.map((s) => [s.id, all[s.id] || {}])); render(); }
function daftarPenilaian() {
  const [, m] = sel.split('|'), map = new Map();
  Object.values(nilai).forEach((o) => Object.values(o).forEach((n) => { if (n.mapelId === m && n.semester === sem && !n.tugasId) map.set(n.jenis + '|' + n.judul, { jenis: n.jenis, judul: n.judul, tanggal: n.tanggal }); }));
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}
const entry = (uid, p) => { const [, m] = sel.split('|'); return Object.entries(nilai[uid] || {}).find(([, n]) => n.mapelId === m && n.semester === sem && n.jenis === p.jenis && n.judul === p.judul && !n.tugasId); };

function render() {
  if (!pairs.length) { el.innerHTML = `<div class="card">${empty('clipboard', 'Belum ada kelas', 'Anda belum memiliki jadwal mengajar. Hubungi admin.')}</div>`; return; }
  const [k, m] = sel.split('|'), list = daftarPenilaian();
  const cur = pen === 'baru' ? draft : list.find((x) => x.key === pen) || draft;
  const vals = siswa.map((s) => { const e = pen === 'baru' ? null : entry(s.id, cur); return e ? e[1].nilai : ''; }).filter((v) => v !== '').map(Number);
  el.innerHTML = `<div class="stack"><div class="card"><div class="row-3"><div class="field"><label>Kelas & mata pelajaran</label><select class="select" id="sel">${pairs.map((p) => `<option value="${p.kelasId}|${p.mapelId}" ${sel === p.kelasId + '|' + p.mapelId ? 'selected' : ''}>Kelas ${esc(ref.kelas[p.kelasId]?.nama)} · ${esc(ref.mapelNama(p.mapelId))}</option>`).join('')}</select></div>
  <div class="field"><label>Penilaian</label><select class="select" id="pen"><option value="baru" ${pen === 'baru' ? 'selected' : ''}>+ Penilaian baru</option>${list.map((x) => `<option value="${esc(x.key)}" ${pen === x.key ? 'selected' : ''}>${esc(x.judul)} (${x.jenis})</option>`).join('')}</select></div>
  <div class="field"><label>Semester</label><input class="input" value="${semLabel(sem)}" readonly></div></div>
  ${pen === 'baru' ? `<div class="row-3"><div class="field"><label>Jenis</label><select class="select" id="jn">${JENIS.map((j) => `<option ${draft.jenis === j ? 'selected' : ''}>${j}</option>`).join('')}</select></div><div class="field"><label>Judul penilaian</label><input class="input" id="jd" placeholder="mis. Ulangan Harian 3" value="${esc(draft.judul)}"></div><div class="field"><label>Tanggal</label><input class="input" id="tg" type="date" value="${draft.tanggal}"></div></div>` : ''}</div>
  <div class="card"><div class="card-head"><h3>Daftar nilai · Kelas ${esc(ref.kelas[k]?.nama)}</h3>${vals.length ? `<span class="small muted">Rata-rata ${round1(avg(vals))} · tertinggi ${Math.max(...vals)} · terendah ${Math.min(...vals)}</span>` : ''}</div>
  ${siswa.length ? `<div class="table-wrap"><table class="table"><thead><tr><th style="width:44px">No</th><th>Nama siswa</th><th>NISN</th><th style="width:130px">Nilai (0–100)</th></tr></thead><tbody>${siswa.map((s, i) => { const e = pen === 'baru' ? null : entry(s.id, cur); return `<tr data-u="${s.id}"><td>${i + 1}</td><td>${esc(s.nama)}</td><td class="muted">${esc(s.nisn)}</td><td><input class="input nv" type="number" min="0" max="100" inputmode="numeric" value="${e ? e[1].nilai : ''}" style="padding:8px"></td></tr>`; }).join('')}</tbody></table></div>
  <div class="flex between items-center wrap gap-2 mt-3"><span class="small muted">Kosongkan kolom untuk menghapus nilai. KKM ${APP.kkm}.</span><button class="btn btn-primary" id="save">${icon('save')}Simpan nilai</button></div>` : empty('users', 'Tidak ada siswa', 'Belum ada siswa di kelas ini.')}</div></div>`;
  el.querySelector('#sel').onchange = (e) => { sel = e.target.value; pen = 'baru'; load(); };
  el.querySelector('#pen').onchange = (e) => { pen = e.target.value; render(); };
  ['jn:jenis', 'jd:judul', 'tg:tanggal'].forEach((p) => { const [id, key] = p.split(':'), n = el.querySelector('#' + id); if (n) n.oninput = () => { draft[key] = n.value; }; });
  el.querySelectorAll('.nv').forEach((i) => i.oninput = () => { const v = i.value; i.style.borderColor = v !== '' && (v < 0 || v > 100) ? 'var(--err)' : ''; });
  el.querySelector('#save')?.addEventListener('click', async (e) => {
    const p = pen === 'baru' ? { ...draft } : cur;
    if (!p.judul.trim()) return toast('Isi judul penilaian terlebih dahulu.', 'warn');
    const upd = {}; let n = 0, rm = 0;
    for (const tr of el.querySelectorAll('tr[data-u]')) {
      const uid = tr.dataset.u, raw = tr.querySelector('.nv').value, ex = entry(uid, p);
      if (raw === '') { if (ex) { upd[`nilai/${uid}/${ex[0]}`] = null; rm++; } continue; }
      const v = Number(raw); if (isNaN(v) || v < 0 || v > 100) return toast('Nilai harus berupa angka 0–100.', 'warn');
      upd[`nilai/${uid}/${ex ? ex[0] : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)}`] = { mapelId: m, jenis: p.jenis, judul: p.judul.trim(), nilai: v, semester: sem, tanggal: ex ? ex[1].tanggal : p.tanggal }; n++;
    }
    if (!Object.keys(upd).length) return toast('Belum ada nilai yang diisi.', 'warn');
    e.target.disabled = true;
    try { await db.update('', upd); toast(`Nilai tersimpan (${n} siswa${rm ? `, ${rm} dihapus` : ''}).`, 'ok'); pen = 'baru'; draft = { jenis: 'UH', judul: '', tanggal: dateKey() }; await load(); } catch (er) { console.error(er); toast('Gagal menyimpan nilai.', 'err'); e.target.disabled = false; }
  });
}
await load();
