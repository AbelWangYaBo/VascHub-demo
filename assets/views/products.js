import { PRODUCTS, CATEGORIES, DOMAINS, CENTERS } from '../data.js';
import { savePlan, getCases, getPathways, productById } from '../store.js';
import { domainChip, statusChip, chip, openDrawer, openModal, closeModal, closeDrawer, toast, esc, ICONS, emptyState, sectionTitle } from '../ui.js';

const BK = 'vaschub.basket.v1';
let filters = { domain: 'all', category: 'all', brand: 'all', q: '' };

function getBasket() {
  try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch { return []; }
}
function setBasket(b) { localStorage.setItem(BK, JSON.stringify(b)); renderBasketBar(); }

export function render() {
  const brands = [...new Set(PRODUCTS.map(p => p.brand))];
  const list = filterProducts();
  const basket = getBasket();

  const html = `
  <div class="page">
    <div class="card" style="margin-bottom:16px">
      <div class="filters">
        <span class="tiny muted" style="margin-right:2px">领域</span>
        <button class="filter-chip ${filters.domain === 'all' ? 'on' : ''}" data-f="domain" data-v="all">全部</button>
        ${DOMAINS.map(d => `<button class="filter-chip ${filters.domain === d.id ? 'on' : ''}" data-f="domain" data-v="${d.id}" style="${filters.domain === d.id ? `background:${d.color};border-color:${d.color}` : ''}">${d.short}</button>`).join('')}
        <span style="width:10px"></span>
        <span class="tiny muted">品牌</span>
        <select class="select" data-f="brand">
          <option value="all">全部品牌</option>
          ${brands.map(b => `<option value="${esc(b)}" ${filters.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}
        </select>
        <span class="tiny muted">类别</span>
        <select class="select" data-f="category">
          <option value="all">全部类别</option>
          ${CATEGORIES.map(c => `<option value="${esc(c)}" ${filters.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <input class="select" data-f="q" placeholder="搜索产品 / 适应证 / 解剖部位" value="${esc(filters.q)}" style="min-width:220px">
        <span class="tiny muted" style="margin-left:auto">${list.length} / ${PRODUCTS.length} 款产品</span>
      </div>
      <div id="basket-bar"></div>
      ${list.length ? `<div class="prod-grid">${list.map(productCard).join('')}</div>` : emptyState('没有匹配的产品', '试试调整领域、品牌或关键词')}
    </div>

    ${sectionTitle('产品矩阵的四个判断维度')}
    <div class="grid g-4">
      ${[
        ['解剖覆盖', '从颅内 0.014 系统到 46 mm 主动脉主体，覆盖同一患者的多个血管床'],
        ['术式配套', '每款产品绑定术式路径与器械准备清单，避免"有产品无方案"'],
        ['证据与准入', '注册证、创新通道、集采状态、适应证在一处呈现，支撑准入决策'],
        ['供应与追溯', 'UDI、批次、效期、寄售库存与病例使用记录打通']
      ].map(([t, d]) => `<div class="card card-pad"><strong style="font-size:13px">${t}</strong><div class="muted" style="font-size:12.5px;margin-top:6px">${d}</div></div>`).join('')}
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-f]').forEach(el => {
        const evt = el.tagName === 'SELECT' || el.tagName === 'INPUT' ? 'change' : 'click';
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', e => { filters.q = e.target.value; rerender(); });
        } else if (el.tagName === 'SELECT') {
          el.addEventListener('change', e => { filters[el.dataset.f] = e.target.value; rerender(); });
        } else {
          el.addEventListener('click', () => { filters[el.dataset.f] = el.dataset.v; rerender(); });
        }
      });
      root.querySelectorAll('[data-prod]').forEach(el => el.addEventListener('click', e => {
        if (e.target.closest('[data-add]')) return;
        openProduct(el.dataset.prod);
      }));
      root.querySelectorAll('[data-add]').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation();
        addToBasket(el.dataset.add);
      }));
      renderBasketBar();
    }
  };
}

function rerender() {
  const app = document.getElementById('view');
  const res = render();
  app.innerHTML = res.html;
  res.mount(app);
}

function filterProducts() {
  return PRODUCTS.filter(p => {
    if (filters.domain !== 'all' && p.domain !== filters.domain) return false;
    if (filters.brand !== 'all' && p.brand !== filters.brand) return false;
    if (filters.category !== 'all' && p.category !== filters.category) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [p.name, p.indication, p.anatomy, p.tags.join(' '), p.feature].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function productCard(p) {
  return `<div class="prod" data-prod="${p.id}">
    ${p.innovation ? '<span class="ribbon">创新通道</span>' : ''}
    <div class="p-top">${domainChip(p.domain, true)}${p.status !== '已上市' ? chip(p.status, 'soft-amber') : ''}</div>
    <div class="p-name">${esc(p.name)}</div>
    <div class="p-feat">${esc(p.feature)}</div>
    <div class="p-ft">${p.tags.slice(0, 3).map(t => chip(t)).join('')}</div>
    <div class="p-meta"><span>${esc(p.brand)} · ${esc(p.category)}</span><span>${esc(p.vbp)}</span></div>
  </div>`;
}

function openProduct(id) {
  const p = productById(id);
  if (!p) return;
  const relatedPaths = getPathways().filter(pw => pw.devices.includes(id));
  const caseCount = getCases().filter(c => c.devices.includes(id)).length;
  const basket = getBasket();
  const inBasket = basket.includes(id);

  const body = `
    <div class="row wrap" style="gap:8px;margin-bottom:14px">
      ${domainChip(p.domain)}${chip(p.category)}${p.innovation ? chip('NMPA 创新医疗器械通道', 'soft-rose') : ''}${statusChip(p.status)}
    </div>
    <div class="kv">
      <span class="k">品牌</span><span>${esc(p.brand)}</span>
      <span class="k">解剖部位</span><span>${esc(p.anatomy)}</span>
      <span class="k">适应证</span><span>${esc(p.indication)}</span>
      <span class="k">关键规格</span><span>${esc(p.spec)}</span>
      <span class="k">注册状态</span><span>${esc(p.cert)}</span>
      <span class="k">集采状态</span><span>${esc(p.vbp)}</span>
      <span class="k">平台内使用</span><span>${caseCount} 例病例引用</span>
    </div>
    <div class="divider"></div>
    <h4 style="font-size:13px;margin-bottom:6px">临床价值</h4>
    <p class="muted" style="font-size:12.5px;margin:0 0 14px">${esc(p.feature)}</p>
    <h4 style="font-size:13px;margin-bottom:8px">适配术式</h4>
    ${relatedPaths.length ? relatedPaths.map(pw => `<div class="list-item" style="padding-left:0;padding-right:0" data-path="${pw.id}">
      <div class="li-main"><div class="li-title">${esc(pw.name)}</div><div class="li-sub">${esc(pw.indication)}</div></div>
      <div class="li-side">${ICONS.chev}</div></div>`).join('') : '<div class="tiny muted">暂未绑定术式路径</div>'}
    <div class="divider"></div>
    <div class="note">把产品加入方案篮，可按解剖部位与器械角色组合成一份可复用的一体化手术方案，方案会保存到本地并可导出。</div>`;

  openDrawer({
    title: esc(p.name),
    sub: `${esc(p.brand)} · ${esc(p.anatomy)}`,
    body,
    footer: `<button class="btn" data-jump>打开术式库</button>
      <button class="btn primary" data-pick>${inBasket ? '已在方案篮 · 查看方案' : '加入方案篮'}</button>`,
    wide: false
  });

  const drawer = document.querySelector('.drawer');
  drawer.querySelectorAll('[data-path]').forEach(el => el.addEventListener('click', () => {
    closeDrawer(); location.hash = '#/pathways/' + el.dataset.path;
  }));
  drawer.querySelector('[data-jump]').addEventListener('click', () => { closeDrawer(); location.hash = '#/pathways'; });
  drawer.querySelector('[data-pick]').addEventListener('click', () => {
    if (!getBasket().includes(id)) { addToBasket(id); closeDrawer(); }
    else { closeDrawer(); openBasket(); }
  });
}

function addToBasket(id) {
  const b = getBasket();
  if (b.includes(id)) { toast('该产品已在方案篮中'); return; }
  b.push(id);
  setBasket(b);
  toast('已加入方案篮：' + (productById(id)?.name || ''));
}

function renderBasketBar() {
  const bar = document.getElementById('basket-bar');
  if (!bar) return;
  const b = getBasket();
  if (!b.length) { bar.innerHTML = `<div class="filters" style="border-bottom:1px solid var(--line-2);border-top:none"><span class="tiny muted">方案篮为空：在产品卡片详情中加入产品，可组合成一体化方案</span></div>`; return; }
  bar.innerHTML = `<div class="filters" style="background:#f7fbfb">
      <strong style="font-size:12.5px">方案篮 ${b.length}</strong>
      ${b.map(id => `<span class="chip soft-teal">${esc(productById(id)?.name.slice(0, 14) || id)}
        <button data-rm="${id}" style="border:none;background:none;cursor:pointer;color:#0b6f66;font-size:13px;padding:0 0 0 3px">×</button></span>`).join('')}
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn sm" data-clear>清空</button>
        <button class="btn sm primary" data-save>保存为方案</button>
      </div>
    </div>`;
  bar.querySelectorAll('[data-rm]').forEach(el => el.addEventListener('click', () => {
    setBasket(getBasket().filter(x => x !== el.dataset.rm));
  }));
  bar.querySelector('[data-clear]').addEventListener('click', () => { setBasket([]); toast('方案篮已清空'); });
  bar.querySelector('[data-save]').addEventListener('click', openBasket);
}

function openBasket() {
  const b = getBasket();
  if (!b.length) { toast('方案篮为空', 'err'); return; }
  const groups = DOMAINS.map(d => ({ d, items: b.filter(id => productById(id)?.domain === d.id) })).filter(g => g.items.length);

  openModal({
    title: '保存一体化方案',
    body: `
      <div class="field" style="margin-bottom:12px"><label>方案名称</label>
        <input id="plan-name" placeholder="例如：股腘动脉长段钙化 · 减容 + DCB 组合" value="全血管一体化方案 · ${new Date().toISOString().slice(0, 10)}">
      </div>
      <div class="field" style="margin-bottom:14px"><label>适用场景与备注</label>
        <textarea id="plan-note" placeholder="例如：Rutherford 3 级，病变 24 cm，中重度钙化；先减容再 DCB，残余狭窄 >30% 时补救支架"></textarea>
      </div>
      <h4 style="font-size:12.5px;margin-bottom:8px">方案组成 · ${b.length} 件器械</h4>
      ${groups.map(g => `<div style="margin-bottom:10px">
        <div class="row" style="gap:6px;margin-bottom:5px">${domainChip(g.d.id, true)}</div>
        ${g.items.map(id => { const p = productById(id); return `<div class="row" style="gap:8px;padding:5px 0;border-bottom:1px dashed var(--line-2)">
          <span class="tiny" style="flex:1">${esc(p?.name)}</span><span class="tiny muted">${esc(p?.category)}</span></div>`; }).join('')}
      </div>`).join('')}
      <div class="note" style="margin-top:6px">保存后会进入「已保存方案」，可在数据治理页导出。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>保存方案</button>`,
    onMount(m) {
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const name = m.querySelector('#plan-name').value.trim();
        const note = m.querySelector('#plan-note').value.trim();
        if (!name) { toast('请填写方案名称', 'err'); return; }
        const saved = savePlan({ name, note, items: b, domains: [...new Set(b.map(id => productById(id)?.domain))] });
        setBasket([]);
        closeModal();
        toast('方案已保存：' + saved.name);
      });
    }
  });
}
