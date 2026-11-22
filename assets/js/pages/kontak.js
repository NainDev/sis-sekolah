import { db } from '../core/db.js';
import { mountPublic, pageHero, reveal } from '../layout/public.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/utils.js';
import { toast, validate, setBusy } from '../core/ui.js';

const s = await mountPublic('kontak');
const CI = [['map-pin', 'Alamat', s.alamat], ['phone', 'Telepon / WhatsApp', `${s.telp} · ${s.wa}`], ['mail', 'Email', s.email], ['clock', 'Jam operasional', `${s.jamOperasional}\n${s.jamOperasional2 || ''}`], ['globe', 'Media sosial', `Instagram ${s.instagram} · YouTube ${s.youtube}`]];
document.getElementById('app').innerHTML = pageHero('Kontak & Lokasi', 'Ada pertanyaan atau ingin berkunjung? Kami senang membantu.', 'Kontak') + `<section class="sec"><div class="wrap-w"><div class="contact-grid">
<div class="stack"><div class="card reveal">${CI.map(([i, t, v]) => `<div class="ci"><div class="ico">${icon(i, 20)}</div><div><b>${t}</b><span style="white-space:pre-line">${esc(v)}</span></div></div>`).join('')}</div>
<div class="map-box reveal"><iframe title="Peta lokasi sekolah" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.alamat)}&z=14&output=embed"></iframe></div></div>
<form class="card reveal" id="f" novalidate><h3 class="mb-1">Kirim pesan</h3><p class="small muted mb-3">Pesan Anda akan diterima Tata Usaha dan dibalas melalui email.</p>
<div class="row-2"><div class="field"><label for="nama">Nama lengkap</label><input class="input" id="nama" required autocomplete="name"></div><div class="field"><label for="email">Email</label><input class="input" id="email" type="email" required autocomplete="email"></div></div>
<div class="field"><label for="subjek">Subjek</label><input class="input" id="subjek" required></div>
<div class="field"><label for="isi">Pesan</label><textarea class="textarea" id="isi" rows="6" required></textarea></div>
<button class="btn btn-primary btn-lg btn-block" type="submit">${icon('send')}Kirim Pesan</button></form>
</div></div></section>`;
reveal();
const f = document.getElementById('f');
f.onsubmit = async (e) => {
  e.preventDefault();
  if (!validate(f)) return toast('Lengkapi semua kolom terlebih dahulu.', 'warn');
  const email = f.email.value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { f.email.classList.add('invalid'); return toast('Format email belum benar.', 'warn'); }
  const btn = f.querySelector('button'); setBusy(btn, true, 'Mengirim…');
  try {
    await db.push('pesan', { nama: f.nama.value.trim(), email, subjek: f.subjek.value.trim(), isi: f.isi.value.trim(), tanggal: Date.now(), dibaca: false });
    f.reset(); toast('Terima kasih! Pesan Anda sudah terkirim.', 'ok');
  } catch { toast('Pesan gagal terkirim. Coba lagi sebentar lagi.', 'err'); }
  setBusy(btn, false);
};
