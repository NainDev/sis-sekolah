import { mountPortal } from '../layout/portal.js';
import { db } from '../core/db.js';
import { updateSelf } from '../core/auth.js';
import { icon } from '../core/icons.js';
import { esc, initials, fmtTanggal, qrSvg } from '../core/utils.js';
import { loadRef } from '../core/akademik.js';
import { toast, setBusy } from '../core/ui.js';

const { user: u0, settings, el } = await mountPortal({ role: 'siswa', active: 'kartu', title: 'Kartu Pelajar & Profil' });
const ref = await loadRef();
let user = u0; const kelas = () => ref.kelas[user.kelasId] || {};
const qr = await qrSvg(`KARTU:${user.nisn}`, { cell: 4, margin: 1 });
const masa = `${user.tahunMasuk || ''}/${(user.tahunMasuk || 0) + 3}`;

function render() {
  el.innerHTML = `<div class="grid g-2" style="align-items:start">
  <div class="stack"><div class="card"><div class="card-head"><h3>Kartu pelajar digital</h3><span class="small muted no-print">Ketuk kartu untuk membalik</span></div>
  <div class="idwrap" style="margin-inline:auto"><div class="idcard" id="idc"><div class="idface front"><div class="hd"><span class="m">${icon('graduation', 18)}</span><div><b>${esc(settings.nama)}</b><small>KARTU PELAJAR · ${esc(settings.tahunAjaran)}</small></div></div>
  <div class="bd"><div class="ph">${esc(initials(user.nama))}</div><div><div class="nm">${esc(user.nama)}</div><div class="ln">NISN ${esc(user.nisn)}</div><div class="ln">Kelas ${esc(kelas().nama || '-')} · ${user.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</div></div></div>
  <div class="ft"><span>Berlaku ${esc(masa)}</span><span>${esc(settings.singkat)}</span></div></div>
  <div class="idface back"><div class="hd" style="color:var(--ink)"><div><b style="font-size:12px">${esc(settings.nama)}</b><small style="opacity:.7">${esc(settings.alamat)}</small></div></div>
  <div class="bd" style="color:var(--ink)"><div class="qr">${qr}</div><p>Kartu ini adalah identitas resmi siswa. Bila ditemukan, harap hubungi sekolah di ${esc(settings.telp)}.</p></div>
  <div class="ft" style="color:var(--muted)"><span>Tempat/Tgl Lahir: ${esc(user.tempatLahir || '')}, ${fmtTanggal(user.tglLahir, { singkat: true })}</span></div></div></div></div>
  <div class="flex gap-2 mt-3 no-print" style="justify-content:center"><button class="btn btn-soft" id="flip">${icon('refresh')}Balik kartu</button><button class="btn btn-ghost" id="pr">${icon('printer')}Cetak</button></div></div></div>
  <div class="card"><div class="card-head"><h3>Data profil</h3></div><form id="pf" novalidate>
  <dl class="kv mb-3"><dt>Nama lengkap</dt><dd>${esc(user.nama)}</dd><dt>NISN</dt><dd>${esc(user.nisn)}</dd><dt>Kelas</dt><dd>${esc(kelas().nama || '-')} · wali kelas ${esc(ref.guruNama(kelas().wali))}</dd><dt>Tempat, tgl lahir</dt><dd>${esc(user.tempatLahir || '')}, ${fmtTanggal(user.tglLahir)}</dd></dl>
  <div class="divider"></div><p class="small muted mb-2">Data berikut dapat kamu perbarui sendiri:</p>
  <div class="field"><label for="alamat">Alamat</label><textarea class="textarea" id="alamat" rows="3">${esc(user.alamat || '')}</textarea></div>
  <div class="row-2"><div class="field"><label for="hp">No. HP</label><input class="input" id="hp" inputmode="tel" value="${esc(user.hp || '')}"></div><div class="field"><label for="ortu">Nama orang tua / wali</label><input class="input" id="ortu" value="${esc(user.ortu || '')}"></div></div>
  <button class="btn btn-primary" type="submit">${icon('save')}Simpan perubahan</button></form></div></div>`;
  const c = el.querySelector('#idc'); c.onclick = () => c.classList.toggle('flip'); el.querySelector('#flip').onclick = (e) => { e.stopPropagation(); c.classList.toggle('flip'); };
  el.querySelector('#pr').onclick = () => print();
  el.querySelector('#pf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, btn = f.querySelector('button');
    const hp = f.hp.value.trim(); if (hp && !/^(\+62|62|0)\d{8,13}$/.test(hp.replace(/[\s-]/g, ''))) return toast('Nomor HP belum benar.', 'warn');
    setBusy(btn, true, 'Menyimpan…');
    try { user = await updateSelf({ alamat: f.alamat.value.trim(), hp, ortu: f.ortu.value.trim() }); toast('Profil berhasil diperbarui.', 'ok'); } catch { toast('Gagal menyimpan profil.', 'err'); }
    setBusy(btn, false);
  };
}
render();
