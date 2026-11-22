import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, sortBy } from '../core/utils.js';
import { badge, empty, modal, toast, confirmBox } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'pesan', title: 'Pesan Masuk' });
let list = [], filter = 'semua';
const fmt = (t) => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
function render() {
  const rows = sortBy(list, 'tanggal', -1).filter((p) => filter === 'semua' || !p.dibaca);
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="tabs"><button class="tab ${filter === 'semua' ? 'active' : ''}" data-f="semua">Semua (${list.length})</button><button class="tab ${filter === 'baru' ? 'active' : ''}" data-f="baru">Belum dibaca (${list.filter((p) => !p.dibaca).length})</button></div>${list.some((p) => !p.dibaca) ? `<button class="btn btn-ghost" id="all">${icon('check')}Tandai semua dibaca</button>` : ''}</div>
  <div class="list">${rows.length ? rows.map((p) => `<div class="item-card clickable" data-id="${p.id}" style="${p.dibaca ? '' : 'border-color:#b7d2fb;background:#f7fbff'}"><div class="ico">${icon(p.dibaca ? 'mail' : 'bell')}</div><div class="grow"><h4 ${p.dibaca ? 'style="font-weight:400"' : ''}>${esc(p.subjek)}</h4><p class="small muted truncate" style="max-width:640px">${esc(p.isi)}</p><div class="meta"><span>${esc(p.nama)} · ${esc(p.email)}</span><span>${fmt(p.tanggal)}</span></div></div>${p.dibaca ? '' : badge('Baru', 'err')}</div>`).join('') : `<div class="card">${empty('mail', 'Tidak ada pesan', 'Pesan dari formulir Kontak akan muncul di sini.')}</div>`}</div></div>`;
  el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; render(); });
  el.querySelector('#all')?.addEventListener('click', async () => { await db.update('', Object.fromEntries(list.filter((p) => !p.dibaca).map((p) => [`pesan/${p.id}/dibaca`, true]))); });
  el.querySelectorAll('.item-card').forEach((c) => c.onclick = () => open(list.find((x) => x.id === c.dataset.id)));
}
function open(p) {
  if (!p.dibaca) db.set(`pesan/${p.id}/dibaca`, true);
  modal({ title: p.subjek, body: `<p class="small muted mb-2">Dari <b>${esc(p.nama)}</b> (${esc(p.email)}) · ${fmt(p.tanggal)}</p><div class="card card-tint card-flat" style="white-space:pre-wrap">${esc(p.isi)}</div>`, actions: [{ label: 'Hapus', kind: 'danger', onClick: async () => { if (!(await confirmBox('Hapus pesan ini?', { danger: true, ok: 'Hapus' }))) return false; await db.remove('pesan/' + p.id); toast('Pesan dihapus.', 'ok'); } }, { label: 'Tutup' }, { label: 'Balas lewat email', kind: 'primary', icon: 'send', keepOpen: true, onClick: () => { location.href = `mailto:${p.email}?subject=${encodeURIComponent('Re: ' + p.subjek)}`; } }] });
}
db.listen('pesan', (v) => { list = toList(v); render(); });
