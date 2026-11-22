import { db } from '../core/db.js';
import { mountPublic, pageHero, reveal } from '../layout/public.js';
import { icon } from '../core/icons.js';
import { esc, url, fmtTanggal, fmtBytes, fileToData, copyText, fmtNum } from '../core/utils.js';
import { toast, setBusy } from '../core/ui.js';

const s = await mountPublic('ppdb');
const JALUR = ['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua'];
const BERKAS = [['pasFoto', 'Pas foto 3x4', 'JPG/PNG', true], ['aktaLahir', 'Akta kelahiran', 'JPG/PNG/PDF', true], ['kartuKeluarga', 'Kartu Keluarga', 'JPG/PNG/PDF', true], ['rapor', 'Rapor / surat keterangan lulus', 'JPG/PNG/PDF', false]];
const STATUS = { Diproses: ['b-warn', 'clock'], Terverifikasi: ['b-info', 'check-circle'], Diterima: ['b-ok', 'award'], Cadangan: ['b-warn', 'clock'], Ditolak: ['b-err', 'x-circle'] };
const data = {}; const files = {}; let step = 0;

document.getElementById('app').innerHTML = pageHero('PPDB Online ' + (s.ppdbTahun || ''), 'Daftar sebagai calon peserta didik baru secara online, unggah berkas, lalu pantau status pendaftaran Anda.', 'PPDB') + `
<section class="sec"><div class="wrap-w"><div class="ppdb-layout">
<div><div class="tabs mb-3" id="mainTabs"><button class="tab active" data-k="form">${'Formulir Pendaftaran'}</button><button class="tab" data-k="status">Cek Status</button></div>
<div id="pane"></div></div>
<aside class="stack">
<div class="card card-tint reveal"><h3 class="mb-2" style="font-size:16px">Informasi pendaftaran</h3><dl class="kv" style="grid-template-columns:110px 1fr"><dt>Gelombang</dt><dd>${esc(s.ppdbGelombang)}</dd><dt>Ditutup</dt><dd>${fmtTanggal(s.ppdbTutup)}</dd><dt>Kuota</dt><dd>${fmtNum(s.ppdbKuota || 0)} kursi</dd><dt>Status</dt><dd>${s.ppdbBuka ? '<span class="badge b-ok">Dibuka</span>' : '<span class="badge b-err">Ditutup</span>'}</dd></dl></div>
<div class="card reveal"><h3 class="mb-2" style="font-size:16px">Alur pendaftaran</h3><ol class="timeline">${['Isi formulir data diri', 'Unggah berkas pendukung', 'Simpan nomor pendaftaran', 'Cek status secara berkala', 'Daftar ulang bila diterima'].map((t) => `<li class="done"><span class="small">${t}</span></li>`).join('')}</ol></div>
<div class="card reveal"><h3 class="mb-2" style="font-size:16px">Butuh bantuan?</h3><p class="small muted mb-2">Hubungi panitia PPDB pada jam kerja.</p><div class="small"><div class="flex gap-1 items-center">${icon('phone', 16)}${esc(s.wa)}</div><div class="flex gap-1 items-center mt-1">${icon('mail', 16)}${esc(s.email)}</div></div></div>
</aside></div></div></section>`;
reveal();

const pane = document.getElementById('pane'), tabs = document.getElementById('mainTabs');
const show = (k) => { tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.k === k)); k === 'form' ? renderForm() : renderStatus(); history.replaceState(null, '', k === 'status' ? '#status' : location.pathname); };
tabs.onclick = (e) => { const b = e.target.closest('.tab'); if (b) show(b.dataset.k); };

const field = (id, label, opts = {}) => `<div class="field"><label for="${id}">${label}${opts.req === false ? ' <span class="faint">(opsional)</span>' : ''}</label>${opts.html || `<input class="input" id="${id}" name="${id}" ${opts.req === false ? '' : 'required'} type="${opts.type || 'text'}" value="${esc(data[id] || '')}" ${opts.ph ? `placeholder="${opts.ph}"` : ''} ${opts.extra || ''}>`}<span class="err-text" id="e_${id}" hidden></span></div>`;

function renderForm() {
  if (!s.ppdbBuka) { pane.innerHTML = `<div class="card"><div class="alert warn">${icon('alert')}<div>Pendaftaran sedang ditutup. Anda tetap dapat <a href="#status" id="goStatus">mengecek status pendaftaran</a>.</div></div></div>`; document.getElementById('goStatus').onclick = (e) => { e.preventDefault(); show('status'); }; return; }
  const steps = ['Data diri', 'Orang tua & asal sekolah', 'Berkas', 'Konfirmasi'];
  const bodies = [
    `<div class="row-2">${field('nama', 'Nama lengkap', { ph: 'Sesuai akta kelahiran' })}${field('nisn', 'NISN', { extra: 'inputmode="numeric" maxlength="10" placeholder="10 digit"' })}</div>
     <div class="row-3">${field('jk', 'Jenis kelamin', { html: `<select class="select" id="jk"><option value="L" ${data.jk === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${data.jk === 'P' ? 'selected' : ''}>Perempuan</option></select>` })}${field('tempatLahir', 'Tempat lahir')}${field('tglLahir', 'Tanggal lahir', { type: 'date' })}</div>
     ${field('alamat', 'Alamat lengkap', { html: `<textarea class="textarea" id="alamat" rows="3" required>${esc(data.alamat || '')}</textarea>` })}`,
    `<div class="row-2">${field('namaOrtu', 'Nama orang tua / wali')}${field('hp', 'No. HP / WhatsApp orang tua', { ph: '08xxxxxxxxxx', extra: 'inputmode="tel"' })}</div>
     <div class="row-2">${field('asalSekolah', 'Asal sekolah (SMP/MTs)')}${field('jalur', 'Jalur pendaftaran', { html: `<select class="select" id="jalur">${JALUR.map((j) => `<option ${data.jalur === j ? 'selected' : ''}>${j}</option>`).join('')}</select>` })}</div>
     <div class="alert">${icon('info')}<div class="small">Jalur prestasi memerlukan bukti sertifikat yang dapat dilampirkan saat daftar ulang. Panitia akan menghubungi melalui nomor HP di atas.</div></div>`,
    `<p class="small muted mb-2">Format JPG, PNG, atau PDF. Foto otomatis dikompres. PDF maksimal 400 KB.</p><div class="stack" style="gap:12px">${BERKAS.map(([k, t, f, req]) => `<div class="upl ${files[k] ? 'has' : ''}" id="u_${k}"><div class="ico">${icon(files[k] ? 'check-circle' : 'upload', 20)}</div><div class="grow"><b>${t} ${req ? '' : '<span class="faint">(opsional)</span>'}</b><small>${files[k] ? esc(files[k].nama) + ' · ' + fmtBytes(files[k].ukuran) : f}</small></div>${files[k] ? `<button type="button" class="btn btn-sm btn-danger rm" data-rm="${k}">Hapus</button>` : ''}<input type="file" accept="image/*,application/pdf" data-k="${k}" ${files[k] ? 'style="pointer-events:none"' : ''}></div>`).join('')}</div>`,
    `<div class="card card-flat card-tint"><dl class="kv">${[['Nama', data.nama], ['NISN', data.nisn], ['Jenis kelamin', data.jk === 'L' ? 'Laki-laki' : 'Perempuan'], ['Tempat, tgl lahir', `${data.tempatLahir}, ${fmtTanggal(data.tglLahir)}`], ['Alamat', data.alamat], ['Orang tua / wali', data.namaOrtu], ['No. HP', data.hp], ['Asal sekolah', data.asalSekolah], ['Jalur', data.jalur], ['Berkas', BERKAS.filter(([k]) => files[k]).map(([, t]) => t).join(', ')]].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div><label class="check mt-3"><input type="checkbox" id="agree"><span>Saya menyatakan data yang diisi benar dan bersedia mengikuti ketentuan PPDB.</span></label>`
  ];
  pane.innerHTML = `<form class="card" id="pf" novalidate><div class="stepper">${steps.map((t, i) => `<div class="step ${i === step ? 'active' : i < step ? 'done' : ''}"><i>${i < step ? '✓' : i + 1}</i><span>${t}</span></div>`).join('')}</div>${bodies[step]}
  <div class="flex between mt-3 gap-2"><button type="button" class="btn btn-ghost" id="prev" ${step === 0 ? 'disabled' : ''}>${icon('arrow-left')}Kembali</button><button class="btn btn-primary" id="next" type="submit">${step === 3 ? icon('send') + 'Kirim Pendaftaran' : 'Lanjut' + icon('arrow-right')}</button></div></form>`;
  const form = document.getElementById('pf');
  form.querySelectorAll('input[type=file]').forEach((i) => i.onchange = async () => {
    const f = i.files[0]; if (!f) return;
    try { files[i.dataset.k] = await fileToData(f); renderForm(); } catch (e) { toast(e.message, 'err'); i.value = ''; }
  });
  form.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { delete files[b.dataset.rm]; renderForm(); });
  document.getElementById('prev').onclick = () => { collect(); step--; renderForm(); scrollTo({ top: 200, behavior: 'smooth' }); };
  form.onsubmit = (e) => { e.preventDefault(); next(form); };
}
const collect = () => document.querySelectorAll('#pf input:not([type=file]):not([type=checkbox]), #pf select, #pf textarea').forEach((el) => { data[el.id] = el.value.trim(); });
function bad(id, msg) { const el = document.getElementById(id); el.classList.add('invalid'); const e = document.getElementById('e_' + id); if (e) { e.textContent = msg; e.hidden = false; } el.focus(); return false; }
function check() {
  collect(); document.querySelectorAll('.input,.select,.textarea').forEach((e) => e.classList.remove('invalid')); document.querySelectorAll('.err-text').forEach((e) => e.hidden = true);
  if (step === 0) {
    for (const k of ['nama', 'nisn', 'tempatLahir', 'tglLahir', 'alamat']) if (!data[k]) return bad(k, 'Wajib diisi.');
    if (!/^\d{10}$/.test(data.nisn)) return bad('nisn', 'NISN terdiri dari 10 digit angka.');
    if (new Date(data.tglLahir) > new Date()) return bad('tglLahir', 'Tanggal lahir tidak valid.');
  }
  if (step === 1) {
    for (const k of ['namaOrtu', 'hp', 'asalSekolah']) if (!data[k]) return bad(k, 'Wajib diisi.');
    if (!/^(\+62|62|0)8\d{7,12}$/.test(data.hp.replace(/[\s-]/g, ''))) return bad('hp', 'Nomor HP belum benar, contoh 081234567890.');
  }
  if (step === 2) { const miss = BERKAS.filter(([k, , , r]) => r && !files[k]); if (miss.length) { toast('Unggah dulu: ' + miss.map((m) => m[1]).join(', '), 'warn'); return false; } }
  if (step === 3 && !document.getElementById('agree').checked) { toast('Centang pernyataan persetujuan terlebih dahulu.', 'warn'); return false; }
  return true;
}
async function next(form) {
  if (!check()) return;
  if (step < 3) { step++; renderForm(); scrollTo({ top: 200, behavior: 'smooth' }); return; }
  const btn = document.getElementById('next'); setBusy(btn, true, 'Mengirim…');
  try {
    const noDaftar = `PPDB-${String(s.ppdbTahun || new Date().getFullYear()).slice(0, 4)}-${Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')}`;
    const tanggal = Date.now();
    const id = await db.push('ppdb', { ...data, noDaftar, status: 'Diproses', catatan: '', tanggal });
    await db.set('ppdb_status/' + noDaftar, { nama: data.nama, nisn: data.nisn, jalur: data.jalur, status: 'Diproses', catatan: '', tanggal });
    await db.set('ppdb_berkas/' + id, Object.fromEntries(Object.entries(files).map(([k, f]) => [k, f])));
    renderDone(noDaftar);
  } catch (e) { console.error(e); toast('Pendaftaran gagal dikirim. Periksa koneksi lalu coba lagi.', 'err'); setBusy(btn, false); }
}
function renderDone(no) {
  const nisn = data.nisn, hp = data.hp;
  pane.innerHTML = `<div class="card"><div class="ticket"><div class="ok-ring">${icon('check', 36)}</div><h2 style="font-size:22px">Pendaftaran berhasil dikirim</h2><p class="muted mt-1">Simpan nomor pendaftaran berikut untuk mengecek status.</p><div class="no" id="no">${no}</div><div class="flex gap-2 wrap" style="justify-content:center"><button class="btn btn-soft" id="cp">${icon('copy')}Salin nomor</button><button class="btn btn-primary" id="gs">${icon('search')}Cek status</button></div><p class="small muted mt-3">Anda akan dihubungi panitia melalui ${esc(data.hp)} bila diperlukan.</p></div></div>`;
  document.getElementById('cp').onclick = async () => toast((await copyText(no)) ? 'Nomor disalin.' : 'Salin manual dari layar.', 'ok');
  document.getElementById('gs').onclick = () => { show('status'); document.getElementById('sNo').value = no; document.getElementById('sNisn').value = nisn; };
  Object.keys(data).forEach((k) => delete data[k]); Object.keys(files).forEach((k) => delete files[k]); step = 0;
}
function renderStatus() {
  pane.innerHTML = `<div class="card"><h3 class="mb-1">Cek status pendaftaran</h3><p class="small muted mb-3">Masukkan nomor pendaftaran dan NISN calon siswa.</p><form id="sf" novalidate><div class="row-2"><div class="field"><label for="sNo">Nomor pendaftaran</label><input class="input" id="sNo" placeholder="PPDB-2027-XXXXX" autocomplete="off" style="text-transform:uppercase" required></div><div class="field"><label for="sNisn">NISN</label><input class="input" id="sNisn" inputmode="numeric" maxlength="10" required></div></div><button class="btn btn-primary" type="submit">${icon('search')}Cek Status</button></form><div id="sRes" class="mt-3"></div></div>`;
  document.getElementById('sf').onsubmit = async (e) => {
    e.preventDefault(); const no = document.getElementById('sNo').value.trim().toUpperCase(), nisn = document.getElementById('sNisn').value.trim(); const out = document.getElementById('sRes');
    if (!no || !nisn) return toast('Isi nomor pendaftaran dan NISN.', 'warn');
    if (!/^[A-Z0-9-]{6,24}$/.test(no)) return out.innerHTML = `<div class="alert err">${icon('x-circle')}<div>Format nomor pendaftaran tidak valid.</div></div>`;
    out.innerHTML = '<div class="skeleton" style="height:120px"></div>';
    let r = null; try { r = await db.get('ppdb_status/' + no); } catch { /* ditolak */ }
    if (!r || String(r.nisn) !== nisn) return out.innerHTML = `<div class="alert err">${icon('x-circle')}<div>Data tidak ditemukan. Periksa kembali nomor pendaftaran dan NISN Anda.</div></div>`;
    const [cls, ic] = STATUS[r.status] || ['', 'info'];
    out.innerHTML = `<div class="card card-tint card-flat"><div class="flex between items-center wrap gap-2 mb-2"><div><div class="small muted">Atas nama</div><h3>${esc(r.nama)}</h3></div><span class="badge ${cls}" style="font-size:14px;padding:6px 14px">${icon(ic, 16)}${esc(r.status)}</span></div><dl class="kv"><dt>No. pendaftaran</dt><dd>${esc(no)}</dd><dt>Jalur</dt><dd>${esc(r.jalur)}</dd><dt>Tanggal daftar</dt><dd>${fmtTanggal(r.tanggal)}</dd>${r.catatan ? `<dt>Catatan panitia</dt><dd>${esc(r.catatan)}</dd>` : ''}</dl></div>`;
  };
}
show(location.hash === '#status' ? 'status' : 'form');
