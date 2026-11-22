/* akademik.js — pembantu data akademik (jadwal, mapel, guru, tugas) yang dipakai banyak halaman */
import { db, toList } from './db.js';
import { HARI_KEY, toMin, nowMin, dateKey, arr, groupBy, nilaiAkhir } from './utils.js';
import { APP } from '../config.js';

export async function loadRef() {
  const [mapel, guru, kelas] = await Promise.all([db.get('mapel'), db.get('guru'), db.get('kelas')]);
  return { mapel: mapel || {}, guru: guru || {}, kelas: kelas || {}, mapelNama: (id) => mapel?.[id]?.nama || id, guruNama: (uid) => guru?.[uid]?.nama || '—' };
}

/** Jadwal satu hari → [{blok, mulai, selesai, mapelId, guruUid}] terurut */
export function jadwalHari(jadwalKelas, hariIdx) {
  const day = jadwalKelas?.[HARI_KEY[hariIdx]];
  return day ? Object.entries(day).map(([blok, v]) => ({ blok, ...v })).sort((a, b) => toMin(a.mulai) - toMin(b.mulai)) : [];
}
export const hariSekolahBerikut = (d = new Date()) => { let x = new Date(d); for (let i = 0; i < 7; i++) { if (x.getDay() >= 1 && x.getDay() <= 5) return x; x.setDate(x.getDate() + 1); } return x; };
export const statusJam = (l, isToday = true) => { if (!isToday) return ''; const n = nowMin(); return n >= toMin(l.selesai) ? 'past' : n >= toMin(l.mulai) ? 'now' : ''; };

/** Nilai per mapel & semester untuk satu siswa */
export function rekapNilai(nilaiObj, semester) {
  const rows = toList(nilaiObj).filter((n) => !semester || n.semester === semester);
  const by = groupBy(rows, (n) => n.mapelId);
  return Object.entries(by).map(([mapelId, items]) => ({ mapelId, items, ...nilaiAkhir(items) }));
}
export const semesterList = (nilaiObj) => [...new Set(toList(nilaiObj).map((n) => n.semester))].sort().reverse();
export const semLabel = (k) => { const [y, s] = String(k).split('-'); return s === '1' ? `Ganjil ${y}/${+y + 1}` : `Genap ${+y - 1}/${y}`; };

/** Status tugas bagi siswa: belum | terkumpul | dinilai | terlambat */
export function statusTugas(t, kumpul, todayKey = dateKey()) {
  if (kumpul) return kumpul.nilai != null ? 'dinilai' : (kumpul.waktu && dateKey(new Date(kumpul.waktu)) > t.tenggat ? 'terkumpul-telat' : 'terkumpul');
  return t.tenggat < todayKey ? 'terlambat' : 'belum';
}
export const STATUS_TUGAS = {
  belum: { label: 'Belum dikumpulkan', kind: 'warn' }, terlambat: { label: 'Lewat tenggat', kind: 'err' },
  terkumpul: { label: 'Terkumpul', kind: 'info' }, 'terkumpul-telat': { label: 'Terkumpul (telat)', kind: 'warn' }, dinilai: { label: 'Sudah dinilai', kind: 'ok' }
};
export { arr, APP };

/** Pasangan kelas+mapel yang diajar seorang guru (diturunkan dari jadwal) */
export async function pasanganGuru(uid) {
  const jadwal = (await db.get('jadwal')) || {}, set = new Map();
  for (const [kid, days] of Object.entries(jadwal)) for (const blocks of Object.values(days || {})) for (const b of Object.values(blocks || {})) if (b.guruUid === uid) set.set(kid + '|' + b.mapelId, { kelasId: kid, mapelId: b.mapelId });
  return [...set.values()];
}
export async function siswaKelas(kelasId) { return (await db.listBy('users', 'kelasId', kelasId)).filter((u) => u.role === 'siswa').sort((a, b) => a.nama.localeCompare(b.nama)); }
export const guruKelasList = async (uid, ref) => {
  const pairs = await pasanganGuru(uid), ids = new Set(pairs.map((p) => p.kelasId));
  Object.entries(ref.kelas).forEach(([id, k]) => { if (k.wali === uid) ids.add(id); });
  return { pairs, kelasIds: [...ids].sort() };
};

/** Kelas yang diwalikan seorang guru: {id, ...kelas} atau null (satu guru satu perwalian) */
export const kelasWali = (uid, ref) => { const e = Object.entries(ref.kelas).find(([, k]) => k.wali === uid); return e ? { id: e[0], ...e[1] } : null; };
export const namaKelas = (ref, id) => ref.kelas[id]?.nama || '–';
