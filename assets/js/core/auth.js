/* ============================================================
   auth.js — autentikasi multi-role (publik, siswa, guru, admin)
   Login memakai NISN (siswa) / NIP (guru) / username (admin).
   Firebase mode : Firebase Authentication (email dibentuk dari ID)
   Mode demo     : akun tersimpan di data lokal
   ============================================================ */
import { db } from './db.js';
import { APP, firebaseConfig } from '../config.js';
import { url } from './utils.js';

const SKEY = 'sis_sekolah_session';
let current = null;
let initP = null;

export const toEmail = (id) => `${String(id).trim().toLowerCase()}@${APP.emailDomain}`;
export const homeFor = (role) => url(role === 'admin' ? 'admin/index.html' : role === 'guru' ? 'guru/index.html' : 'siswa/index.html');
export const ROLE_LABEL = { siswa: 'Siswa', guru: 'Guru', admin: 'Admin / TU' };

export function initAuth() {
  return (initP ||= (async () => {
    await db.ready();
    if (db.mode === 'local') {
      const uid = localStorage.getItem(SKEY);
      if (uid) { const u = await db.get('users/' + uid); if (u && u.aktif !== false) current = { uid, ...u }; }
    } else {
      const { auth, authm } = await db.firebase();
      await new Promise((res) => {
        const off = authm.onAuthStateChanged(auth, async (fu) => {
          off();
          if (fu) {
            try { const u = await db.get('users/' + fu.uid); if (u && u.aktif !== false) current = { uid: fu.uid, ...u }; else await authm.signOut(auth); } catch { /* aturan basis data menolak */ }
          }
          res();
        });
      });
    }
    return current;
  })());
}
export const getUser = () => current;

const ERR = {
  'auth/invalid-credential': 'NISN/NIP/username atau kata sandi salah.',
  'auth/wrong-password': 'Kata sandi salah.',
  'auth/user-not-found': 'Akun tidak ditemukan.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  'auth/network-request-failed': 'Tidak ada koneksi internet.',
  'auth/email-already-in-use': 'ID/username ini sudah terdaftar di Firebase Authentication.',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'auth/requires-recent-login': 'Silakan keluar lalu masuk kembali sebelum mengganti kata sandi.'
};
const fbErr = (e) => new Error(ERR[e.code] || e.message || 'Terjadi kesalahan autentikasi.');

export async function login(id, password) {
  id = String(id || '').trim();
  if (!id || !password) throw new Error('Isi NISN/NIP/username dan kata sandi.');
  await db.ready();
  if (db.mode === 'local') {
    const users = (await db.get('users')) || {};
    const hit = Object.entries(users).find(([, u]) => String(u.username).toLowerCase() === id.toLowerCase());
    if (!hit || hit[1].password !== password) throw new Error('NISN/NIP/username atau kata sandi salah.');
    if (hit[1].aktif === false) throw new Error('Akun dinonaktifkan. Hubungi Tata Usaha.');
    localStorage.setItem(SKEY, hit[0]);
    current = { uid: hit[0], ...hit[1] };
    return current;
  }
  const { auth, authm } = await db.firebase();
  let cred;
  try { cred = await authm.signInWithEmailAndPassword(auth, toEmail(id), password); } catch (e) { throw fbErr(e); }
  const u = await db.get('users/' + cred.user.uid);
  if (!u) { await authm.signOut(auth); throw new Error('Akun belum terdaftar di sistem sekolah. Hubungi Tata Usaha.'); }
  if (u.aktif === false) { await authm.signOut(auth); throw new Error('Akun dinonaktifkan. Hubungi Tata Usaha.'); }
  current = { uid: cred.user.uid, ...u };
  return current;
}

export async function logout() {
  current = null; localStorage.removeItem(SKEY);
  if (db.mode === 'firebase') { const { auth, authm } = await db.firebase(); await authm.signOut(auth); }
  location.href = url('login.html');
}

/** Pastikan sudah login & role sesuai; bila tidak, arahkan ke halaman yang tepat. */
export async function requireRole(roles) {
  const u = await initAuth();
  if (!u) { location.replace(url('login.html') + '?next=' + encodeURIComponent(location.pathname + location.search)); return new Promise(() => {}); }
  if (roles && !roles.includes(u.role)) { location.replace(homeFor(u.role)); return new Promise(() => {}); }
  return u;
}

/** Admin membuat akun baru tanpa mengeluarkan dirinya sendiri. Mengembalikan uid. */
export async function createAccount(username, password) {
  username = String(username).trim();
  if (db.mode === 'local') {
    const users = (await db.get('users')) || {};
    if (Object.values(users).some((u) => String(u.username).toLowerCase() === username.toLowerCase())) throw new Error('Username/NISN/NIP sudah terdaftar.');
    return 'u_' + username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const fb = await db.firebase();
  let sec; try { sec = fb.app.getApp('secondary'); } catch { sec = fb.app.initializeApp(firebaseConfig, 'secondary'); }
  const sAuth = fb.authm.getAuth(sec);
  try {
    const c = await fb.authm.createUserWithEmailAndPassword(sAuth, toEmail(username), password);
    await fb.authm.signOut(sAuth);
    return c.user.uid;
  } catch (e) { throw fbErr(e); }
}

export async function changePassword(oldPw, newPw) {
  if (!current) throw new Error('Belum masuk.');
  if (String(newPw).length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');
  if (db.mode === 'local') {
    const u = await db.get('users/' + current.uid);
    if (u.password !== oldPw) throw new Error('Kata sandi lama salah.');
    await db.update('users/' + current.uid, { password: newPw });
    return;
  }
  const { auth, authm } = await db.firebase();
  try {
    const cred = authm.EmailAuthProvider.credential(auth.currentUser.email, oldPw);
    await authm.reauthenticateWithCredential(auth.currentUser, cred);
    await authm.updatePassword(auth.currentUser, newPw);
  } catch (e) { throw fbErr(e); }
}

/** Hanya mode demo (Firebase tidak mengizinkan klien mengganti sandi orang lain). */
export async function adminResetPassword(uid, newPw) {
  if (db.mode !== 'local') throw new Error('Reset sandi pengguna lain dilakukan lewat Firebase Console (Authentication).');
  await db.update('users/' + uid, { password: newPw });
}

export async function updateSelf(patch) {
  await db.update('users/' + current.uid, patch);
  current = { ...current, ...patch };
  return current;
}
