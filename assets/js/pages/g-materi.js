import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, sortBy, warnaMapel, rid } from '../core/utils.js';
import { loadRef, pasanganGuru, siswaKelas, statusTugas, STATUS_TUGAS } from '../core/akademik.js';
import { empty, badge, modal, toast, confirmBox } from '../core/ui.js';

const { user, el } = await mountPortal({ role: 'guru', active: 'materi', title: 'Materi & Tugas' });
const ref = await loadRef();
const pairs = await pasanganGuru(user.uid);
let sel = pairs[0] ? `${pairs[0].kelasId}|${pairs[0].mapelId}` : '', tab = 'materi', materi = [], tugas = [];

function cur() { const [k, m] = sel.split('|'); return { k, m }; }
function render() {
  const { k, m } = cur();
  const mm = sortBy(materi.filter((x) => x.kelasId === k && x.mapelId === m), 'tanggal', -1), tt = sortBy(tugas.filter((x) => x.kelasId === k && x.mapelId === m), 'tenggat', -1);
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="flex gap-2 wrap items-center"><select class="select" id="sel" style="min-width:260px">${pairs.map((p) => `<option value="${p.kelasId}|${p.mapelId}" ${sel === p.kelasId + '|' + p.mapelId ? 'selected' : ''}>Kelas ${esc(ref.kelas[p.kelasId]?.nama)} · ${esc(ref.mapelNama(p.mapelId))}</option>`).join('')}</select><div class="tabs" id="tb"><button class="tab ${tab === 'materi' ? 'active' : ''}" data-t="materi">Materi (${mm.length})</button><button class="tab ${tab === 'tugas' ? 'active' : ''}" data-t="tugas">Tugas (${tt.length})</button></div></div><button class="btn btn-primary" id="add">${icon('plus')}${tab === 'materi' ? 'Tambah materi' : 'Buat tugas'}</button></div>
  <div class="list">${tab === 'materi' ? (mm.length ? mm.map((x) => `<div class="item-card"><div class="ico" style="color:${warnaMapel(m)}">${icon('book-open')}</div><div class="grow"><h4>${esc(x.judul)}</h4><p class="small muted">${esc(x.deskripsi)}</p><div class="meta"><span>${fmtTanggal(x.tanggal, { singkat: true })}</span>${x.tautan ? `<a href="${esc(x.tautan)}" target="_blank" rel="noopener">Tautan materi</a>` : ''}</div></div><div class="flex gap-1"><button class="btn btn-soft btn-icon btn-sm" data-e="${x.id}" aria-label="Ubah">${icon('edit', 16)}</button><button class="btn btn-danger btn-icon btn-sm" data-d="${x.id}" aria-label="Hapus">${icon('trash', 16)}</button></div></div>`).join('') : empty('book-open', 'Belum ada materi', 'Klik "Tambah materi" untuk membagikan materi ke siswa.')) : (tt.length ? tt.map((x) => `<div class="item-card"><div class="ico" style="color:${warnaMapel(m)}">${icon('clipboard')}</div><div class="grow"><h4>${esc(x.judul)}</h4><p class="small muted">${esc(x.deskripsi)}</p><div class="meta"><span>Tenggat ${fmtTanggal(x.tenggat, { hari: true, singkat: true })}</span></div></div><div class="flex gap-1 wrap" style="justify-content:flex-end"><button class="btn btn-primary btn-sm" data-v="${x.id}">${icon('check-circle', 16)}Pengumpulan</button><button class="btn btn-soft btn-icon btn-sm" data-e="${x.id}" aria-label="Ubah">${icon('edit', 16)}</button><button class="btn btn-danger btn-icon btn-sm" data-d="${x.id}" aria-label="Hapus">${icon('trash', 16)}</button></div></div>`).join('') : empty('clipboard', 'Belum ada tugas', 'Buat tugas baru untuk kelas ini.'))}</div></div>`;
  el.querySelector('#sel').onchange = (e) => { sel = e.target.value; render(); };
  el.querySelectorAll('#tb .tab').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
  el.querySelector('#add').onclick = () => form();
  el.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => form((tab === 'materi' ? mm : tt).find((x) => x.id === b.dataset.e)));
  el.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { if (await confirmBox('Hapus item ini? Tindakan tidak dapat dibatalkan.', { danger: true, ok: 'Hapus' })) { await db.remove(`${tab}/${b.dataset.d}`); toast('Dihapus.', 'ok'); await reload(); } });
  el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => kumpul(tt.find((x) => x.id === b.dataset.v)));
}

function form(item) {
  const { k, m } = cur(), isM = tab === 'materi';
  modal({ title: `${item ? 'Ubah' : isM ? 'Tambah materi' : 'Buat tugas'} · Kelas ${ref.kelas[k]?.nama}`, body: `<div class="field"><label>Judul</label><input class="input" id="j" value="${esc(item?.judul || '')}"></div><div class="field"><label>${isM ? 'Deskripsi' : 'Instruksi pengerjaan'}</label><textarea class="textarea" id="d">${esc(item?.deskripsi || '')}</textarea></div>${isM ? `<div class="field"><label>Tautan materi <span class="faint">(opsional)</span></label><input class="input" id="u" type="url" placeholder="https://…" value="${esc(item?.tautan || '')}"></div>` : `<div class="field"><label>Tenggat pengumpulan</label><input class="input" id="t" type="date" value="${item?.tenggat || dateKey(new Date(Date.now() + 7 * 864e5))}"></div>`}`,
    actions: [{ label: 'Batal' }, { label: 'Simpan', kind: 'primary', onClick: async (mm) => {
      const v = (id) => mm.el.querySelector('#' + id)?.value.trim(); if (!v('j') || !v('d')) throw new Error('Judul dan deskripsi wajib diisi.');
      const u = v('u'); if (u && !/^https?:\/\//i.test(u)) throw new Error('Tautan harus diawali http:// atau https://');
      const base = { kelasId: k, mapelId: m, guruUid: user.uid, judul: v('j'), deskripsi: v('d') };
      const data = isM ? { ...base, tanggal: item?.tanggal || dateKey(), tautan: u || '' } : { ...base, tanggal: item?.tanggal || dateKey(), tenggat: v('t') };
      if (!isM && !data.tenggat) throw new Error('Tenggat wajib diisi.');
      item ? await db.set(`${tab}/${item.id}`, data) : await db.set(`${tab}/${isM ? 'm' : 't'}_${k}_${m}_${rid()}`, data);
      toast('Tersimpan.', 'ok'); await reload();
    } }] });
}

async function kumpul(t) {
  const siswa = await siswaKelas(t.kelasId), rows = (await db.get('pengumpulan')) || {};
  modal({ title: `Pengumpulan: ${t.judul}`, size: 'lg', body: `<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th><th>Status</th><th>Jawaban</th><th style="width:90px">Nilai</th><th>Catatan</th></tr></thead><tbody>${siswa.map((s) => { const k = rows[s.id]?.[t.id], st = statusTugas(t, k), x = STATUS_TUGAS[st]; return `<tr data-u="${s.id}"><td>${esc(s.nama)}</td><td>${badge(x.label, x.kind)}</td><td class="small">${k ? `${esc(k.teks || '')}${k.tautan ? ` <a href="${esc(k.tautan)}" target="_blank" rel="noopener">tautan</a>` : ''}${k.berkas ? ` <a href="${k.berkas.data}" download="${esc(k.berkas.nama)}">${esc(k.berkas.nama)}</a>` : ''}` : '<span class="faint">–</span>'}</td><td><input class="input nl" type="number" min="0" max="100" ${k ? '' : 'disabled'} value="${k?.nilai ?? ''}" style="padding:8px"></td><td><input class="input ct" ${k ? '' : 'disabled'} value="${esc(k?.catatan || '')}" style="padding:8px"></td></tr>`; }).join('')}</tbody></table></div>`,
    actions: [{ label: 'Tutup' }, { label: 'Simpan nilai', kind: 'primary', onClick: async (mm) => {
      const upd = {};
      for (const tr of mm.el.querySelectorAll('tr[data-u]')) {
        const uid = tr.dataset.u, k = rows[uid]?.[t.id], n = tr.querySelector('.nl').value; if (!k) continue;
        const ct = tr.querySelector('.ct').value.trim();
        if (n === '') { if (k.nilai != null) { upd[`pengumpulan/${uid}/${t.id}/nilai`] = null; upd[`pengumpulan/${uid}/${t.id}/catatan`] = null; } continue; }
        const val = Math.min(100, Math.max(0, Number(n))); upd[`pengumpulan/${uid}/${t.id}/nilai`] = val; upd[`pengumpulan/${uid}/${t.id}/catatan`] = ct || null;
        const ex = Object.entries((await db.get('nilai/' + uid)) || {}).find(([, x]) => x.tugasId === t.id);
        upd[`nilai/${uid}/${ex ? ex[0] : 'tg_' + t.id}`] = { mapelId: t.mapelId, jenis: 'Tugas', judul: t.judul, nilai: val, semester: (await db.get('pengaturan/semesterKey')) || '', tanggal: dateKey(), tugasId: t.id };
      }
      if (Object.keys(upd).length) await db.update('', upd); toast('Nilai tugas disimpan.', 'ok');
    } }] });
}

async function reload() { materi = toList(await db.get('materi')).filter((x) => x.guruUid === user.uid); tugas = toList(await db.get('tugas')).filter((x) => x.guruUid === user.uid); render(); }
await reload();
