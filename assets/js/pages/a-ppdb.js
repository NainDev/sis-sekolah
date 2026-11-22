import { mountPortal } from '../layout/portal.js';
import { db, toList } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, fmtTanggal, sortBy, debounce, fmtBytes } from '../core/utils.js';
import { badge, empty, modal, toast } from '../core/ui.js';
import { createAccount } from '../core/auth.js';
import { loadRef } from '../core/akademik.js';

const { el } = await mountPortal({ role: 'admin', active: 'ppdb', title: 'Pendaftaran Siswa Baru (PPDB)' });
const STATUS = ['Diproses', 'Terverifikasi', 'Diterima', 'Cadangan', 'Ditolak'], KIND = { Diproses: 'warn', Terverifikasi: 'info', Diterima: 'ok', Cadangan: 'warn', Ditolak: 'err' };
const ref = await loadRef(), local = db.mode === 'local';
const BERKAS = { pasFoto: 'Pas foto', aktaLahir: 'Akta kelahiran', kartuKeluarga: 'Kartu Keluarga', rapor: 'Rapor / SKL' };
let list = [], f = 'Semua', q = '';
function render() {
  const t = q.toLowerCase(), rows = sortBy(list, 'tanggal', -1).filter((p) => (f === 'Semua' || p.status === f) && (!t || (p.nama + p.noDaftar + p.nisn).toLowerCase().includes(t)));
  const cnt = (s) => list.filter((p) => p.status === s).length;
  el.innerHTML = `<div class="stack"><div class="grid g-4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${STATUS.map((s) => `<div class="tile"><div class="ico ${KIND[s] === 'info' ? '' : KIND[s]}">${icon(s === 'Diterima' ? 'award' : s === 'Ditolak' ? 'x-circle' : s === 'Terverifikasi' ? 'check-circle' : 'clock')}</div><div><b>${cnt(s)}</b><span>${s}</span></div></div>`).join('')}</div>
  <div class="page-actions"><div class="flex gap-2 wrap"><div class="input-group">${icon('search')}<input class="input" id="q" type="search" placeholder="Cari nama / no. daftar / NISN" value="${esc(q)}"></div><select class="select" id="f" style="width:auto"><option>Semua</option>${STATUS.map((s) => `<option ${f === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><button class="btn btn-ghost" id="csv">${icon('download')}Ekspor CSV</button></div>
  ${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>No. daftar</th><th>Nama</th><th>Jalur</th><th>Asal sekolah</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr><td class="nowrap small">${esc(p.noDaftar)}</td><td><b style="font-weight:500">${esc(p.nama)}</b><div class="small muted">NISN ${esc(p.nisn)}</div></td><td>${esc(p.jalur)}</td><td>${esc(p.asalSekolah)}</td><td class="nowrap">${fmtTanggal(p.tanggal, { singkat: true })}</td><td>${badge(p.status, KIND[p.status])}${p.akunUid ? ' ' + badge('Akun aktif', 'ok') : ''}</td><td class="right"><button class="btn btn-soft btn-sm" data-v="${p.id}">Detail</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="card">${empty('user-plus', 'Tidak ada pendaftar', 'Belum ada data yang sesuai.')}</div>`}</div>`;
  el.querySelector('#q').oninput = debounce((e) => { q = e.target.value; render(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(q.length, q.length); }, 250);
  el.querySelector('#f').onchange = (e) => { f = e.target.value; render(); };
  el.querySelector('#csv').onclick = () => { const h = ['No Daftar', 'Nama', 'NISN', 'JK', 'Tempat Lahir', 'Tgl Lahir', 'Alamat', 'Orang Tua', 'HP', 'Asal Sekolah', 'Jalur', 'Status', 'Tanggal Daftar']; const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; const body = sortBy(list, 'tanggal', 1).map((p) => [p.noDaftar, p.nama, p.nisn, p.jk, p.tempatLahir, p.tglLahir, p.alamat, p.namaOrtu, p.hp, p.asalSekolah, p.jalur, p.status, new Date(p.tanggal).toISOString().slice(0, 10)].map(c).join(',')); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [h.map(c).join(','), ...body].join('\n')], { type: 'text/csv' })); a.download = 'ppdb.csv'; a.click(); };
  el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => detail(list.find((x) => x.id === b.dataset.v)));
}
async function detail(p) {
  const bk = (await db.get('ppdb_berkas/' + p.id)) || {};
  modal({ title: p.nama, size: 'lg', body: `<div class="flex gap-1 wrap mb-3">${badge(p.noDaftar, 'info')}${badge(p.status, KIND[p.status])}</div><div class="grid g-2"><dl class="kv" style="grid-template-columns:120px 1fr"><dt>NISN</dt><dd>${esc(p.nisn)}</dd><dt>Jenis kelamin</dt><dd>${p.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</dd><dt>TTL</dt><dd>${esc(p.tempatLahir)}, ${fmtTanggal(p.tglLahir)}</dd><dt>Alamat</dt><dd>${esc(p.alamat)}</dd><dt>Orang tua</dt><dd>${esc(p.namaOrtu)}</dd><dt>No. HP</dt><dd>${esc(p.hp)}</dd><dt>Asal sekolah</dt><dd>${esc(p.asalSekolah)}</dd><dt>Jalur</dt><dd>${esc(p.jalur)}</dd></dl>
  <div><div class="label mb-1">Berkas</div><div class="berkas">${Object.entries(BERKAS).map(([k, t]) => { const f = bk[k]; return `<div>${icon(f ? 'check-circle' : 'x-circle', 18)}<span class="grow">${t}${f ? `<br><span class="small muted">${esc(f.nama)} · ${fmtBytes(f.ukuran)}</span>` : ''}</span>${f?.data ? `<a class="btn btn-soft btn-sm" href="${f.data}" target="_blank" rel="noopener" download="${esc(f.nama)}">${icon('eye', 15)}Buka</a>` : ''}</div>`; }).join('')}</div></div></div>
  <div class="divider"></div><div class="row-2"><div class="field"><label>Ubah status</label><select class="select" id="st">${STATUS.map((s) => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div><div class="field"><label>Catatan untuk pendaftar <span class="faint">(tampil di Cek Status)</span></label><textarea class="textarea" id="ct" rows="3">${esc(p.catatan || '')}</textarea></div>`,
    actions: [{ label: 'Tutup' }, ...(p.status === 'Diterima' && !p.akunUid ? [{ label: 'Aktifkan jadi akun siswa', onClick: async () => { setTimeout(() => aktifkan(p), 50); } }] : []), { label: 'Simpan status', kind: 'primary', onClick: async (m) => { const st = m.el.querySelector('#st').value, ct = m.el.querySelector('#ct').value.trim(); await db.update('', { [`ppdb/${p.id}/status`]: st, [`ppdb/${p.id}/catatan`]: ct, [`ppdb_status/${p.noDaftar}/status`]: st, [`ppdb_status/${p.noDaftar}/catatan`]: ct }); toast('Status pendaftaran diperbarui.', 'ok'); } }] });
}
db.listen('ppdb', (v) => { list = toList(v); render(); });

function aktifkan(p) {
  const pw = 'siswa' + String(p.nisn).slice(-4);
  modal({ title: 'Aktifkan jadi akun siswa', size: 'sm', body: `<p class="small muted">Pendaftar <b>${esc(p.nama)}</b> akan dibuatkan akun siswa dengan username <b>${esc(p.nisn)}</b> (NISN) dan langsung muncul di daftar murid wali kelas.</p><div class="field"><label>Masukkan ke kelas</label><select class="select" id="kl">${Object.entries(ref.kelas).filter(([, k]) => k.tingkat === 10).map(([id, k]) => `<option value="${id}">${esc(k.nama)}</option>`).join('')}</select></div><div class="field"><label>Kata sandi awal</label><input class="input" id="pw" value="${pw}"><span class="hint">Berikan ke siswa dan minta menggantinya setelah masuk.</span></div>`,
    actions: [{ label: 'Batal' }, { label: 'Aktifkan akun', kind: 'primary', onClick: async (m) => {
      const kl = m.el.querySelector('#kl').value, pass = m.el.querySelector('#pw').value.trim();
      if (!kl) throw new Error('Pilih kelas tujuan.'); if (pass.length < 6) throw new Error('Kata sandi minimal 6 karakter.');
      if (p.akunUid) throw new Error('Akun sudah diaktifkan.');
      const uid = await createAccount(p.nisn, pass);
      const data = { role: 'siswa', nama: p.nama, username: p.nisn, nisn: p.nisn, kelasId: kl, jk: p.jk, aktif: true, tempatLahir: p.tempatLahir, tglLahir: p.tglLahir, alamat: p.alamat, hp: p.hp, ortu: p.namaOrtu, tahunMasuk: new Date().getFullYear(), dariPpdb: p.noDaftar };
      await db.update('', { ['users/' + uid]: local ? { ...data, password: pass } : data, [`ppdb/${p.id}/akunUid`]: uid, [`ppdb/${p.id}/kelasId`]: kl, [`ppdb_status/${p.noDaftar}/catatan`]: `Selamat! Akun siswa aktif. Masuk dengan NISN ${p.nisn}.` });
      toast('Akun siswa aktif. Kata sandi awal: ' + pass, 'ok');
    } }] });
}
