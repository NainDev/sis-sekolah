import { mountPortal } from '../layout/portal.js';
import { db } from '../core/db.js';
import { icon } from '../core/icons.js';
import { esc, url, dateKey, fmtTanggal, BULAN, HARI, parseKey, loadScript, toMin } from '../core/utils.js';
import { absenDengan, rekap, AbsenError } from '../core/absensi.js';
import { empty, statusBadge, badge, toast, STATUS_ABSEN } from '../core/ui.js';

const { user, settings, el } = await mountPortal({ role: 'siswa', active: 'absensi', title: 'Absensi Mandiri', sub: 'Pindai QR di gerbang sekolah' });
let rows = {}, bulan = dateKey().slice(0, 7), mode = 'idle', stream = null, raf = 0, result = null;
const today = () => dateKey(new Date(db.now()));

function stopCam() { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null; }
window.addEventListener('pagehide', stopCam);

function render() {
  const hi = rows[today()];
  const st = hi ? (hi.status === 'hadir' ? 'ok' : hi.status === 'terlambat' ? 'late' : 'off') : 'off';
  const all = rekap(Object.values(rows)), months = [...new Set(Object.keys(rows).map((k) => k.slice(0, 7)))].sort().reverse();
  if (!months.includes(bulan) && months.length) months.unshift(bulan);
  const log = Object.entries(rows).filter(([k]) => k.startsWith(bulan)).sort((a, b) => b[0].localeCompare(a[0]));
  const rb = rekap(log.map(([, v]) => v));
  el.innerHTML = `<div class="stack">
  <div class="card"><div class="att-hero"><div class="att-status ${st}"><div class="ring">${icon(hi ? (hi.status === 'terlambat' ? 'alert' : 'check-circle') : 'qr')}</div><div><h3>${hi ? (hi.status === 'hadir' ? 'Kamu sudah hadir hari ini' : hi.status === 'terlambat' ? 'Kamu tercatat terlambat' : 'Status: ' + STATUS_ABSEN[hi.status].label) : 'Kamu belum absen hari ini'}</h3><p class="small muted">${HARI[new Date(db.now()).getDay()]}, ${fmtTanggal(today())}${hi?.jam ? ` · pukul ${hi.jam}` : ` · batas masuk ${esc(settings.jamMasuk || '07:00')}`}</p></div></div>
  ${hi && (hi.status === 'hadir' || hi.status === 'terlambat') ? '' : `<button class="btn btn-primary btn-lg" id="start">${icon('camera')}Pindai QR Gerbang</button>`}</div></div>
  <div id="scanPane"></div>
  <div class="grid g-2" style="align-items:start"><div class="stack"><div class="card"><div class="card-head"><h3>Ringkasan semester ini</h3></div><div class="sum-tiles"><div class="sum-tile ok"><b>${all.hadir}</b><span>Hadir</span></div><div class="sum-tile info"><b>${all.sakit}</b><span>Sakit</span></div><div class="sum-tile info" style="--x:1"><b style="color:var(--vio)">${all.izin}</b><span>Izin</span></div><div class="sum-tile err"><b>${all.alfa}</b><span>Alfa</span></div></div><div class="mt-3"><div class="flex between small mb-1"><span>Tingkat kehadiran</span><b>${all.persen}%</b></div><div class="progress"><i style="width:${all.persen}%"></i></div><p class="small muted mt-1">${all.terlambat} kali tercatat terlambat (dihitung hadir).</p></div></div></div>
  <div class="card"><div class="card-head"><h3>Riwayat kehadiran</h3><select class="select" id="bln" style="width:auto;padding:8px 36px 8px 12px">${months.map((m) => `<option value="${m}" ${m === bulan ? 'selected' : ''}>${BULAN[+m.slice(5) - 1]} ${m.slice(0, 4)}</option>`).join('')}</select></div>
  <div class="flex gap-1 wrap mb-2">${badge('Hadir ' + rb.hadir, 'ok')}${badge('Terlambat ' + rb.terlambat, 'warn')}${badge('Sakit ' + rb.sakit, 'info')}${badge('Izin ' + rb.izin, 'vio')}${badge('Alfa ' + rb.alfa, 'err')}</div>
  ${log.length ? `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="table"><thead><tr><th>Tanggal</th><th>Jam</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${log.map(([k, v]) => `<tr><td>${fmtTanggal(k, { hari: true, singkat: true })}</td><td>${v.jam || '–'}</td><td>${statusBadge(v.status)}</td><td class="small muted">${v.catatan ? esc(v.catatan) : v.metode === 'kode' ? 'Kode cadangan' : v.metode === 'qr' ? 'Pindai QR' : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('calendar', 'Belum ada catatan', 'Tidak ada data absensi pada bulan ini.')}</div></div></div>`;
  el.querySelector('#start')?.addEventListener('click', openScan);
  el.querySelector('#bln').onchange = (e) => { bulan = e.target.value; render(); };
  pane();
}

function pane() {
  const p = el.querySelector('#scanPane'); if (!p) return;
  if (mode === 'idle') { p.innerHTML = ''; return; }
  if (mode === 'result') {
    const r = result, cls = r.ok ? (r.status === 'terlambat' ? 'late' : '') : 'err';
    p.innerHTML = `<div class="card"><div class="result-card ${cls}"><div class="big">${icon(r.ok ? (r.status === 'terlambat' ? 'alert' : 'check') : 'x', 42)}</div><h2 style="font-size:21px">${r.ok ? (r.status === 'terlambat' ? 'Absen tercatat: Terlambat' : 'Absen berhasil: Hadir') : 'Absensi belum berhasil'}</h2><p class="muted mt-1" style="max-width:420px;margin-inline:auto">${r.ok ? `Tercatat pukul ${r.jam}.${r.telatMenit ? ` Terlambat ${r.telatMenit} menit dari batas masuk ${esc(settings.jamMasuk || '07:00')}.` : ' Selamat belajar!'}` : esc(r.msg)}</p><div class="mt-3 flex gap-2" style="justify-content:center">${r.ok ? '<button class="btn btn-primary" id="done">Selesai</button>' : '<button class="btn btn-primary" id="again">Coba lagi</button><button class="btn btn-ghost" id="done">Tutup</button>'}</div></div></div>`;
    p.querySelector('#done').onclick = () => { mode = 'idle'; render(); }; p.querySelector('#again')?.addEventListener('click', openScan);
    p.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
  }
  p.innerHTML = `<div class="card"><div class="card-head"><h3>Pindai QR Code gerbang</h3><button class="btn btn-ghost btn-sm" id="cls">${icon('x')}Tutup</button></div>
  <div class="scanner ${mode === 'nocam' ? 'off' : ''}" id="sc">${mode === 'nocam' ? `<div>${icon('camera', 34)}<p class="mt-2" id="camMsg">Kamera tidak tersedia.</p></div>` : '<video id="vid" playsinline muted></video><div class="frame"></div><div class="hint">Arahkan kamera ke QR di layar gerbang</div>'}</div>
  <div class="divider"></div><p class="small center muted mb-2">Kamera bermasalah? Masukkan <b>kode cadangan 6 angka</b> yang tampil di layar gerbang.</p>
  <form id="kf" class="code-input"><input class="input" id="kode" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code"><button class="btn btn-primary" type="submit">${icon('check')}Kirim</button></form>
  ${db.mode === 'local' ? `<div class="alert mt-3">${icon('info')}<div class="small">Mode demo: buka <a href="${url('gerbang.html')}" target="_blank" rel="noopener">layar QR gerbang</a> (login admin) di tab lain untuk menampilkan QR dan kode cadangan.</div></div>` : ''}</div>`;
  p.querySelector('#cls').onclick = () => { stopCam(); mode = 'idle'; render(); };
  p.querySelector('#kf').onsubmit = (e) => { e.preventDefault(); const k = p.querySelector('#kode').value; stopCam(); submit({ kode: k }); };
  if (mode === 'scan') startCam(p);
}

async function openScan() { result = null; mode = 'scan'; render(); }

async function startCam(p) {
  const vid = p.querySelector('#vid');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error(isSecureContext ? 'Peramban tidak mendukung kamera.' : 'Kamera hanya bisa dipakai lewat HTTPS atau localhost.');
    await loadScript(url('assets/vendor/jsQR.js'));
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 } }, audio: false });
    vid.srcObject = stream; await vid.play();
  } catch (e) {
    stopCam(); mode = 'nocam'; pane();
    const m = el.querySelector('#camMsg'); if (m) m.textContent = e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan peramban, atau gunakan kode cadangan.' : (e.message || 'Kamera tidak dapat dibuka.') + ' Gunakan kode cadangan di bawah.';
    return;
  }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  let busy = false;
  const tick = () => {
    if (!stream) return;
    if (!busy && vid.readyState === vid.HAVE_ENOUGH_DATA) {
      const k = Math.min(1, 480 / Math.max(vid.videoWidth, vid.videoHeight)); cv.width = vid.videoWidth * k; cv.height = vid.videoHeight * k;
      cx.drawImage(vid, 0, 0, cv.width, cv.height);
      const q = window.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
      if (q && q.data) { busy = true; stopCam(); submit({ qr: q.data }); return; }
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}

async function submit(arg) {
  mode = 'proses'; const p = el.querySelector('#scanPane'); p.innerHTML = `<div class="card center"><div class="spinner dark" style="margin:20px auto;width:34px;height:34px"></div><p class="muted">Memeriksa kode absensi…</p></div>`;
  try { const r = await absenDengan(user, arg); result = { ok: true, ...r }; toast('Absensi berhasil dicatat.', 'ok'); }
  catch (e) { result = { ok: false, msg: e instanceof AbsenError ? e.message : 'Terjadi gangguan jaringan. Coba lagi.' }; if (!(e instanceof AbsenError)) console.error(e); }
  mode = 'result'; render();
}

db.listen('absensi/' + user.uid, (v) => { rows = v || {}; if (mode !== 'scan' && mode !== 'proses') render(); });
