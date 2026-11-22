/* ============================================================
   config.js — satu-satunya berkas yang perlu Anda ubah untuk
   menghubungkan aplikasi ke Firebase.

   Kosongkan (biarkan "") untuk memakai MODE DEMO: data disimpan di
   browser (localStorage), lengkap dengan seed data, tanpa Firebase.
   Isi nilai dari Firebase Console → Project settings → Your apps (Web)
   untuk memakai Realtime Database + Authentication sungguhan.
   ============================================================ */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // contoh: https://nama-proyek-default-rtdb.asia-southeast1.firebasedatabase.app
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const APP = {
  // Domain "palsu" untuk mengubah NISN/NIP/username menjadi email Firebase Auth.
  emailDomain: "portal.sekolah.local",
  firebaseVersion: "11.0.2",
  // QR gerbang berganti setiap N detik (+ masa toleransi pindai)
  gerbangDetik: 30,
  gerbangToleransiDetik: 12,
  kkm: 75,
  // Bobot nilai akhir raport
  bobot: { Tugas: 0.25, UH: 0.25, UTS: 0.2, UAS: 0.3 }
};

export const USE_FIREBASE = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
