/* ui.js — toast, modal, konfirmasi, komponen kecil */
import { icon } from './icons.js';
import { esc } from './utils.js';

let toastBox;
export function toast(msg, type = 'info', ms = 3600) {
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = type === 'ok' ? 'check-circle' : type === 'err' ? 'x-circle' : type === 'warn' ? 'alert' : 'info';
  el.innerHTML = `${icon(ic, 20)}<div>${esc(msg)}</div>`;
  toastBox.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
}

/* modal({title, body(html|Node), size, actions:[{label,kind,onClick,keepOpen}], onMount}) */
export function modal({ title = '', body = '', size = '', actions = [], onMount, onClose, dismiss = true } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Tutup">${icon('x')}</button></div>
    <div class="modal-body"></div>
    ${actions.length ? '<div class="modal-foot"></div>' : ''}
  </div>`;
  const bodyEl = back.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
  const api = {
    el: back, body: bodyEl,
    close() { document.removeEventListener('keydown', onKey); back.remove(); document.body.style.overflow = ''; onClose && onClose(); },
    setBusy(btn, on) { btn.classList.toggle('is-loading', on); btn.disabled = on; }
  };
  const foot = back.querySelector('.modal-foot');
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.className = `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}`;
    b.innerHTML = (a.icon ? icon(a.icon) : '') + esc(a.label);
    b.onclick = async () => {
      if (!a.onClick) return api.close();
      api.setBusy(b, true);
      try { const r = await a.onClick(api, b); if (r !== false && !a.keepOpen) api.close(); }
      catch (e) { toast(e.message || 'Terjadi kesalahan', 'err'); }
      finally { api.setBusy(b, false); }
    };
    foot.appendChild(b);
  });
  const onKey = (e) => { if (e.key === 'Escape' && dismiss) api.close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', (e) => { if (e.target === back && dismiss) api.close(); });
  back.querySelector('[data-x]').onclick = () => api.close();
  document.body.appendChild(back);
  document.body.style.overflow = 'hidden';
  onMount && onMount(api);
  return api;
}

export function confirmBox(message, { title = 'Konfirmasi', ok = 'Ya, lanjutkan', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title, size: 'sm', body: `<p>${esc(message)}</p>`,
      actions: [
        { label: 'Batal', onClick: () => { done = true; resolve(false); } },
        { label: ok, kind: danger ? 'danger' : 'primary', onClick: () => { done = true; resolve(true); } }
      ],
      onClose: () => { if (!done) resolve(false); }
    });
    return m;
  });
}

export const empty = (ic, title, text = '', action = '') => `<div class="empty"><div class="ico">${icon(ic)}</div><h4>${esc(title)}</h4><p class="small">${esc(text)}</p>${action}</div>`;
export const skeleton = (n = 3, h = 74) => Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:12px"></div>`).join('');
export const badge = (text, kind = '') => `<span class="badge ${kind ? 'b-' + kind : ''}">${esc(text)}</span>`;

export const STATUS_ABSEN = {
  hadir: { label: 'Hadir', kind: 'ok' },
  terlambat: { label: 'Terlambat', kind: 'warn' },
  sakit: { label: 'Sakit', kind: 'info' },
  izin: { label: 'Izin', kind: 'vio' },
  alfa: { label: 'Alfa', kind: 'err' }
};
export const statusBadge = (s) => { const x = STATUS_ABSEN[s]; return x ? badge(x.label, x.kind) : badge('Belum absen'); };

export function setBusy(btn, on, text) {
  if (!btn) return;
  btn.disabled = on; btn.classList.toggle('is-loading', on);
  if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span>${text ? esc(text) : ''}`; }
  else if (btn.dataset.html) { btn.innerHTML = btn.dataset.html; delete btn.dataset.html; }
}

/* Validasi formulir sederhana: kembalikan true bila semua [required] terisi */
export function validate(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach((el) => {
    const bad = !String(el.value || '').trim() || (el.type === 'checkbox' && !el.checked);
    el.classList.toggle('invalid', bad);
    if (bad && ok) { el.focus(); }
    if (bad) ok = false;
  });
  return ok;
}

export function tabs(root, defs, onChange, initial) {
  root.innerHTML = defs.map((d) => `<button class="tab" data-k="${d.key}">${esc(d.label)}</button>`).join('');
  const set = (k) => { root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.k === k)); onChange(k); };
  root.onclick = (e) => { const b = e.target.closest('.tab'); if (b) set(b.dataset.k); };
  set(initial || defs[0].key);
  return set;
}

export const eyeToggle = (root = document) => root.querySelectorAll('.toggle-eye').forEach((b) => {
  b.onclick = () => { const i = b.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eye-off' : 'eye', 18); };
});
