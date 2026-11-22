/* utils.js — fungsi bantu umum (tanggal, format, DOM, gambar) */
import { APP } from '../config.js';

// Akar situs (agar tautan benar dari halaman di subfolder mana pun)
export const BASE = new URL('../../../', import.meta.url).href;
export const url = (p = '') => BASE + String(p).replace(/^\//, '');

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const qs = (k) => new URLSearchParams(location.search).get(k);

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
// Kunci hari berbasis teks (kunci angka berurutan akan diubah Firebase menjadi array)
export const HARI_KEY = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
export const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? Object.values(v) : []);
export const pad = (n) => String(n).padStart(2, '0');

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const isSchoolDay = (d) => d.getDay() >= 1 && d.getDay() <= 5;

export function fmtTanggal(v, { hari = false, singkat = false } = {}) {
  if (!v) return '–';
  const d = typeof v === 'number' ? new Date(v) : parseKey(v);
  const b = singkat ? BULAN[d.getMonth()].slice(0, 3) : BULAN[d.getMonth()];
  return `${hari ? HARI[d.getDay()] + ', ' : ''}${d.getDate()} ${b} ${d.getFullYear()}`;
}
export const fmtJam = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };
export function sisaWaktu(tenggatKey) {
  // tenggat berlaku sampai 23.59 pada hari tersebut
  const end = parseKey(tenggatKey); end.setHours(23, 59, 59);
  const ms = end - Date.now();
  const hari = Math.floor(ms / 864e5);
  if (ms < 0) return { telat: true, teks: hari >= -1 ? 'Lewat hari ini' : `Lewat ${Math.abs(hari + 1)} hari` };
  if (hari === 0) return { telat: false, teks: 'Hari ini' };
  if (hari === 1) return { telat: false, teks: 'Besok' };
  return { telat: false, teks: `${hari} hari lagi` };
}

export const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const round1 = (n) => Math.round(n * 10) / 10;
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const initials = (n = '') => n.replace(/[.,]/g, '').split(/\s+/).filter((w) => w && !/^(Drs|Dr|Hj|H|Ir|S|M)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export const toArr = (o) => (o ? Object.entries(o).map(([id, v]) => (v && typeof v === 'object' ? { id, ...v } : { id, value: v })) : []);
export const keys = (o) => (o ? Object.keys(o) : []);
export const sortBy = (arr, key, dir = 1) => [...arr].sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
export const groupBy = (arr, fn) => arr.reduce((m, x) => { (m[fn(x)] ||= []).push(x); return m; }, {});
export const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(n);
export const fmtBytes = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
export const copyText = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };

export const predikat = (n) => (n >= 90 ? 'A' : n >= 80 ? 'B' : n >= 70 ? 'C' : n >= 60 ? 'D' : 'E');
export const scoreClass = (n) => (n >= APP.kkm + 10 ? 'good' : n >= APP.kkm ? 'mid' : 'low');

// Nilai akhir berbobot dari daftar nilai satu mapel. Komponen yang belum ada diabaikan (bobot dinormalisasi).
export function nilaiAkhir(items) {
  const by = groupBy(items, (x) => x.jenis);
  let tot = 0, w = 0; const rata = {};
  for (const j of Object.keys(APP.bobot)) {
    const v = (by[j] || []).map((x) => Number(x.nilai)).filter((n) => !isNaN(n));
    rata[j] = v.length ? avg(v) : null;
    if (v.length) { tot += rata[j] * APP.bobot[j]; w += APP.bobot[j]; }
  }
  return { rata, akhir: w ? tot / w : null };
}

export const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[data-src="${src}"]`)) return res();
  const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s);
});

/* QR sebagai SVG string (library qrcode-generator, dimuat saat dibutuhkan) */
export async function qrSvg(text, { cell = 6, margin = 2, fg = '#0e1c38' } = {}) {
  if (!window.qrcode) await loadScript(url('assets/vendor/qrcode.js'));
  const q = window.qrcode(0, 'M'); q.addData(String(text)); q.make();
  const n = q.getModuleCount(), size = (n + margin * 2) * cell;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + margin) * cell} ${(r + margin) * cell}h${cell}v${cell}h-${cell}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${fg}"/></svg>`;
}

/* Gambar ilustrasi bawaan (SVG) agar tampilan tetap bagus tanpa foto asli */
const PALET = [['#2f80ed', '#56ccf2'], ['#1f6ad6', '#7a5af8'], ['#0f9d8a', '#56ccf2'], ['#4f5bd5', '#2f80ed'], ['#2a6fe0', '#38bdf8'], ['#6d5bd0', '#4facfe'], ['#0e9f6e', '#38bdf8'], ['#e8795a', '#f6ad55']];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function art(seed, { w = 800, h = 500 } = {}) {
  const hs = hash(seed), [a, b] = PALET[hs % PALET.length];
  const r = (n, m) => ((hs >> n) % m);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="r"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${120 + r(3, 500)}" cy="${60 + r(5, 120)}" r="${180 + r(7, 80)}" fill="url(#r)"/><circle cx="${w - 80 - r(9, 160)}" cy="${h - 40}" r="${140 + r(11, 90)}" fill="#fff" opacity=".12"/><path d="M0 ${h * .72} C ${w * .25} ${h * .6}, ${w * .5} ${h * .86}, ${w} ${h * .66} V${h} H0Z" fill="#fff" opacity=".16"/><path d="M0 ${h * .84} C ${w * .3} ${h * .74}, ${w * .62} ${h * .96}, ${w} ${h * .8} V${h} H0Z" fill="#fff" opacity=".14"/><g fill="#fff" opacity=".5">${Array.from({ length: 14 }, (_, i) => `<circle cx="${(hash(seed + i) % w)}" cy="${(hash(i + seed + 'y') % (h * .55))}" r="${2 + (i % 3)}"/>`).join('')}</g></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* Baca berkas → data URL; gambar dikompres lewat canvas agar ringan di database */
export async function fileToData(file, { maxDim = 1000, quality = 0.72, maxBytes = 450_000 } = {}) {
  if (!file) return null;
  if (file.type === 'application/pdf') {
    if (file.size > maxBytes) throw new Error(`PDF terlalu besar (maks ${fmtBytes(maxBytes)}). Kompres dulu atau gunakan foto.`);
    return { nama: file.name, tipe: file.type, ukuran: file.size, data: await readAsDataURL(file) };
  }
  if (!file.type.startsWith('image/')) throw new Error('Format berkas harus gambar (JPG/PNG) atau PDF.');
  const src = await readAsDataURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.')); i.src = src; });
  const k = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const data = c.toDataURL('image/jpeg', quality);
  return { nama: file.name, tipe: 'image/jpeg', ukuran: Math.round(data.length * 0.75), data };
}
const readAsDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Gagal membaca berkas.')); r.readAsDataURL(f); });

/* Kata sapa sesuai waktu */
export const sapaan = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; };

/* Warna mapel konsisten */
export const WARNA_MAPEL = { mtk: '#2f80ed', bin: '#e8795a', big: '#7a5af8', fis: '#0f9d8a', bdt: '#d98a00', pgd: '#0e9f6e', sej: '#b45f3c', pkn: '#dc3d43', inf: '#4f5bd5', pjk: '#2a9fd6' };
export const warnaMapel = (id) => WARNA_MAPEL[id] || '#2f80ed';
