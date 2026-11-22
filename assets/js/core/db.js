/* ============================================================
   db.js — lapisan data dengan dua backend yang API-nya sama:
     • Firebase Realtime Database (bila config.js terisi)
     • Mode demo lokal (localStorage + sinkron antar-tab)
   Semua halaman hanya memakai objek `db` di bawah ini.
   ============================================================ */
import { firebaseConfig, USE_FIREBASE, APP } from '../config.js';

const clean = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
const parts = (p) => String(p).split('/').filter(Boolean);
export const pushKey = () => Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 7);

/* ---------------------------- Backend lokal ---------------------------- */
const LKEY = 'sis_sekolah_db';
const local = (() => {
  let tree = {};
  const subs = new Set();
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('sis_sekolah') : null;

  const persist = () => { try { localStorage.setItem(LKEY, JSON.stringify(tree)); } catch (e) { console.warn('Penyimpanan lokal penuh', e); } bc && bc.postMessage('chg'); };
  const getAt = (path) => { let n = tree; for (const k of parts(path)) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; };
  const setAt = (path, val) => {
    const ps = parts(path);
    if (!ps.length) { tree = clean(val) || {}; return; }
    const stack = [tree]; let n = tree;
    for (let i = 0; i < ps.length - 1; i++) {
      if (n[ps[i]] == null || typeof n[ps[i]] !== 'object') { if (val == null) return; n[ps[i]] = {}; }
      n = n[ps[i]]; stack.push(n);
    }
    const last = ps[ps.length - 1];
    if (val == null) {
      delete n[last];
      for (let i = stack.length - 1; i > 0 && !Object.keys(stack[i]).length; i--) delete stack[i - 1][ps[i - 1]];
    } else n[last] = clean(val);
  };
  const notify = () => setTimeout(() => subs.forEach((s) => s.fire()), 0);

  return {
    async init() {
      let raw = null; try { raw = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch { /* abaikan */ }
      const { buildSeed, SEED_VERSION } = await import('./seed.js');
      if (!raw || raw._meta?.v !== SEED_VERSION) { tree = buildSeed({ withPasswords: true }).tree; tree._meta = { v: SEED_VERSION }; persist(); }
      else tree = raw;
      const reload = () => { try { tree = JSON.parse(localStorage.getItem(LKEY)); } catch { /* */ } notify(); };
      window.addEventListener('storage', (e) => { if (e.key === LKEY) reload(); });
      bc && (bc.onmessage = reload);
    },
    async reset() { const { buildSeed, SEED_VERSION } = await import('./seed.js'); tree = buildSeed({ withPasswords: true }).tree; tree._meta = { v: SEED_VERSION }; persist(); notify(); },
    get: async (p) => clean(getAt(p)),
    set: async (p, v) => { setAt(p, v); persist(); notify(); },
    update: async (p, obj) => { for (const [k, v] of Object.entries(obj)) setAt(`${p}/${k}`, v); persist(); notify(); },
    remove: async (p) => { setAt(p, null); persist(); notify(); },
    push: async (p, v) => { const k = pushKey(); setAt(`${p}/${k}`, v); persist(); notify(); return k; },
    listen(p, cb) {
      let last;
      const s = { fire() { const v = clean(getAt(p)), j = JSON.stringify(v); if (j !== last) { last = j; cb(v); } } };
      subs.add(s); setTimeout(() => s.fire(), 0);
      return () => subs.delete(s);
    },
    listenBy(p, child, val, cb) {
      let last;
      const s = { fire() { const o = getAt(p) || {}, out = {}; for (const [k, v] of Object.entries(o)) if (v && v[child] === val) out[k] = v; const j = JSON.stringify(out); if (j !== last) { last = j; cb(clean(out)); } } };
      subs.add(s); setTimeout(() => s.fire(), 0); return () => subs.delete(s);
    },
    async by(p, child, val) { const o = getAt(p) || {}; const out = {}; for (const [k, v] of Object.entries(o)) if (v && v[child] === val) out[k] = v; return clean(out); }
  };
})();

/* ---------------------------- Backend Firebase ---------------------------- */
let FB = null;
let srvOffset = 0;
const remote = {
  async init() {
    const base = `https://www.gstatic.com/firebasejs/${APP.firebaseVersion}`;
    const [app, dbm, authm] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-database.js`), import(`${base}/firebase-auth.js`)]);
    const a = app.initializeApp(firebaseConfig);
    FB = { app, dbm, authm, a, database: dbm.getDatabase(a), auth: authm.getAuth(a) };
    dbm.onValue(dbm.ref(FB.database, '.info/serverTimeOffset'), (s) => { srvOffset = s.val() || 0; });
  },
  async get(p) { const s = await FB.dbm.get(FB.dbm.ref(FB.database, p)); return s.val(); },
  async set(p, v) { await FB.dbm.set(FB.dbm.ref(FB.database, p), clean(v)); },
  async update(p, obj) { const o = {}; for (const [k, v] of Object.entries(obj)) o[k] = clean(v); await FB.dbm.update(FB.dbm.ref(FB.database, p), o); },
  async remove(p) { await FB.dbm.remove(FB.dbm.ref(FB.database, p)); },
  async push(p, v) { const r = FB.dbm.push(FB.dbm.ref(FB.database, p)); await FB.dbm.set(r, clean(v)); return r.key; },
  listen(p, cb) { return FB.dbm.onValue(FB.dbm.ref(FB.database, p), (s) => cb(s.val())); },
  listenBy(p, child, val, cb) { const q = FB.dbm.query(FB.dbm.ref(FB.database, p), FB.dbm.orderByChild(child), FB.dbm.equalTo(val)); return FB.dbm.onValue(q, (s) => cb(s.val())); },
  async by(p, child, val) { const q = FB.dbm.query(FB.dbm.ref(FB.database, p), FB.dbm.orderByChild(child), FB.dbm.equalTo(val)); const s = await FB.dbm.get(q); return s.val(); }
};

/* ---------------------------- API publik ---------------------------- */
const impl = USE_FIREBASE ? remote : local;
let readyP;
const ready = () => (readyP ||= impl.init());
const toList = (o) => (o ? Object.entries(o).map(([id, v]) => (v && typeof v === 'object' ? { id, ...v } : { id, value: v })) : []);

export const db = {
  mode: USE_FIREBASE ? 'firebase' : 'local',
  /** Waktu server (ms). Menghindari selisih jam antar perangkat. */
  now: () => Date.now() + srvOffset,
  ready,
  async get(p) { await ready(); return impl.get(p); },
  async set(p, v) { await ready(); return impl.set(p, v); },
  async update(p, o) { await ready(); return impl.update(p, o); },
  async remove(p) { await ready(); return impl.remove(p); },
  async push(p, v) { await ready(); return impl.push(p, v); },
  /** Berlangganan perubahan realtime. Mengembalikan fungsi berhenti. */
  listen(p, cb) { let off = () => {}, stop = false; ready().then(() => { if (!stop) off = impl.listen(p, cb); }); return () => { stop = true; off(); }; },
  /** Realtime untuk anak dengan field `child` == `val` */
  listenBy(p, child, val, cb) { let off = () => {}, stop = false; ready().then(() => { if (!stop) off = impl.listenBy(p, child, val, cb); }); return () => { stop = true; off(); }; },
  /** Ambil sebagai array [{id, ...}] */
  async list(p) { return toList(await db.get(p)); },
  /** Ambil anak yang field `child`-nya sama dengan `val` (memakai indeks Firebase) */
  async listBy(p, child, val) { await ready(); return toList(await impl.by(p, child, val)); },
  /** Hanya mode demo: reset ke seed awal */
  async resetDemo() { await ready(); if (impl.reset) await impl.reset(); },
  firebase: async () => { await ready(); return FB; }
};
export { toList };
