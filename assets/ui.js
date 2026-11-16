// 共享 UI 组件与浮层控制
import { DOMAINS } from './data.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const ICONS = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>',
  product: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>',
  path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="5" cy="5" r="2.4"/><circle cx="19" cy="19" r="2.4"/><path d="M7.4 5h5.2a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7.6"/></svg>',
  case: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7.5A1.8 1.8 0 0 1 5.8 5.7h3.2l1.4 2H18a1.8 1.8 0 0 1 1.8 1.8v6.7a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 16.2z"/><path d="M12 11.4v4.2M9.9 13.5h4.2"/></svg>',
  center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3.5 20.5h17"/><path d="M6 20.5V8.5l6-4.5 6 4.5v12"/><path d="M12 9.5v4M10 11.5h4"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3.5 8.5 12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M7 11v4.6c0 1.7 2.3 3.4 5 3.4s5-1.7 5-3.4V11"/><path d="M20.5 9v5"/></svg>',
  trace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="14.5" width="6" height="6" rx="1"/><path d="M9.5 6.5h5a3 3 0 0 1 3 3v5"/><path d="M12 3.5v3M9 4.9h6"/></svg>',
  data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3.5 13.9 9l5.6 1.6-5.6 1.6L12 20l-1.9-7.8L4.5 10.6 10.1 9z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m9 6 6 6-6 6"/></svg>'
};

export function domainMeta(id) { return DOMAINS.find(d => d.id === id) || { name: id, color: '#6a8189', short: id }; }

export function domainChip(id, small = false) {
  const d = domainMeta(id);
  return `<span class="chip domain ${small ? 'tiny' : ''}" style="background:${d.color}14;color:${d.color};border-color:${d.color}22">
    <span class="dot" style="background:${d.color}"></span>${d.name}</span>`;
}

export function statusChip(status) {
  const map = {
    '已随访': 'soft-teal', '随访中': 'soft-blue', '术后早期': 'soft-amber',
    '待随访': 'soft-amber', '逾期未随访': 'soft-rose', '已完成': 'soft-teal',
    '在库': 'soft-blue', '已使用': 'soft-teal', '临期': 'soft-rose',
    '已上市': 'soft-teal', '注册中': 'soft-amber', '临床/在研': 'soft-blue', '海外上市': 'soft-blue',
    '集采中选': 'soft-teal', '未集采': 'soft-amber'
  };
  return `<span class="chip ${map[status] || ''}">${esc(status)}</span>`;
}

export function chip(text, tone = '') { return `<span class="chip ${tone}">${esc(text)}</span>`; }

export function sectionTitle(t) { return `<h2 class="section">${esc(t)}</h2>`; }

export function emptyState(title, desc = '') {
  return `<div class="empty"><strong>${esc(title)}</strong>${esc(desc)}</div>`;
}

// ---------- drawer ----------
let scrim, drawer, modal, toastWrap;

function ensureOverlays() {
  if (scrim) return;
  scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.addEventListener('click', () => { closeDrawer(); closeModal(); });
  document.body.appendChild(scrim);

  drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  document.body.appendChild(drawer);

  modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  document.body.appendChild(modal);

  toastWrap = document.createElement('div');
  toastWrap.className = 'toast-wrap';
  document.body.appendChild(toastWrap);

  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });
}

export function openDrawer({ title, sub = '', body, footer = '', wide = false }) {
  ensureOverlays();
  closeModal({ keepScrim: true });
  drawer.classList.toggle('wide', wide);
  drawer.innerHTML = `
    <div class="drawer-h">
      <div class="dh-main"><div class="dh-title">${title}</div>${sub ? `<div class="dh-sub">${sub}</div>` : ''}</div>
      <button class="icon-btn" aria-label="关闭" data-close>${ICONS.close}</button>
    </div>
    <div class="drawer-b"></div>
    ${footer ? `<div class="drawer-f">${footer}</div>` : ''}`;
  drawer.querySelector('.drawer-b').innerHTML = body;
  drawer.querySelector('[data-close]').addEventListener('click', closeDrawer);
  scrim.classList.add('on');
  requestAnimationFrame(() => drawer.classList.add('on'));
  return drawer;
}

export function closeDrawer() {
  if (!drawer) return;
  drawer.classList.remove('on');
  if (!modal || !modal.classList.contains('on')) scrim.classList.remove('on');
}

export function openModal({ title, body, footer = '', onMount }) {
  ensureOverlays();
  modal.innerHTML = `
    <div class="modal-h"><h3>${title}</h3><button class="icon-btn" aria-label="关闭" data-close style="margin-left:auto">${ICONS.close}</button></div>
    <div class="modal-b">${body}</div>
    ${footer ? `<div class="modal-f">${footer}</div>` : ''}`;
  modal.querySelector('[data-close]').addEventListener('click', () => closeModal());
  scrim.classList.add('on');
  modal.classList.add('on');
  if (onMount) onMount(modal);
  return modal;
}

// 对象参数签名：直接 addEventListener('click', closeModal) 时 event 被传入 opts，
// opts.keepScrim 为 undefined（falsy），遮罩正常移除——彻底避免 event 误当 keepScrim 的复发
export function closeModal(opts = {}) {
  if (!modal) return;
  const keepScrim = opts.keepScrim === true;
  modal.classList.remove('on');
  if (!keepScrim && (!drawer || !drawer.classList.contains('on'))) scrim.classList.remove('on');
}

export function toast(msg, type = 'ok') {
  ensureOverlays();
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.innerHTML = `${type === 'err' ? '⚠' : '✓'} <span>${esc(msg)}</span>`;
  toastWrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = '.25s'; }, 2200);
  setTimeout(() => el.remove(), 2600);
}

export function renderInto(root, html) {
  root.innerHTML = html;
  return root;
}
