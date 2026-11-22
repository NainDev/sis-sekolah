/* setup.js — pengisian data awal ke Firebase (sekali jalan). Hanya aktif bila config.js sudah terisi. */
import { USE_FIREBASE, APP, firebaseConfig } from '../config.js';
import { db } from '../core/db.js';
import { createAccount, toEmail } from '../core/auth.js';
import { buildSeed } from '../core/seed.js';
import { icon } from '../core/icons.js';
import { esc, url } from '../core/utils.js';

const app = document.getElementById('app');
const shell = (inner) => `<div class="wrap-w" style="max-width:760px;padding:40px 0"><div class="card">${inner}</div></div>`;

if (!USE_FIREBASE) {
  app.innerHTML = shell(`<h1 style="font-size:24px" class="mb-2">Setup Firebase</h1><div class="alert warn mb-3">${icon('alert')}<div>Firebase belum dikonfigurasi, jadi aplikasi berjalan dalam <b>mode demo</b> (data tersimpan di browser). Tidak perlu setup apa pun untuk mencoba.</div></div>
  <h3 class="mb-2">Untuk memakai Firebase Realtime Database</h3><ol class="timeline">${[
    'Buat proyek di <b>console.firebase.google.com</b>.',
    'Menu <b>Build → Authentication</b> → Get started → aktifkan provider <b>Email/Password</b>.',
    'Menu <b>Build → Realtime Database</b> → Create database (pilih lokasi asia-southeast1) → mulai dengan <i>locked mode</i>.',
    'Tab <b>Rules</b> pada Realtime Database: tempel isi berkas <code>database.rules.json</code> lalu Publish.',
    'Project settings → Your apps → tambahkan aplikasi <b>Web</b>, salin firebaseConfig ke <code>assets/js/config.js</code> (termasuk databaseURL).',
    'Authentication → Settings → Authorized domains: tambahkan domain tempat aplikasi di-hosting.',
    'Buka halaman ini lagi lalu klik <b>Isi data awal</b>.'
  ].map((t) => `<li class="done"><span class="small">${t}</span></li>`).join('')}</ol><a class="btn btn-ghost mt-3" href="${url('index.html')}">${icon('arrow-left')}Kembali ke beranda</a>`);
} else {
  const { tree, accounts } = buildSeed({ withPasswords: false });
  app.innerHTML = shell(`<h1 style="font-size:24px" class="mb-1">Setup data awal Firebase</h1><p class="muted mb-3">Proyek: <b>${esc(firebaseConfig.projectId || firebaseConfig.databaseURL)}</b></p>
  <div class="alert mb-3">${icon('info')}<div class="small">Langkah ini membuat <b>${accounts.length} akun</b> (1 akun admin utama, ${accounts.filter((a) => a.role === 'guru').length} guru, ${accounts.filter((a) => a.role === 'siswa').length} siswa, 1 staf TU) lalu mengisi data contoh. Kata sandi awal: <code>admin123</code>, <code>guru123</code>, <code>siswa123</code>. <b>Ganti segera</b> bila dipakai sungguhan. Aman dijalankan ulang; data akan ditimpa.</div></div>
  <button class="btn btn-primary btn-lg" id="go">${icon('database')}Isi data awal</button><div class="mt-3" id="log" style="display:grid;gap:6px;font-size:14px"></div>`);
  const log = (t, ok = true) => { const d = document.createElement('div'); d.className = 'flex gap-1 items-center'; d.innerHTML = `${icon(ok ? 'check-circle' : 'x-circle', 16)}<span>${esc(t)}</span>`; d.style.color = ok ? 'var(--ok)' : 'var(--err)'; document.getElementById('log').appendChild(d); };
  document.getElementById('go').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const fb = await db.firebase(), map = {};
      // 1) Admin utama (masuk sebagai admin agar aturan database mengizinkan penulisan)
      const adm = accounts.find((a) => a.username === 'admin');
      try { const c = await fb.authm.createUserWithEmailAndPassword(fb.auth, toEmail(adm.username), adm.password); map[adm.uid] = c.user.uid; log('Akun admin dibuat'); }
      catch (er) { if (er.code !== 'auth/email-already-in-use') throw er; const c = await fb.authm.signInWithEmailAndPassword(fb.auth, toEmail(adm.username), adm.password); map[adm.uid] = c.user.uid; log('Akun admin sudah ada, dipakai ulang'); }
      await db.set('users/' + map[adm.uid], { ...tree.users[adm.uid] });
      // 2) Akun lainnya lewat aplikasi sekunder
      for (const a of accounts.filter((x) => x.uid !== adm.uid)) {
        try { map[a.uid] = await createAccount(a.username, a.password); }
        catch (er) {
          if (!/sudah terdaftar/.test(er.message)) throw er;
          const sec = fb.app.getApp('secondary'); const c = await fb.authm.signInWithEmailAndPassword(fb.authm.getAuth(sec), toEmail(a.username), a.password); map[a.uid] = c.user.uid; await fb.authm.signOut(fb.authm.getAuth(sec));
        }
      }
      log(`${accounts.length} akun siap`);
      // 3) Ganti uid seed dengan uid Firebase di seluruh data
      const data = JSON.parse(JSON.stringify(tree).replace(/"(u_[A-Za-z0-9]+)"/g, (m, k) => (map[k] ? `"${map[k]}"` : m)));
      for (const [k, v] of Object.entries(data)) { await db.set(k, v); log(`Data “${k}” tersimpan`); }
      log('Selesai. Anda dapat masuk dengan akun admin / admin123.');
      document.getElementById('log').insertAdjacentHTML('beforeend', `<a class="btn btn-primary mt-2" href="${url('login.html')}">${icon('log-in')}Ke halaman masuk</a>`);
    } catch (er) { console.error(er); log('Gagal: ' + (er.message || er.code) + '. Periksa aturan database & provider Email/Password.', false); e.target.disabled = false; }
  };
}
