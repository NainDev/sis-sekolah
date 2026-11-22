import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, sortBy, art, fileToData } from '../core/utils.js';
import { badge, empty, modal, toast, confirmBox } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'galeri', title: 'Kelola Galeri' });
const KAT = ['Akademik', 'Ekstrakurikuler', 'Olahraga', 'Seni', 'Upacara', 'Kegiatan'];
let list = [];
function render() {
  el.innerHTML = `<div class="stack"><div class="page-actions"><span class="muted small">${list.length} item dokumentasi</span><button class="btn btn-primary" id="add">${icon('plus')}Tambah foto / video</button></div>
  ${list.length ? `<div class="grid g-4">${sortBy(list, 'tanggal', -1).map((g) => `<div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/10;background:var(--tint)"><img src="${g.url && g.jenis === 'foto' ? g.url : art(g.id + g.judul)}" alt="" style="width:100%;height:100%;object-fit:cover"></div><div style="padding:14px"><div class="flex gap-1 mb-1">${badge(g.kategori, 'info')}${badge(g.jenis === 'video' ? 'Video' : 'Foto')}</div><b style="font:500 14.5px var(--f-head)">${esc(g.judul)}</b><div class="small muted">${fmtTanggal(g.tanggal, { singkat: true })}</div><div class="flex gap-1 mt-2"><button class="btn btn-soft btn-sm grow" data-e="${g.id}">${icon('edit', 15)}Ubah</button><button class="btn btn-danger btn-icon btn-sm" data-d="${g.id}" aria-label="Hapus">${icon('trash', 15)}</button></div></div></div>`).join('')}</div>` : `<div class="card">${empty('image', 'Galeri kosong', 'Tambahkan foto atau video kegiatan sekolah.')}</div>`}</div>`;
  el.querySelector('#add').onclick = () => form();
  el.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => form(list.find((x) => x.id === b.dataset.e)));
  el.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { if (await confirmBox('Hapus item galeri ini?', { danger: true, ok: 'Hapus' })) { await db.remove('galeri/' + b.dataset.d); toast('Dihapus.', 'ok'); } });
}
function form(g) {
  let foto = g?.jenis === 'foto' ? g.url : '';
  modal({ title: g ? 'Ubah item galeri' : 'Tambah ke galeri', body: `<div class="field"><label>Judul</label><input class="input" id="j" value="${esc(g?.judul || '')}"></div><div class="row-3"><div class="field"><label>Jenis</label><select class="select" id="jn"><option value="foto" ${g?.jenis !== 'video' ? 'selected' : ''}>Foto</option><option value="video" ${g?.jenis === 'video' ? 'selected' : ''}>Video (YouTube)</option></select></div><div class="field"><label>Kategori</label><select class="select" id="k">${KAT.map((k) => `<option ${g?.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div><div class="field"><label>Tanggal</label><input class="input" id="t" type="date" value="${g?.tanggal || dateKey()}"></div></div>
  <div class="field" id="fFoto"><label>Foto <span class="faint">(opsional; bila kosong dipakai ilustrasi bawaan)</span></label><div class="upl"><div class="ico">${icon('image', 20)}</div><div class="grow"><b id="fn">${foto ? 'Foto terpilih' : 'Pilih foto'}</b><small>JPG/PNG, otomatis dikompres</small></div><input type="file" id="fl" accept="image/*"></div></div>
  <div class="field" id="fVid"><label>Tautan YouTube</label><input class="input" id="u" placeholder="https://www.youtube.com/watch?v=…" value="${g?.jenis === 'video' ? esc(g.url || '') : ''}"></div>
  <div class="field"><label>Deskripsi</label><textarea class="textarea" id="d" rows="3">${esc(g?.deskripsi || '')}</textarea></div>`,
    onMount: (m) => { const sw = () => { const v = m.el.querySelector('#jn').value === 'video'; m.el.querySelector('#fFoto').hidden = v; m.el.querySelector('#fVid').hidden = !v; }; m.el.querySelector('#jn').onchange = sw; sw(); m.el.querySelector('#fl').onchange = async (e) => { try { const f = await fileToData(e.target.files[0], { maxDim: 1100, quality: 0.7 }); foto = f.data; m.el.querySelector('#fn').textContent = f.nama; } catch (er) { toast(er.message, 'err'); } }; },
    actions: [{ label: 'Batal' }, { label: 'Simpan', kind: 'primary', onClick: async (m) => {
      const v = (id) => m.el.querySelector('#' + id).value.trim(); if (!v('j')) throw new Error('Judul wajib diisi.');
      const jenis = v('jn'), u = v('u'); if (jenis === 'video' && u && !/(youtube\.com|youtu\.be)/i.test(u)) throw new Error('Gunakan tautan YouTube yang valid.');
      const data = { judul: v('j'), jenis, kategori: v('k'), tanggal: v('t') || dateKey(), deskripsi: v('d'), url: jenis === 'video' ? u : foto };
      g ? await db.set('galeri/' + g.id, data) : await db.push('galeri', data); toast('Galeri diperbarui.', 'ok');
    } }] });
}
db.listen('galeri', (v) => { list = toList(v); render(); });
