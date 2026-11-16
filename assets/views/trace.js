import { getUdi, useUdi, getCases, productById, centerById, TODAY, daysBetween } from '../store.js';
import { domainChip, statusChip, chip, esc, toast, ICONS, openModal, closeModal, emptyState, sectionTitle } from '../ui.js';
import { DOMAINS } from '../data.js';

let filters = { status: 'all', q: '' };

export function render() {
  const udi = getUdi();
  const list = filterList();
  const stats = {
    inStock: udi.filter(u => u.status === '在库').length,
    used: udi.filter(u => u.status === '已使用').length,
    expiring: udi.filter(u => u.status === '临期' || daysBetween(TODAY, u.expiry) <= 90).length
  };

  const html = `
  <div class="page">
    <div class="grid g-4" style="margin-bottom:16px">
      <div class="kpi"><div class="k-label">在库器械</div><div class="k-value">${stats.inStock}<small>件</small></div><div class="k-foot">含寄售库存与中心备货</div></div>
      <div class="kpi"><div class="k-label">已使用（含病例绑定）</div><div class="k-value">${stats.used}<small>件</small></div><div class="k-foot">UDI 与病例一对一追溯</div></div>
      <div class="kpi"><div class="k-label">临期 / 90 天内到期</div><div class="k-value" style="color:#be123c">${stats.expiring}<small>件</small></div><div class="k-foot">需优先调度或更换</div></div>
      <div class="kpi"><div class="k-label">批号可追溯率</div><div class="k-value">100<small>%</small></div><div class="k-foot">入库即赋码，出库扫码绑定</div></div>
    </div>

    <div class="card">
      <div class="card-h"><h3>器械追溯台账</h3><span class="sub">UDI / 批号 / 效期 / 使用病例</span>
        <div class="right">${chip('演示数据', 'soft-amber')}</div>
      </div>
      <div class="filters">
        <span class="tiny muted">状态</span>
        ${['all', '在库', '已使用', '临期'].map(v => `<button class="filter-chip ${filters.status === v ? 'on' : ''}" data-f="status" data-v="${v}">${v === 'all' ? '全部' : v}</button>`).join('')}
        <input class="select" data-f="q" placeholder="搜索 UDI / 批号 / 产品" value="${esc(filters.q)}" style="min-width:230px">
        <span class="tiny muted" style="margin-left:auto">${list.length} / ${udi.length} 条</span>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>UDI</th><th>产品</th><th>批号</th><th>有效期</th><th>所在中心</th><th>状态</th><th>绑定病例</th><th></th></tr></thead>
          <tbody>
            ${list.length ? list.map(u => {
              const p = productById(u.productId);
              const remain = daysBetween(TODAY, u.expiry);
              return `<tr style="cursor:default">
                <td><span class="cell-main" style="font-family:var(--mono);font-size:11.5px;font-weight:500">${esc(u.udi)}</span></td>
                <td><span class="cell-main" style="font-weight:500">${esc(p?.name || u.productId)}</span>
                  <span class="cell-sub">${p ? domainChip(p.domain, true) : ''} ${esc(p?.category || '')}</span></td>
                <td class="tiny" style="font-family:var(--mono)">${esc(u.lot)}</td>
                <td><span class="tiny">${u.expiry}</span><span class="cell-sub ${remain <= 90 ? 'down' : ''}">${remain > 0 ? `剩余 ${remain} 天` : '已过期'}</span></td>
                <td class="tiny">${esc(centerById(u.centerId)?.name || '')}</td>
                <td>${statusChip(u.status)}</td>
                <td class="tiny">${u.caseId ? `<a href="#/cases/${esc(u.caseId)}" style="color:#0b6f66;font-family:var(--mono)">${esc(u.caseId)}</a>` : '<span class="muted">—</span>'}</td>
                <td>${u.status === '已使用' ? `<span class="tiny muted">已归档</span>` : `<button class="btn sm" data-use="${u.id}">使用登记</button>`}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="8">${emptyState('没有匹配的记录', '调整状态筛选或关键词')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    ${sectionTitle('追溯链路的四个节点')}
    <div class="grid g-4">
      ${[
        ['赋码入库', '注册证号、批号、效期、供应商资质在入库时一次性写入，不依赖人工登记'],
        ['术中使用', '扫码绑定患者与术式，形成"器械—病例—术者"三元关系'],
        ['结算对账', '使用记录直接生成高值耗材结算清单，与院内 SPD/HIS 对账'],
        ['不良事件', '同一批号可反查全部使用病例，支撑召回演练与安全性分析']
      ].map(([t, d]) => `<div class="card card-pad"><strong style="font-size:13px">${t}</strong><div class="muted" style="font-size:12.5px;margin-top:6px">${d}</div></div>`).join('')}
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-f]').forEach(el => {
        if (el.tagName === 'INPUT') el.addEventListener('input', e => { filters.q = e.target.value; rerender(); });
        else el.addEventListener('click', () => { filters.status = el.dataset.v; rerender(); });
      });
      root.querySelectorAll('[data-use]').forEach(el => el.addEventListener('click', () => openUse(el.dataset.use)));
      root.querySelectorAll('[data-use]').forEach(el => el.addEventListener('click', e => e.stopPropagation()));
    }
  };
}

function rerender() {
  const app = document.getElementById('view');
  const res = render();
  app.innerHTML = res.html;
  res.mount(app);
}

function filterList() {
  return getUdi().filter(u => {
    if (filters.status !== 'all' && u.status !== filters.status) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [u.udi, u.lot, productById(u.productId)?.name].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => daysBetween(TODAY, b.expiry) - daysBetween(TODAY, a.expiry));
}

function openUse(id) {
  const rec = getUdi().find(u => u.id === id);
  const p = productById(rec.productId);
  const candidates = getCases().filter(c => c.domain === p.domain);

  openModal({
    title: '器械使用登记',
    body: `
      <div class="kv" style="margin-bottom:14px">
        <span class="k">产品</span><span>${esc(p.name)}</span>
        <span class="k">UDI</span><span style="font-family:var(--mono);font-size:12px">${esc(rec.udi)}</span>
        <span class="k">批号 / 效期</span><span>${esc(rec.lot)} · ${rec.expiry}</span>
        <span class="k">所在中心</span><span>${esc(centerById(rec.centerId)?.name || '')}</span>
      </div>
      <div class="field"><label>绑定病例（同领域）</label>
        <select id="u-case">
          <option value="">请选择病例</option>
          ${candidates.map(c => `<option value="${c.id}">${c.id} · ${esc(c.patient.alias)} · ${esc(c.date)}</option>`).join('')}
        </select>
      </div>
      <div class="note" style="margin-top:12px">登记后器械状态变为「已使用」，并与病例形成唯一追溯关系；如为召回演练，可在此反查同批号其他病例。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>确认登记</button>`,
    onMount(m) {
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const caseId = m.querySelector('#u-case').value;
        if (!caseId) { toast('请选择绑定病例', 'err'); return; }
        useUdi(rec.id, caseId);
        closeModal();
        toast('使用登记完成，已绑定 ' + caseId);
        rerender();
      });
    }
  });
}
