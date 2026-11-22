import { db } from '../core/db.js';
import { mountPublic, pageHero, reveal } from '../layout/public.js';
import { icon, hasIcon } from '../core/icons.js';
import { esc, arr } from '../core/utils.js';

await mountPublic('profil');
const p = (await db.get('profil')) || {};
const s = (await db.get('pengaturan')) || {};
const ak = p.akreditasi || {};
const lv = [[], [], []]; arr(p.struktur).forEach((x) => lv[x.level || 0].push(x));
const box = (x, top) => `<div class="org-box ${top ? 'top' : ''}"><b>${esc(x.jabatan)}</b><small>${esc(x.nama)}</small></div>`;
document.getElementById('app').innerHTML = pageHero('Profil Sekolah', 'Mengenal sejarah, visi dan misi, struktur organisasi, fasilitas, serta akreditasi ' + (s.nama || 'sekolah') + '.', 'Profil Sekolah') + `
<section class="sec"><div class="wrap-w profile-layout">
<nav class="side-nav" id="sideNav">${[['sejarah', 'Sejarah', 'clock'], ['visimisi', 'Visi & Misi', 'target'], ['struktur', 'Struktur Organisasi', 'users'], ['fasilitas', 'Fasilitas', 'building'], ['akreditasi', 'Akreditasi', 'award']].map(([k, t, i]) => `<a href="#${k}">${icon(i, 18)}${t}</a>`).join('')}</nav>
<div>
<div class="psec reveal" id="sejarah"><h2>Sejarah Singkat</h2><p>${esc(p.pengantar)}</p><ul class="timeline mt-3">${arr(p.sejarah).map((h) => `<li class="done"><b style="font-family:var(--f-head)">${esc(h.tahun)} · ${esc(h.judul)}</b><p class="small muted">${esc(h.teks)}</p></li>`).join('')}</ul></div>
<div class="psec reveal" id="visimisi"><h2>Visi & Misi</h2><div class="vm"><div class="vision"><h3>Visi</h3><p>${esc(p.visi)}</p></div><div class="mission"><h3 class="mb-2" style="font-size:18px">Misi</h3><ol>${arr(p.misi).map((m) => `<li>${esc(m)}</li>`).join('')}</ol></div></div></div>
<div class="psec reveal" id="struktur"><h2>Struktur Organisasi</h2><div class="org">${lv[0].map((x) => `<div class="org-lvl">${box(x, true)}</div>`).join('')}<div class="org-line"></div><div class="org-lvl">${lv[1].map((x) => box(x)).join('')}</div><div class="org-line"></div><div class="org-lvl">${lv[2].map((x) => box(x)).join('')}</div></div></div>
<div class="psec reveal" id="fasilitas"><h2>Fasilitas & Sarana Prasarana</h2><div class="fac-grid">${arr(p.fasilitas).map((f) => `<div class="fac"><div class="ico">${icon(hasIcon(f.ikon) ? f.ikon : 'building', 22)}</div><div><b>${esc(f.nama)}</b><span>${esc(f.teks)}</span></div></div>`).join('')}</div></div>
<div class="psec reveal" id="akreditasi"><h2>Akreditasi</h2><div class="akred"><div class="seal"><div><b>${esc(ak.peringkat)}</b><span>${esc(ak.keterangan)}</span></div></div><dl class="kv"><dt>Lembaga</dt><dd>${esc(ak.lembaga)}</dd><dt>Skor</dt><dd>${esc(ak.skor)}</dd><dt>Nomor SK</dt><dd>${esc(ak.nomor)}</dd><dt>Masa berlaku</dt><dd>${esc(ak.berlaku)}</dd><dt>NPSN</dt><dd>${esc(s.npsn)}</dd></dl></div></div>
</div></div></section>`;
reveal();
const links = [...document.querySelectorAll('#sideNav a')];
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.hash === '#' + e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('.psec').forEach((el) => io.observe(el));
