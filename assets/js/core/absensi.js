/* ============================================================
   absensi.js — logika absensi QR gerbang (kiosk, siswa, wali kelas)

   Model data (Realtime Database):
     gerbang/sesi            {id, tanggal, status:'aktif'|'jeda', rotasi(detik), mulai, oleh}
     gerbang/token/{tokenId} {token, sesiId, mulai, berlaku, kode}
     gerbang/kode/{kode6}    {tokenId, berlaku}          ← kode cadangan
     gerbang_pakai/{tokenId}/{uid} = ts                   ← penanda sekali pakai
     absensi/{uid}/{tgl}     {status, jam, ts, metode, tokenId}
     absensi_hari/{tgl}/{uid}{status, jam, kelasId}      ← dibaca dashboard wali kelas

   Payload QR:  SISABSEN|1|{sesiId}|{tokenId}|{token}|{exp}
   Alur pindai: format → sesi aktif → sesi sama → belum kedaluwarsa →
                token cocok → belum dipakai siswa ini → belum absen hari ini
                → tentukan Hadir/Terlambat → tulis atomik (satu update multi-path).
   ============================================================ */
import { db } from './db.js';
import { APP } from '../config.js';
import { dateKey, toMin, pad } from './utils.js';

export class AbsenError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
const rand = (chars, n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

/* ---------- kontrol sesi (kiosk) ---------- */
export const getSesi = () => db.get('gerbang/sesi');
export async function mulaiSesi({ rotasi, oleh }) {
  const now = new Date(db.now()), tgl = dateKey(now), cur = await getSesi();
  if (cur && cur.tanggal === tgl && cur.status !== 'selesai') {
    const s = { ...cur, status: 'aktif', rotasi: rotasi || cur.rotasi }; await db.set('gerbang/sesi', s); return s;
  }
  return buatSesiBaru({ rotasi, oleh });
}
export async function buatSesiBaru({ rotasi, oleh }) {
  const s = { id: rand('abcdefghjkmnpqrstuvwxyz23456789', 6), tanggal: dateKey(new Date(db.now())), status: 'aktif', rotasi: rotasi || APP.gerbangDetik, mulai: db.now(), oleh: oleh || null };
  await db.set('gerbang/sesi', s); return s;
}
export const aturStatusSesi = (status) => db.set('gerbang/sesi/status', status);
export const aturRotasi = (detik) => db.set('gerbang/sesi/rotasi', detik);

/* ---------- token & QR ---------- */
export function buatToken(sesi) {
  const mulai = db.now();
  return { sesiId: sesi.id, tokenId: rand('abcdefghjkmnpqrstuvwxyz23456789', 8), token: rand('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 20), kode: rand('0123456789', 6), mulai, berlaku: mulai + sesi.rotasi * 1000 };
}
export const qrText = (t) => `SISABSEN|1|${t.sesiId}|${t.tokenId}|${t.token}|${t.berlaku}`;
export function parseQr(text) {
  const m = String(text || '').trim().match(/^SISABSEN\|1\|([a-z0-9]{6})\|([a-z0-9]{8})\|([A-Z0-9]{20})\|(\d{10,15})$/);
  return m ? { sesiId: m[1], tokenId: m[2], token: m[3], exp: Number(m[4]) } : null;
}
export async function terbitkan(t) {
  await db.update('', { [`gerbang/token/${t.tokenId}`]: { token: t.token, sesiId: t.sesiId, mulai: t.mulai, berlaku: t.berlaku, kode: t.kode }, [`gerbang/kode/${t.kode}`]: { tokenId: t.tokenId, berlaku: t.berlaku } });
  // bersihkan token lama (> 3 menit) agar database tetap kecil
  const lama = (await db.get('gerbang/token')) || {}, rm = {};
  for (const [id, v] of Object.entries(lama)) if (v.berlaku < db.now() - 180000) { rm[`gerbang/token/${id}`] = null; rm[`gerbang/kode/${v.kode}`] = null; rm[`gerbang_pakai/${id}`] = null; }
  if (Object.keys(rm).length) await db.update('', rm);
}

/* ---------- sisi siswa ---------- */
/** Validasi + simpan absensi. Melempar AbsenError berisi pesan ramah pengguna. */
export async function absenDengan(user, { qr, kode }) {
  const settings = (await db.get('pengaturan')) || {};
  const now = new Date(db.now()), tgl = dateKey(now);
  const menit = now.getHours() * 60 + now.getMinutes();

  if (!settings.modeUji) {
    if (now.getDay() === 0 || now.getDay() === 6) throw new AbsenError('Hari ini bukan hari sekolah, jadi absensi QR belum dibuka.', 'libur');
    if (settings.libur && settings.libur[tgl]) throw new AbsenError(`Hari ini libur: ${settings.libur[tgl]}.`, 'libur');
    if (menit > toMin(settings.jamPulang || '14:00')) throw new AbsenError('Waktu absensi hari ini sudah berakhir.', 'selesai');
  }

  let tokenId, token, sesiId, exp;
  if (qr) {
    const p = parseQr(qr);
    if (!p) throw new AbsenError('QR Code ini bukan QR absensi sekolah. Pindai QR yang tampil di layar gerbang.', 'format');
    ({ tokenId, token, sesiId, exp } = p);
    if (db.now() > exp + APP.gerbangToleransiDetik * 1000) throw new AbsenError('QR sudah kedaluwarsa. Pindai ulang QR yang sedang tampil di gerbang.', 'kedaluwarsa');
  } else {
    const k = String(kode || '').replace(/\D/g, '');
    if (k.length !== 6) throw new AbsenError('Kode cadangan terdiri dari 6 angka.', 'format');
    const row = await db.get('gerbang/kode/' + k);
    if (!row) throw new AbsenError('Kode tidak ditemukan atau sudah kedaluwarsa. Periksa kode terbaru di layar gerbang.', 'tidak-ada');
    tokenId = row.tokenId;
  }

  const sesi = await getSesi();
  if (!sesi || sesi.tanggal !== tgl) throw new AbsenError('Sesi absensi hari ini belum dimulai. Minta petugas membuka layar QR gerbang.', 'sesi');
  if (sesi.status !== 'aktif') throw new AbsenError('Sesi absensi sedang dijeda oleh petugas. Coba lagi sebentar.', 'jeda');
  if (sesiId && sesiId !== sesi.id) throw new AbsenError('QR ini berasal dari sesi lama (sesi sudah di-reset). Pindai QR yang sedang tampil.', 'sesi-lama');

  const t = await db.get('gerbang/token/' + tokenId);
  if (!t || (token && t.token !== token)) throw new AbsenError('QR tidak valid atau sudah diganti. Pindai ulang QR yang sedang tampil.', 'tidak-valid');
  if (t.sesiId !== sesi.id) throw new AbsenError('QR ini berasal dari sesi lama. Pindai QR yang sedang tampil.', 'sesi-lama');
  const tol = Math.min(APP.gerbangToleransiDetik, Math.ceil((t.berlaku - t.mulai) / 2000));
  if (db.now() > t.berlaku + tol * 1000) throw new AbsenError('QR sudah kedaluwarsa. Pindai ulang QR yang sedang tampil di gerbang.', 'kedaluwarsa');

  const [dipakai, sudah] = await Promise.all([db.get(`gerbang_pakai/${tokenId}/${user.uid}`), db.get(`absensi/${user.uid}/${tgl}`)]);
  if (dipakai) throw new AbsenError('QR ini sudah pernah kamu pakai. Tunggu QR berikutnya bila perlu.', 'dipakai');
  if (sudah && (sudah.status === 'hadir' || sudah.status === 'terlambat')) throw new AbsenError(`Kamu sudah absen hari ini pukul ${sudah.jam}.`, 'sudah');

  const batas = toMin(settings.jamMasuk || '07:00') + (Number(settings.toleransiMenit) || 0);
  const status = menit > batas ? 'terlambat' : 'hadir';
  const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const rec = { status, jam, ts: db.now(), metode: kode ? 'kode' : 'qr', tokenId };
  await db.update('', {
    [`absensi/${user.uid}/${tgl}`]: rec,
    [`absensi_hari/${tgl}/${user.uid}`]: { status, jam, kelasId: user.kelasId || null, metode: rec.metode, ts: rec.ts },
    [`gerbang_pakai/${tokenId}/${user.uid}`]: rec.ts
  });
  return { status, jam, tgl, telatMenit: status === 'terlambat' ? menit - toMin(settings.jamMasuk || '07:00') : 0 };
}

export const rekap = (rows) => { const r = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alfa: 0 }; rows.forEach((x) => { if (r[x.status] !== undefined) r[x.status]++; }); r.total = rows.length; r.persen = r.total ? Math.round(((r.hadir + r.terlambat) / r.total) * 100) : 0; return r; };
