/* gerbang.js — Mode Kiosk: layar QR dinamis untuk satu perangkat di gerbang sekolah.
   Dapat dibuka oleh admin/TU dan guru. QR dirender lewat QR API eksternal
   (api.qrserver.com) dengan cadangan generator lokal bila gambar gagal dimuat. */
import { requireRole, homeFor } from '../core/auth.js';
import { db } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, dateKey, HARI, BULAN, pad, qrSvg } from '../core/utils.js';
import { buatToken, qrText, terbitkan, getSesi, mulaiSesi, buatSesiBaru, aturStatusSesi, aturRotasi } from '../core/absensi.js';
import { confirmBox, toast } from '../core/ui.js';
import { APP } from '../config.js';

const user = await requireRole(['admin', 'guru']);
const settings = (await db.get('pengaturan')) || {};
const users = Object.entries((await db.get('users')) || {}).filter(([, u]) => u.role === 'siswa');
const nama = Object.fromEntries(users.map(([id, u]) => [id, u.nama]));
const OPSI = [10, 15, 20, 30, 45, 60];
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';
let sesi = null, tok = null, hari = {}, rotating = false;

document.getElementById('app').innerHTML = `
<div class="gate-top"><a class="btn btn-glass btn-sm" href="${homeFor(user.role)}">${icon('arrow-left')}Kembali ke portal</a><button class="btn btn-glass btn-sm" id="fs">${icon('maximize')}Layar penuh</button></div>
<div class="gate-card">
 <div class="gate-info"><div><div class="flex gap-2 items-center mb-3"><span style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.18);display:grid;place-items:center;color:#fff">${icon('graduation', 24)}</span><div><h2 style="font-size:19px">${esc(settings.nama)}</h2><div class="small" style="opacity:.75">Absensi gerbang · ${esc(settings.tahunAjaran)}</div></div></div>
 <div class="gate-clock" id="clk">--:--</div><div class="gate-date" id="dt"></div>
 <p class="mt-3" style="color:rgba(255,255,255,.85)">Buka portal siswa → <b>Absen</b> → pindai QR di samping. Batas masuk <b>${esc(settings.jamMasuk || '07:00')}</b>${Number(settings.toleransiMenit) ? ` (+${settings.toleransiMenit} menit)` : ''}.</p></div>
 <div><div class="gate-stats mb-2"><div class="gate-stat"><b id="sH">0</b><span>Hadir</span></div><div class="gate-stat"><b id="sT">0</b><span>Terlambat</span></div><div class="gate-stat"><b id="sB">${users.length}</b><span>Belum absen</span></div></div><div class="gate-feed" id="feed"></div></div></div>
 <div class="gate-qrbox"><div class="gate-qr" id="qr"></div>
 <div class="gate-code"><small>Kode cadangan</small><b id="kd">------</b></div>
 <div class="gate-timer"><div class="flex between small muted mb-1"><span id="st"></span><span id="tm"></span></div><div class="progress"><i id="pb" style="width:0"></i></div></div>
 <div class="flex gap-1 wrap" style="justify-content:center"><button class="btn btn-primary btn-sm" id="bMulai"></button><button class="btn btn-soft btn-sm" id="bJeda">${icon('zap', 15)}Jeda</button><button class="btn btn-danger btn-sm" id="bReset">${icon('refresh', 15)}Reset sesi</button></div>
 <div class="flex gap-1 items-center small muted"><label for="rot">Ganti QR tiap</label><select class="select" id="rot" style="width:auto;padding:6px 30px 6px 10px">${OPSI.map((o) => `<option value="${o}">${o} detik</option>`).join('')}</select></div>
 <p class="small center" id="err" style="color:var(--err)"></p><p class="xs faint center" id="sid"></p></div></div>`;
const $ = (id) => document.getElementById(id);

/* ---- render QR: API eksternal dulu, cadangan lokal ---- */
function tampilQr(payload) {
  return new Promise((res) => {
    const img = new Image(); img.alt = 'QR Code absensi'; img.style.cssText = 'width:100%;height:100%;display:block';
    const ganti = (el) => { $('qr').replaceChildren(el); res(); };
    img.onload = () => ganti(img);
    img.onerror = async () => { const w = document.createElement('div'); w.style.cssText = 'width:100%;height:100%'; w.innerHTML = await qrSvg(payload, { cell: 8, margin: 2 }); ganti(w); };
    img.src = `${QR_API}?size=440x440&margin=8&ecc=M&format=png&data=${encodeURIComponent(payload)}`;
    setTimeout(() => { if (!img.complete) img.onerror(); }, 4000);
  });
}
async function rotate() {
  if (rotating || !sesi || sesi.status !== 'aktif') return; rotating = true;
  const t = buatToken(sesi);
  try { await terbitkan(t); tok = t; $('err').textContent = ''; await tampilQr(qrText(t)); $('kd').textContent = t.kode.slice(0, 3) + ' ' + t.kode.slice(3); }
  catch (e) { console.error(e); $('err').textContent = 'Gagal menerbitkan QR. Periksa koneksi dan aturan database.'; tok = { ...t, berlaku: db.now() + 5000 }; }
  rotating = false;
}

/* ---- tampilan sesuai status ---- */
function paint() {
  const aktif = sesi?.status === 'aktif';
  $('bMulai').innerHTML = icon('play', 15) + (!sesi ? 'Mulai sesi' : aktif ? 'Sesi berjalan' : 'Lanjutkan');
  $('bMulai').disabled = aktif; $('bJeda').disabled = !aktif; $('bReset').disabled = !sesi;
  $('rot').value = String(sesi?.rotasi || settings.qrDetik || APP.gerbangDetik);
  $('sid').textContent = sesi ? `ID sesi ${sesi.id} · ${sesi.tanggal}` : '';
  if (!aktif) {
    $('qr').innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;text-align:center;background:var(--bg);border-radius:18px;color:var(--muted);padding:20px"><div>${icon(sesi ? 'zap' : 'qr', 40)}<p class="mt-2"><b>${sesi ? 'Sesi dijeda' : 'Sesi belum dimulai'}</b><br><span class="small">${sesi ? 'Siswa tidak bisa absen sampai dilanjutkan.' : 'Tekan “Mulai sesi” untuk menampilkan QR.'}</span></p></div></div>`;
    $('kd').textContent = '------'; tok = null;
  }
}
async function tick() {
  const d = new Date(db.now());
  $('clk').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $('dt').textContent = `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  if (!sesi) { $('st').textContent = 'Belum ada sesi hari ini'; $('tm').textContent = ''; $('pb').style.width = '0'; return; }
  if (sesi.status !== 'aktif') { $('st').textContent = 'Sesi dijeda'; $('tm').textContent = ''; $('pb').style.width = '0'; return; }
  if (!tok || db.now() >= tok.berlaku) { rotate(); return; }
  const sisa = Math.max(0, tok.berlaku - db.now()); $('st').textContent = 'QR aktif · berganti otomatis'; $('tm').textContent = Math.ceil(sisa / 1000) + ' dtk';
  $('pb').style.width = (sisa / ((sesi.rotasi || 20) * 1000)) * 100 + '%';
}
function feed() {
  const rows = Object.entries(hari).map(([uid, v]) => ({ uid, ...v })).filter((r) => r.jam);
  $('sH').textContent = rows.filter((r) => r.status === 'hadir').length; $('sT').textContent = rows.filter((r) => r.status === 'terlambat').length;
  $('sB').textContent = Math.max(0, users.length - Object.keys(hari).length);
  $('feed').innerHTML = rows.sort((a, b) => (b.ts || 0) - (a.ts || 0) || b.jam.localeCompare(a.jam)).slice(0, 4).map((r) => `<div>${icon(r.status === 'hadir' ? 'check-circle' : 'alert', 16)}<b style="font-weight:500">${esc(nama[r.uid] || 'Siswa')}</b><span>${r.jam} · ${r.status === 'hadir' ? 'Hadir' : 'Terlambat'}</span></div>`).join('') || '<div style="opacity:.7">Belum ada siswa yang memindai hari ini.</div>';
}

/* ---- tombol kontrol ---- */
$('bMulai').onclick = async () => { try { sesi = await mulaiSesi({ rotasi: Number($('rot').value), oleh: user.uid }); tok = null; paint(); toast('Sesi absensi dimulai.', 'ok'); } catch (e) { console.error(e); toast('Gagal memulai sesi.', 'err'); } };
$('bJeda').onclick = async () => { await aturStatusSesi('jeda'); };
$('bReset').onclick = async () => { if (await confirmBox('Reset sesi akan membatalkan semua QR yang sedang beredar dan membuat ID sesi baru. Absensi yang sudah tercatat tidak berubah. Lanjutkan?', { title: 'Reset sesi QR', ok: 'Reset sesi', danger: true })) { await buatSesiBaru({ rotasi: Number($('rot').value), oleh: user.uid }); tok = null; toast('Sesi baru dibuat.', 'ok'); } };
$('rot').onchange = async (e) => { if (sesi) await aturRotasi(Number(e.target.value)); };
$('fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

/* ---- sinkron realtime ---- */
db.listen('gerbang/sesi', (v) => {
  const baru = v && v.tanggal === dateKey(new Date(db.now())) ? v : null;
  const ganti = (baru?.id !== sesi?.id) || (baru?.status !== sesi?.status);
  sesi = baru; if (ganti) { tok = null; paint(); }
  if (sesi && !ganti) $('rot').value = String(sesi.rotasi);
});
db.listen('absensi_hari/' + dateKey(new Date(db.now())), (v) => { hari = v || {}; feed(); });
sesi = await getSesi(); if (sesi && sesi.tanggal !== dateKey(new Date(db.now()))) sesi = null;
paint(); feed(); tick(); setInterval(tick, 500);
