import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { createAccount, adminResetPassword } from '../core/auth.js';
import { icon } from '../core/icons.js';
import { esc, debounce, initials, dateKey } from '../core/utils.js';
import { loadRef } from '../core/akademik.js';
import { badge, empty, modal, toast, confirmBox } from '../core/ui.js';

const { el } = await mountPortal({ role: 'admin', active: 'pengguna', title: 'Manajemen Pengguna' });
const ref = await loadRef();
let users = [], tab = 'siswa', q = '', kf = 'semua';
const LBL = { siswa: ['Siswa', 'NISN'], guru: ['Guru', 'NIP'], admin: ['Admin / TU', 'Username'] };
const local = db.mode === 'local';

function render() {
  const t = q.toLowerCase(), rows = users.filter((u) => u.role === tab && (kf === 'semua' || u.kelasId === kf) && (!t || (u.nama + (u.username || '')).toLowerCase().includes(t))).sort((a, b) => a.nama.localeCompare(b.nama));
  el.innerHTML = `<div class="stack"><div class="page-actions"><div class="tabs" id="tb">${Object.entries(LBL).map(([k, [l]]) => `<button class="tab ${tab === k ? 'active' : ''}" data-t="${k}">${l} (${users.filter((u) => u.role === k).length})</button>`).join('')}</div><button class="btn btn-primary" id="add">${icon('plus')}Tambah ${LBL[tab][0].toLowerCase()}</button></div>
  <div class="flex gap-2 wrap"><div class="input-group" style="flex:1;max-width:340px">${icon('search')}<input class="input" id="q" type="search" placeholder="Cari nama / ${LBL[tab][1]}" value="${esc(q)}"></div>${tab === 'siswa' ? `<select class="select" id="kf" style="width:auto"><option value="semua">Semua kelas</option>${Object.entries(ref.kelas).map(([id, k]) => `<option value="${id}" ${kf === id ? 'selected' : ''}>Kelas ${esc(k.nama)}</option>`).join('')}</select>` : ''}</div>
  ${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>${LBL[tab][1]}</th>${tab === 'siswa' ? '<th>Kelas</th>' : tab === 'guru' ? '<th>Mengajar</th>' : '<th>Jabatan</th>'}<th>Status</th><th></th></tr></thead><tbody>${rows.map((u) => `<tr><td><div class="flex gap-2 items-center"><div class="avatar avatar-sm">${esc(initials(u.nama))}</div><b style="font-weight:500">${esc(u.nama)}</b></div></td><td class="muted">${esc(u.username)}</td><td>${tab === 'siswa' ? esc(ref.kelas[u.kelasId]?.nama || '–') : tab === 'guru' ? Object.keys(ref.guru[u.id]?.mapel || {}).map((m) => badge(ref.mapelNama(m))).join(' ') : esc(u.jabatan || '')}</td><td>${u.aktif === false ? badge('Nonaktif', 'err') : badge('Aktif', 'ok')}</td><td class="right nowrap"><button class="btn btn-soft btn-icon btn-sm" data-e="${u.id}" aria-label="Ubah">${icon('edit', 16)}</button> <button class="btn btn-ghost btn-icon btn-sm" data-p="${u.id}" aria-label="Reset sandi" title="Reset sandi">${icon('key', 16)}</button> <button class="btn btn-${u.aktif === false ? 'soft' : 'danger'} btn-icon btn-sm" data-a="${u.id}" aria-label="${u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}" title="${u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}">${icon(u.aktif === false ? 'check' : 'lock', 16)}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="card">${empty('users', 'Tidak ada pengguna', 'Belum ada data yang cocok.')}</div>`}</div>`;
  el.querySelectorAll('#tb .tab').forEach((b) => b.onclick = () => { tab = b.dataset.t; q = ''; kf = 'semua'; render(); });
  el.querySelector('#q').oninput = debounce((e) => { q = e.target.value; render(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(q.length, q.length); }, 250);
  el.querySelector('#kf')?.addEventListener('change', (e) => { kf = e.target.value; render(); });
  el.querySelector('#add').onclick = () => form();
  el.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => form(users.find((x) => x.id === b.dataset.e)));
  el.querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => { const u = users.find((x) => x.id === b.dataset.a), off = u.aktif !== false; if (await confirmBox(`${off ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.nama}?`, { danger: off, ok: off ? 'Nonaktifkan' : 'Aktifkan' })) { await db.set(`users/${u.id}/aktif`, !off); toast('Status akun diperbarui.', 'ok'); } });
  el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => resetPw(users.find((x) => x.id === b.dataset.p)));
}

function resetPw(u) {
  if (!local) return modal({ title: 'Reset kata sandi', size: 'sm', body: `<p>Karena alasan keamanan, kata sandi akun lain diatur melalui <b>Firebase Console → Authentication → Users</b>: pilih akun <b>${esc(u.username)}@…</b> lalu <i>Reset password</i>.</p>`, actions: [{ label: 'Mengerti' }] });
  modal({ title: `Reset sandi · ${u.nama}`, size: 'sm', body: `<div class="field"><label>Kata sandi baru</label><input class="input" id="pw" value="${u.role}123"><span class="hint">Minimal 6 karakter.</span></div>`, actions: [{ label: 'Batal' }, { label: 'Reset', kind: 'primary', onClick: async (m) => { const v = m.el.querySelector('#pw').value; if (v.length < 6) throw new Error('Minimal 6 karakter.'); await adminResetPassword(u.id, v); toast('Kata sandi direset.', 'ok'); } }] });
}

function form(u) {
  const role = u?.role || tab, isNew = !u, mapelSel = Object.keys(ref.guru[u?.id]?.mapel || {});
  const idLabel = LBL[role][1];
  modal({ title: `${isNew ? 'Tambah' : 'Ubah'} ${LBL[role][0].toLowerCase()}`, size: 'lg', body: `<div class="row-2"><div class="field"><label>Nama lengkap</label><input class="input" id="nm" value="${esc(u?.nama || '')}"></div><div class="field"><label>${idLabel}</label><input class="input" id="id" value="${esc(u?.username || '')}" ${isNew ? '' : 'readonly'} ${role === 'siswa' ? 'inputmode="numeric"' : ''}>${isNew ? '' : '<span class="hint">ID masuk tidak dapat diubah.</span>'}</div></div>
  ${role === 'siswa' ? `<div class="row-3"><div class="field"><label>Kelas</label><select class="select" id="kl">${Object.entries(ref.kelas).map(([id, k]) => `<option value="${id}" ${u?.kelasId === id ? 'selected' : ''}>${esc(k.nama)}</option>`).join('')}</select></div><div class="field"><label>Jenis kelamin</label><select class="select" id="jk"><option value="L" ${u?.jk === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${u?.jk === 'P' ? 'selected' : ''}>Perempuan</option></select></div><div class="field"><label>Tahun masuk</label><input class="input" id="tm" type="number" value="${u?.tahunMasuk || new Date().getFullYear()}"></div></div><div class="row-2"><div class="field"><label>Tempat lahir</label><input class="input" id="tl" value="${esc(u?.tempatLahir || '')}"></div><div class="field"><label>Tanggal lahir</label><input class="input" id="tg" type="date" value="${u?.tglLahir || ''}"></div></div><div class="row-2"><div class="field"><label>No. HP</label><input class="input" id="hp" value="${esc(u?.hp || '')}"></div><div class="field"><label>Orang tua / wali</label><input class="input" id="or" value="${esc(u?.ortu || '')}"></div></div><div class="field"><label>Alamat</label><textarea class="textarea" id="al" rows="2">${esc(u?.alamat || '')}</textarea></div>` : ''}
  ${role === 'guru' ? `<div class="field"><label>Mata pelajaran diampu</label><div class="chips" id="mp">${Object.entries(ref.mapel).map(([id, m]) => `<label class="chip ${mapelSel.includes(id) ? 'active' : ''}" style="cursor:pointer"><input type="checkbox" value="${id}" ${mapelSel.includes(id) ? 'checked' : ''} class="sr-only">${esc(m.nama)}</label>`).join('')}</div></div><div class="field"><label>No. HP</label><input class="input" id="hp" value="${esc(u?.hp || '')}"></div>` : ''}
  ${role === 'admin' ? `<div class="field"><label>Jabatan</label><input class="input" id="jb" value="${esc(u?.jabatan || 'Staf Tata Usaha')}"></div>` : ''}
  ${isNew ? `<div class="field"><label>Kata sandi awal</label><input class="input" id="pw" value="${role}123"><span class="hint">Minimal 6 karakter. Minta pengguna menggantinya setelah masuk pertama.</span></div>` : ''}`,
    onMount: (m) => m.el.querySelectorAll('#mp .chip').forEach((c) => c.querySelector('input').onchange = (e) => c.classList.toggle('active', e.target.checked)),
    actions: [{ label: 'Batal' }, { label: 'Simpan', kind: 'primary', onClick: async (m) => {
      const v = (id) => m.el.querySelector('#' + id)?.value.trim();
      if (!v('nm') || !v('id')) throw new Error('Nama dan ' + idLabel + ' wajib diisi.');
      if (role === 'siswa' && !/^\d{6,12}$/.test(v('id'))) throw new Error('NISN harus berupa angka (6–12 digit).');
      const base = { role, nama: v('nm'), username: v('id'), aktif: u?.aktif !== false };
      let data = base, extra = null;
      if (role === 'siswa') data = { ...base, nisn: v('id'), kelasId: v('kl'), jk: v('jk'), tahunMasuk: +v('tm'), tempatLahir: v('tl'), tglLahir: v('tg'), hp: v('hp'), ortu: v('or'), alamat: v('al') };
      if (role === 'guru') { const ms = [...m.el.querySelectorAll('#mp input:checked')].map((i) => i.value); if (!ms.length) throw new Error('Pilih minimal satu mata pelajaran.'); data = { ...base, nip: v('id'), hp: v('hp'), jabatan: 'Guru Mata Pelajaran' }; extra = { nama: data.nama, nip: v('id'), mapel: Object.fromEntries(ms.map((x) => [x, true])) }; }
      if (role === 'admin') data = { ...base, jabatan: v('jb') };
      if (isNew) {
        const pw = v('pw'); if (pw.length < 6) throw new Error('Kata sandi minimal 6 karakter.');
        const uid = await createAccount(v('id'), pw);
        await db.set('users/' + uid, local ? { ...data, password: pw } : data);
        if (extra) await db.set('guru/' + uid, extra);
      } else { await db.update('users/' + u.id, data); if (extra) await db.set('guru/' + u.id, extra); }
      ref.guru = (await db.get('guru')) || {}; toast('Data pengguna tersimpan.', 'ok');
    } }] });
}
db.listen('users', (v) => { users = toList(v); render(); });
