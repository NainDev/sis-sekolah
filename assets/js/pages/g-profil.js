import { mountPortal } from '../layout/portal.js';
import { db } from '../core/db.js';
import { updateSelf } from '../core/auth.js';
import { icon } from '../core/icons.js';
import { esc, initials } from '../core/utils.js';
import { loadRef, pasanganGuru } from '../core/akademik.js';
import { toast, setBusy, badge } from '../core/ui.js';

const { user: u0, el } = await mountPortal({ role: 'guru', active: 'profil', title: 'Profil Saya' });
const ref = await loadRef(); const pairs = await pasanganGuru(u0.uid); let user = u0;
const walis = Object.values(ref.kelas).filter((k) => k.wali === user.uid).map((k) => k.nama);
el.innerHTML = `<div class="grid g-2" style="align-items:start"><div class="card"><div class="flex gap-3 items-center mb-3"><div class="avatar avatar-lg">${esc(initials(user.nama))}</div><div><h2 style="font-size:20px">${esc(user.nama)}</h2><span class="muted small">NIP ${esc(user.nip || user.username)}</span></div></div>
<dl class="kv"><dt>Jabatan</dt><dd>${esc(user.jabatan || 'Guru')}</dd><dt>Wali kelas</dt><dd>${walis.length ? walis.map((w) => badge(w, 'info')).join(' ') : '–'}</dd><dt>Mengajar</dt><dd class="flex gap-1 wrap">${pairs.map((p) => badge(`${ref.kelas[p.kelasId]?.nama} · ${ref.mapelNama(p.mapelId)}`)).join('') || '–'}</dd></dl></div>
<div class="card"><div class="card-head"><h3>Kontak</h3></div><form id="f"><div class="field"><label for="hp">No. HP / WhatsApp</label><input class="input" id="hp" value="${esc(user.hp || '')}" inputmode="tel"></div><button class="btn btn-primary" type="submit">${icon('save')}Simpan</button></form></div></div>`;
document.getElementById('f').onsubmit = async (e) => { e.preventDefault(); const b = e.target.querySelector('button'); setBusy(b, true, 'Menyimpan…'); try { user = await updateSelf({ hp: e.target.hp.value.trim() }); toast('Profil diperbarui.', 'ok'); } catch { toast('Gagal menyimpan.', 'err'); } setBusy(b, false); };
