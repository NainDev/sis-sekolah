import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, fmtTanggal, sortBy, debounce, url } from '../core/utils.js';
import { badge, empty, modal, toast, confirmBox } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'berita', title: 'Berita & Pengumuman' });
const KAT = ['Berita', 'Pengumuman', 'Artikel', 'Prestasi'];
let list = [], q = '';
function render() {
  const t = q.toLowerCase(), rows = sortBy(list, 'tanggal', -1).filter((b) => !t || (b.judul + b.kategori).toLowerCase().includes(t));
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="input-group">${icon('search')}<input class="input" id="q" type="search" placeholder="Cari berita…" value="${esc(q)}"></div><button class="btn btn-primary" id="add">${icon('plus')}Tulis berita</button></div>
  ${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Judul</th><th>Kategori</th><th>Tanggal</th><th class="num">Dilihat</th><th></th></tr></thead><tbody>${rows.map((b) => `<tr><td style="min-width:260px"><b style="font-weight:500">${esc(b.judul)}</b>${b.pinned ? ` ${badge('Sorotan', 'vio')}` : ''}</td><td>${badge(b.kategori, 'info')}</td><td class="nowrap">${fmtTanggal(b.tanggal, { singkat: true })}</td><td class="num">${b.dilihat || 0}</td><td class="right nowrap"><a class="btn btn-ghost btn-icon btn-sm" href="${url('berita.html')}?id=${b.id}" target="_blank" rel="noopener" aria-label="Lihat">${icon('eye', 16)}</a> <button class="btn btn-soft btn-icon btn-sm" data-e="${b.id}" aria-label="Ubah">${icon('edit', 16)}</button> <button class="btn btn-danger btn-icon btn-sm" data-d="${b.id}" aria-label="Hapus">${icon('trash', 16)}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="card">${empty('newspaper', 'Belum ada berita', 'Klik "Tulis berita" untuk memulai.')}</div>`}</div>`;
  el.querySelector('#q').oninput = debounce((e) => { q = e.target.value; render(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(q.length, q.length); }, 250);
  el.querySelector('#add').onclick = () => form();
  el.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => form(list.find((x) => x.id === b.dataset.e)));
  el.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { if (await confirmBox('Hapus berita ini dari situs?', { danger: true, ok: 'Hapus' })) { await db.remove('berita/' + b.dataset.d); toast('Berita dihapus.', 'ok'); } });
}
function form(b) {
  modal({ title: b ? 'Ubah berita' : 'Tulis berita', size: 'lg', body: `<div class="field"><label>Judul</label><input class="input" id="j" value="${esc(b?.judul || '')}"></div><div class="row-3"><div class="field"><label>Kategori</label><select class="select" id="k">${KAT.map((k) => `<option ${b?.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div><div class="field"><label>Tanggal</label><input class="input" id="t" type="date" value="${b?.tanggal || dateKey()}"></div><div class="field"><label>Penulis</label><input class="input" id="p" value="${esc(b?.penulis || 'Humas Sekolah')}"></div></div><div class="field"><label>Ringkasan</label><textarea class="textarea" id="r" rows="2" maxlength="220">${esc(b?.ringkasan || '')}</textarea><span class="hint">Tampil pada kartu daftar berita (maks 220 karakter).</span></div><div class="field"><label>Isi berita</label><textarea class="textarea" id="i" rows="9">${esc(b?.isi || '')}</textarea><span class="hint">Pisahkan paragraf dengan satu baris kosong.</span></div><label class="check"><input type="checkbox" id="pn" ${b?.pinned ? 'checked' : ''}><span>Jadikan sorotan utama di beranda</span></label>`,
    actions: [{ label: 'Batal' }, { label: 'Simpan', kind: 'primary', onClick: async (m) => {
      const v = (id) => m.el.querySelector('#' + id).value.trim(); if (!v('j') || !v('r') || !v('i')) throw new Error('Judul, ringkasan, dan isi wajib diisi.');
      const data = { judul: v('j'), kategori: v('k'), tanggal: v('t') || dateKey(), penulis: v('p') || 'Humas Sekolah', ringkasan: v('r'), isi: m.el.querySelector('#i').value.trim(), pinned: m.el.querySelector('#pn').checked, dilihat: b?.dilihat || 0 };
      if (data.pinned) for (const o of list.filter((x) => x.pinned && x.id !== b?.id)) await db.set(`berita/${o.id}/pinned`, false);
      b ? await db.set('berita/' + b.id, data) : await db.push('berita', data); toast('Berita tersimpan.', 'ok');
    } }] });
}
db.listen('berita', (v) => { list = toList(v); render(); });
