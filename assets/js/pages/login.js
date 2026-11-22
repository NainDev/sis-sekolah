import { db } from '../core/db.js';
import { initAuth, login, homeFor } from '../core/auth.js';
import { icon } from '../core/icons.js';
import { esc, url, qs } from '../core/utils.js';
import { toast, setBusy, eyeToggle } from '../core/ui.js';

const [s, u] = await Promise.all([db.get('pengaturan'), initAuth()]);
if (u) location.replace(homeFor(u.role));
const cfg = s || {};
const demo = db.mode === 'local';
let demoAcc = {};
if (demo) { const { buildSeed } = await import('../core/seed.js'); demoAcc = buildSeed({ withPasswords: true }).demo; }

document.getElementById('app').innerHTML = `<div class="login-shell">
<div class="login-side"><a class="brand" href="${url('index.html')}"><span class="brand-mark">${icon('graduation')}</span><span><b>${esc(cfg.singkat || 'Sekolah')}</b><small>${esc(cfg.slogan || '')}</small></span></a>
<div><h2>Satu pintu untuk belajar, mengajar, dan mengelola sekolah</h2><p>Masuk untuk melihat jadwal, tugas, nilai, absensi QR, dan layanan sekolah lainnya.</p></div>
<div class="role-pills"><span>Siswa</span><span>Guru</span><span>Admin / TU</span></div></div>
<div class="login-form"><h1>Masuk ke portal</h1><p class="muted small mb-3">Gunakan NISN (siswa), NIP (guru), atau username (admin).</p>
<form id="f" novalidate><div class="field"><label for="id">NISN / NIP / Username</label><div class="input-group">${icon('user')}<input class="input" id="id" autocomplete="username" inputmode="text" required></div></div>
<div class="field"><label for="pw">Kata sandi</label><div class="input-group">${icon('lock')}<input class="input" id="pw" type="password" autocomplete="current-password" required style="padding-right:46px"><button type="button" class="toggle-eye" aria-label="Tampilkan sandi">${icon('eye', 18)}</button></div></div>
<div class="alert err" id="err" hidden>${icon('alert')}<div></div></div>
<button class="btn btn-primary btn-lg btn-block mt-2" type="submit">${icon('log-in')}Masuk</button></form>
${demo ? `<div class="demo-box"><div class="t">${icon('zap', 16)}Mode demo: coba cepat sebagai</div><div class="chips"><button class="chip" data-u="${demoAcc.siswa}" data-p="siswa123">Siswa</button><button class="chip" data-u="${demoAcc.guru}" data-p="guru123">Guru</button><button class="chip" data-u="${demoAcc.admin}" data-p="admin123">Admin / TU</button></div></div>` : ''}
<p class="small center mt-3"><a href="${url('index.html')}">${icon('arrow-left', 14)} Kembali ke beranda</a></p></div></div>`;
eyeToggle();
const f = document.getElementById('f'), err = document.getElementById('err');
async function go() {
  err.hidden = true; const btn = f.querySelector('button[type=submit]'); setBusy(btn, true, 'Memeriksa…');
  try { const user = await login(document.getElementById('id').value, document.getElementById('pw').value); toast(`Selamat datang, ${user.nama}.`, 'ok', 1500); const n = qs('next'); setTimeout(() => location.href = n && n.startsWith('/') ? n : homeFor(user.role), 350); }
  catch (e) { err.hidden = false; err.lastElementChild.textContent = e.message; setBusy(btn, false); }
}
f.onsubmit = (e) => { e.preventDefault(); go(); };
document.querySelectorAll('[data-u]').forEach((b) => b.onclick = () => { document.getElementById('id').value = b.dataset.u; document.getElementById('pw').value = b.dataset.p; go(); });
