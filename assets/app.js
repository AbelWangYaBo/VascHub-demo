import * as dashboard from './views/dashboard.js';
import * as products from './views/products.js';
import * as pathways from './views/pathways.js';
import * as cases from './views/cases.js';
import * as centers from './views/centers.js';
import * as training from './views/training.js';
import * as trace from './views/trace.js';
import * as data from './views/data.js';
import { openAssistant } from './views/assistant.js';
import { alerts, resetAll, listIdentities, currentIdentity, setIdentity } from './store.js';
import { ICONS, closeDrawer, closeModal, toast } from './ui.js';

const ROUTES = [
  { key: 'dashboard', path: '#/dashboard', label: '总览驾驶舱', icon: 'dash', group: '概览', view: dashboard },
  { key: 'products', path: '#/products', label: '产品与解决方案', icon: 'product', group: '平台能力', view: products },
  { key: 'pathways', path: '#/pathways', label: '术式路径', icon: 'path', group: '平台能力', view: pathways },
  { key: 'cases', path: '#/cases', label: '病例中心', icon: 'case', group: '平台能力', view: cases },
  { key: 'centers', path: '#/centers', label: '中心与术者', icon: 'center', group: '运营', view: centers },
  { key: 'training', path: '#/training', label: '培训与认证', icon: 'train', group: '运营', view: training },
  { key: 'trace', path: '#/trace', label: '器械追溯', icon: 'trace', group: '运营', view: trace },
  { key: 'data', path: '#/data', label: '数据与合规', icon: 'data', group: '运营', view: data }
];

const TITLES = {
  dashboard: ['总览驾驶舱', '四大治疗领域 · 病例 · 随访 · 器械 · 风险'],
  products: ['产品与解决方案', '按解剖部位与术式组织产品矩阵，可组合为一体化方案'],
  pathways: ['术式路径', '标准步骤、器械清单、质控指标与并发症处置'],
  cases: ['病例中心', '结构化病例、随访节点与结局追踪'],
  centers: ['中心与术者', '覆盖、认证分层与能力建设'],
  training: ['培训与认证', '课程、学习进度与术者成长路径'],
  trace: ['器械追溯', 'UDI、批次、效期与病例绑定'],
  data: ['数据与合规', '数据质量、导出、字典与合规边界']
};

function parseHash() {
  const raw = location.hash || '#/dashboard';
  const [pathPart, queryPart] = raw.split('?');
  const segs = pathPart.replace(/^#\/?/, '').split('/').filter(Boolean);
  const query = {};
  (queryPart || '').split('&').filter(Boolean).forEach(kv => {
    const [k, v] = kv.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return { key: segs[0] || 'dashboard', id: segs[1] || null, query };
}

function buildNav() {
  const nav = document.getElementById('nav');
  const high = alerts().filter(a => a.severity === 'high').length;
  const current = parseHash().key;
  const groups = ['概览', '平台能力', '运营'];
  nav.innerHTML = groups.map(g => `
    <div class="nav-group">${g}</div>
    ${ROUTES.filter(r => r.group === g).map(r => `
      <a href="${r.path}" data-nav="${r.key}" class="${r.key === current ? 'active' : ''}">${ICONS[r.icon]}<span>${r.label}</span>
        ${r.key === 'cases' && high ? `<span class="nav-badge">${high}</span>` : ''}
      </a>`).join('')}
  `).join('');
}

function renderRoute() {
  closeDrawer();
  closeModal();
  const { key, id, query } = parseHash();
  const route = ROUTES.find(r => r.key === key) || ROUTES[0];
  const view = document.getElementById('view');
  const [title, sub] = TITLES[route.key] || TITLES.dashboard;

  document.getElementById('page-title').textContent = title;
  document.getElementById('page-sub').textContent = sub;

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === route.key);
  });

  let res;
  if (route.key === 'pathways' && id) res = pathways.renderDetail(id);
  else if (route.key === 'cases') res = cases.render({ id, query });
  else res = route.view.render();

  view.innerHTML = res.html;
  if (res.mount) res.mount(view);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function buildIdentitySelect() {
  const sel = document.getElementById('identity-select');
  const cur = currentIdentity();
  sel.innerHTML = listIdentities().map(i =>
    `<option value="${i.id}" ${i.id === cur.id ? 'selected' : ''}>${i.name} · ${i.role}</option>`).join('');
  const side = document.getElementById('side-identity');
  if (side) side.textContent = `当前身份：${cur.name} · ${cur.org}`;
}

function init() {
  buildNav();
  buildIdentitySelect();
  document.getElementById('identity-select').addEventListener('change', e => {
    const me = listIdentities().find(i => i.id === e.target.value);
    setIdentity(e.target.value);
    buildIdentitySelect();
    renderRoute();
    toast(`已切换演示身份：${me.name} · ${me.role}`);
  });
  document.getElementById('btn-assistant').addEventListener('click', openAssistant);
  document.getElementById('btn-new-case').addEventListener('click', () => {
    // hash 相同（上次弹窗取消后未离开 ?new=1）不会触发 hashchange，手动重渲染
    if (location.hash === '#/cases?new=1') renderRoute();
    else location.hash = '#/cases?new=1';
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('清空本地演示数据并恢复初始演示病例？')) return;
    resetAll();
    location.hash = '#/dashboard';
    location.reload();
  });

  const search = document.getElementById('global-search');
  search.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = search.value.trim();
    if (!q) return;
    cases.setSearch(q);
    if (parseHash().key === 'cases') renderRoute();
    else location.hash = '#/cases';
  });

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
  setInterval(buildNav, 8000);
}

document.addEventListener('DOMContentLoaded', init);
