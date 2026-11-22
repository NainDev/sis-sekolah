import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, sisaWaktu, sortBy, warnaMapel, qs, fileToData, fmtBytes } from '../core/utils.js';
import { loadRef, statusTugas, STATUS_TUGAS } from '../core/akademik.js';
import { empty, badge, modal, toast, tabs } from '../core/ui.js';

const { user, el } = await mountPortal({ role: 'siswa', active: 'tugas', title: 'Materi & Tugas' });
const ref = await loadRef();
const S = { materi: [], tugas: [], kumpul: {}, tab: qs('tab') === 'tugas' ? 'tugas' : 'materi', mapel: 'semua', filter: 'semua' };
let opened = false;

function render() {
  const mapelIds = [...new Set([...S.materi, ...S.tugas].map((x) => x.mapelId))];
  const chips = `<div class="chips mb-3"><button class="chip ${S.mapel === 'semua' ? 'active' : ''}" data-m="semua">Semua mapel</button>${mapelIds.map((m) => `<button class="chip ${S.mapel === m ? 'active' : ''}" data-m="${m}">${esc(ref.mapelNama(m))}</button>`).join('')}</div>`;
  let body = '';
  if (S.tab === 'materi') {
    const l = sortBy(S.materi.filter((m) => S.mapel === 'semua' || m.mapelId === S.mapel), 'tanggal', -1);
    body = `<div class="list">${l.length ? l.map((m) => `<div class="item-card"><div class="ico" style="color:${warnaMapel(m.mapelId)}">${icon('book-open')}</div><div class="grow"><h4>${esc(m.judul)}</h4><p class="small muted">${esc(m.deskripsi)}</p><div class="meta"><span>${esc(ref.mapelNama(m.mapelId))}</span><span>${esc(ref.guruNama(m.guruUid))}</span><span>${fmtTanggal(m.tanggal, { singkat: true })}</span></div></div>${m.tautan ? `<a class="btn btn-soft btn-sm" href="${esc(m.tautan)}" target="_blank" rel="noopener">${icon('external', 16)}Buka</a>` : ''}</div>`).join('') : empty('book-open', 'Belum ada materi', 'Guru belum mengunggah materi untuk pilihan ini.')}</div>`;
  } else {
    const all = S.tugas.map((t) => ({ ...t, st: statusTugas(t, S.kumpul[t.id]) }));
    const F = { semua: () => true, belum: (t) => t.st === 'belum' || t.st === 'terlambat', selesai: (t) => t.st.startsWith('terkumpul'), dinilai: (t) => t.st === 'dinilai' };
    const l = all.filter((t) => (S.mapel === 'semua' || t.mapelId === S.mapel) && F[S.filter](t)).sort((a, b) => (a.st === 'dinilai') - (b.st === 'dinilai') || a.tenggat.localeCompare(b.tenggat));
    const cnt = { belum: all.filter(F.belum).length, selesai: all.filter(F.selesai).length, dinilai: all.filter(F.dinilai).length };
    body = `<div class="grid g-3 mb-3"><div class="tile"><div class="ico warn">${icon('clipboard')}</div><div><b>${cnt.belum}</b><span>Belum dikumpul</span></div></div><div class="tile"><div class="ico">${icon('send')}</div><div><b>${cnt.selesai}</b><span>Menunggu penilaian</span></div></div><div class="tile"><div class="ico ok">${icon('check-circle')}</div><div><b>${cnt.dinilai}</b><span>Sudah dinilai</span></div></div></div>
    <div class="tabs mb-3" id="ft">${[['semua', 'Semua'], ['belum', 'Belum'], ['selesai', 'Terkumpul'], ['dinilai', 'Dinilai']].map(([k, t]) => `<button class="tab ${S.filter === k ? 'active' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
    <div class="list">${l.length ? l.map((t) => { const s = STATUS_TUGAS[t.st], w = sisaWaktu(t.tenggat), k = S.kumpul[t.id]; return `<div class="item-card clickable" data-id="${t.id}"><div class="ico" style="color:${warnaMapel(t.mapelId)}">${icon('clipboard')}</div><div class="grow"><h4>${esc(t.judul)}</h4><div class="meta"><span>${esc(ref.mapelNama(t.mapelId))}</span><span>Tenggat ${fmtTanggal(t.tenggat, { singkat: true })}${t.st === 'belum' ? ' · ' + w.teks : ''}</span></div></div><div style="text-align:right">${badge(s.label, s.kind)}${k?.nilai != null ? `<div class="score ${k.nilai >= 75 ? 'good' : 'low'} mt-1">${k.nilai}</div>` : ''}</div></div>`; }).join('') : empty('clipboard', 'Tidak ada tugas', 'Belum ada tugas pada filter ini.')}</div>`;
  }
  el.innerHTML = `<div class="stack"><div class="tabs" id="mt"><button class="tab ${S.tab === 'materi' ? 'active' : ''}" data-t="materi">Materi (${S.materi.length})</button><button class="tab ${S.tab === 'tugas' ? 'active' : ''}" data-t="tugas">Tugas (${S.tugas.length})</button></div><div>${chips}${body}</div></div>`;
  el.querySelectorAll('#mt .tab').forEach((b) => b.onclick = () => { S.tab = b.dataset.t; render(); });
  el.querySelectorAll('.chip').forEach((b) => b.onclick = () => { S.mapel = b.dataset.m; render(); });
  el.querySelectorAll('#ft .tab').forEach((b) => b.onclick = () => { S.filter = b.dataset.f; render(); });
  el.querySelectorAll('.item-card.clickable').forEach((c) => c.onclick = () => detail(c.dataset.id));
  if (!opened && qs('id') && S.tugas.length) { opened = true; detail(qs('id')); }
}

function detail(id) {
  const t = S.tugas.find((x) => x.id === id); if (!t) return;
  const k = S.kumpul[id], st = statusTugas(t, k), s = STATUS_TUGAS[st], w = sisaWaktu(t.tenggat);
  const locked = k?.nilai != null; let file = k?.berkas || null;
  modal({ title: t.judul, size: 'lg',
    body: `<div class="flex gap-1 wrap mb-2">${badge(ref.mapelNama(t.mapelId), 'info')}${badge(s.label, s.kind)}<span class="badge">Tenggat ${fmtTanggal(t.tenggat, { hari: true })}${st === 'belum' ? ' · ' + w.teks : ''}</span></div>
    <p class="mb-3">${esc(t.deskripsi)}</p><p class="small muted mb-3">Guru: ${esc(ref.guruNama(t.guruUid))}</p>
    ${locked ? `<div class="alert ok mb-3">${icon('award')}<div><b>Nilai: ${k.nilai}</b>${k.catatan ? `<br>${esc(k.catatan)}` : ''}</div></div>` : ''}
    <div class="divider"></div><h4 class="mb-2">${k ? 'Jawaban kamu' : 'Kumpulkan tugas'}</h4>
    <div class="field"><label>Jawaban / keterangan</label><textarea class="textarea" id="jw" ${locked ? 'disabled' : ''} placeholder="Tulis jawaban singkat atau keterangan pengerjaan…">${esc(k?.teks || '')}</textarea></div>
    <div class="field"><label>Tautan hasil kerja <span class="faint">(opsional)</span></label><input class="input" id="tl" type="url" placeholder="https://drive.google.com/…" value="${esc(k?.tautan || '')}" ${locked ? 'disabled' : ''}></div>
    <div class="field"><label>Lampiran foto/PDF <span class="faint">(opsional)</span></label><div class="upl" id="upl"><div class="ico">${icon('upload', 20)}</div><div class="grow"><b id="fn">${file ? esc(file.nama) : 'Pilih berkas'}</b><small id="fs">${file ? fmtBytes(file.ukuran) : 'JPG, PNG, atau PDF (maks 400 KB)'}</small></div>${locked ? '' : '<input type="file" id="fl" accept="image/*,application/pdf">'}</div></div>
    ${k ? `<p class="small muted">Terakhir dikirim ${new Date(k.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>` : ''}`,
    onMount: (m) => { const fl = m.el.querySelector('#fl'); if (fl) fl.onchange = async () => { try { file = await fileToData(fl.files[0], { maxBytes: 400000 }); m.el.querySelector('#fn').textContent = file.nama; m.el.querySelector('#fs').textContent = fmtBytes(file.ukuran); } catch (e) { toast(e.message, 'err'); fl.value = ''; } }; },
    actions: locked ? [{ label: 'Tutup' }] : [{ label: 'Batal' }, { label: k ? 'Perbarui jawaban' : 'Kirim tugas', kind: 'primary', icon: 'send', onClick: async (m) => {
      const teks = m.el.querySelector('#jw').value.trim(), tautan = m.el.querySelector('#tl').value.trim();
      if (!teks && !tautan && !file) throw new Error('Isi jawaban, tautan, atau lampiran terlebih dahulu.');
      if (tautan && !/^https?:\/\//i.test(tautan)) throw new Error('Tautan harus diawali http:// atau https://');
      await db.set(`pengumpulan/${user.uid}/${id}`, { waktu: Date.now(), teks, tautan, ...(file ? { berkas: file } : {}) });
      toast('Tugas berhasil dikirim.', 'ok');
    } }] });
}

db.listen('materi', (v) => { S.materi = toList(v).filter((m) => m.kelasId === user.kelasId); render(); });
db.listen('pengumpulan/' + user.uid, (v) => { S.kumpul = v || {}; render(); });
S.tugas = await db.listBy('tugas', 'kelasId', user.kelasId);
render();
