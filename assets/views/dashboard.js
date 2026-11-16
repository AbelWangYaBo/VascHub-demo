import { PRODUCTS, QUARTERS, REGIONS, CENTERS, DOMAINS } from '../data.js';
import { overview, alerts, getCases, TODAY, daysBetween
  , getPathways } from '../store.js';
import { donut, lineChart, barRows, sparkline } from '../charts.js';
import { domainChip, statusChip, ICONS, esc, sectionTitle, chip } from '../ui.js';

export function render() {
  const o = overview();
  const al = alerts();
  const cases = getCases();
  const recent = [...cases].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  const domainItems = DOMAINS.map(d => ({
    label: d.name, value: o.byDomain[d.id] || 0, color: d.color
  })).filter(i => i.value > 0);

  const prodCount = DOMAINS.map(d => ({ ...d, products: PRODUCTS.filter(p => p.domain === d.id).length, paths: getPathways().filter(p => p.domain === d.id).length }));

  const html = `
  <div class="page">
    <div class="grid g-4">
      ${kpi('结构化病例', o.total, '例', `近 7 天新增 ${cases.filter(c => daysBetween(c.date, TODAY) <= 7).length} 例`, QUARTERS.map(q => q.cases))}
      ${kpi('随访完成率', o.followRate, '%', `已随访 ${o.fuDone}/${o.fuTotal} 节点`, QUARTERS.map(q => q.follow), '#2563eb')}
      ${kpi('活跃中心 · 术者', `${o.activeCenters} · ${o.activePhysicians}`, '', '近 90 天有病例记录', QUARTERS.map(q => q.cases / 300), '#a16207')}
      ${kpi('待处理风险', al.filter(a => a.severity === 'high').length, '项', `共 ${al.length} 条提醒`, null, '#be123c', true)}
    </div>

    ${sectionTitle('平台覆盖与运行态势')}
    <div class="grid g-2-1">
      <div class="card">
        <div class="card-h"><h3>病例结构与领域覆盖</h3><span class="sub">四大治疗领域 · 演示数据</span>
          <div class="right">${DOMAINS.map(d => `<span class="chip" style="background:${d.color}12;color:${d.color}">${d.short}</span>`).join('')}</div>
        </div>
        <div class="card-pad">
          <div class="row" style="gap:26px;align-items:center;flex-wrap:wrap">
            ${donut(domainItems, { centerLabel: o.total, centerSub: '结构化病例' })}
            <div class="legend" style="flex:1;min-width:200px">
              ${domainItems.map(i => `<div class="lg"><span class="dot" style="background:${i.color}"></span>
                ${i.label}<b>${i.value} 例 · ${Math.round(i.value / (o.total || 1) * 100)}%</b></div>`).join('')}
            </div>
          </div>
          <div class="divider"></div>
          <div class="grid g-4" style="gap:10px">
            ${prodCount.map(d => `<div style="border:1px solid var(--line-2);border-radius:10px;padding:10px 12px">
              <div class="row" style="gap:6px"><span class="dot" style="background:${d.color}"></span><strong style="font-size:12.5px">${d.name}</strong></div>
              <div class="tiny muted" style="margin-top:4px">${d.products} 款产品 · ${d.paths} 条术式</div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>季度病例量与随访率</h3><span class="sub">7 个季度</span></div>
        <div class="card-pad">
          ${lineChart(QUARTERS.map(q => q.cases), { labels: QUARTERS.map(q => q.q), width: 520, height: 168 })}
          <div class="row" style="gap:16px;margin-top:6px">
            <span class="tiny muted">病例量（条）</span>
            <span class="tiny" style="color:#2563eb">随访率：${QUARTERS[QUARTERS.length - 1].follow}%</span>
          </div>
          <div class="divider"></div>
          ${barRows(QUARTERS.slice(-4).map(q => ({ label: q.q, value: q.follow, color: '#2563eb' })), { suffix: '%' })}
        </div>
      </div>
    </div>

    <div class="grid g-2" style="margin-top:16px">
      <div class="card">
        <div class="card-h"><h3>术式结构</h3><span class="sub">按病例数排序</span>
          <div class="right"><a class="btn sm ghost" href="#/pathways" style="border:none">术式库 ${ICONS.chev}</a></div>
        </div>
        <div class="card-pad">
          ${barRows(topPathways(cases), { color: '#0d9488' })}
          <div class="hint" style="margin-top:14px">只统计已归档病例；尚未开展的术式不在此列，可到「中心与术者」按术者认证分层制定开展计划。</div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>区域覆盖</h3><span class="sub">覆盖医院数 / RWE 中心占比</span></div>
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>区域</th><th>覆盖医院</th><th>RWE 中心</th><th>同比</th></tr></thead>
            <tbody>${REGIONS.map(r => `<tr style="cursor:default">
              <td><span class="cell-main">${r.name}</span></td>
              <td>${r.hospitals}</td>
              <td>${r.rwe}%</td>
              <td class="${r.growth >= 20 ? 'up' : 'muted'}">${r.growth >= 20 ? '+' : ''}${r.growth}%</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    ${sectionTitle('需要关注')}
    <div class="grid g-2">
      <div class="card">
        <div class="card-h"><h3>风险与待办</h3><span class="sub">随访逾期 · 效期 · 数据归档</span>
          <div class="right">${chip(al.filter(a => a.severity === 'high').length + ' 高风险', 'soft-rose')}</div>
        </div>
        <div class="list">
          ${al.length ? al.slice(0, 6).map(a => `
            <div class="list-item" ${a.caseId ? `data-case="${esc(a.caseId)}"` : ''} ${a.udiId ? `data-udi="${esc(a.udiId)}"` : ''} ${a.link ? `data-link="${esc(a.link)}"` : ''}>
              <span class="dot" style="background:${a.severity === 'high' ? '#be123c' : a.severity === 'mid' ? '#b45309' : '#6a8189'}"></span>
              <div class="li-main">
                <div class="li-title">${esc(a.title)}</div>
                <div class="li-sub">${esc(a.meta)}</div>
              </div>
              <div class="li-side">${chip(a.type === 'follow' || a.type === 'follow-due' ? '随访' : (a.type === 'udi' || a.type === 'udi-reg') ? '追溯' : '运营', 'soft-amber')}</div>
            </div>`).join('') : `<div class="empty"><strong>暂无风险项</strong>所有随访节点与器械效期正常</div>`}
          <div class="hint" style="border-top:1px solid var(--line);border-left:none;padding:12px 18px;margin:0;border-radius:0">
            共 ${al.length} 条待办，按风险等级排序。随访逾期项点开病例登记，器械项进入追溯台账处理。
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>最近病例</h3><span class="sub">按手术日期</span>
          <div class="right"><a class="btn sm ghost" href="#/cases" style="border:none">全部病例 ${ICONS.chev}</a></div>
        </div>
        <div class="list">
          ${recent.map(c => {
            const p = getPathways().find(x => x.id === c.pathwayId);
            const center = CENTERS.find(x => x.id === c.centerId);
            return `<div class="list-item" data-case="${esc(c.id)}">
              <div class="li-main">
                <div class="li-title">${esc(c.patient.alias)} · ${c.patient.age} 岁 ${esc(c.patient.sex)} ${domainChip(c.domain, true)}</div>
                <div class="li-sub">${esc(p?.name || '')} · ${esc(center?.name || '')} · ${c.date}</div>
              </div>
              <div class="li-side">${statusChip(c.status)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="note" style="margin-top:20px">
      系统内医院、术者、病例与器械批次均为演示数据，用于验证平台流程与数据模型，不代表真实机构或真实临床结果。
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-case]').forEach(el => {
        el.addEventListener('click', () => { location.hash = '#/cases/' + el.dataset.case; });
      });
      root.querySelectorAll('[data-udi]').forEach(el => {
        el.addEventListener('click', () => { location.hash = '#/trace'; });
      });
      root.querySelectorAll('[data-link]').forEach(el => {
        el.addEventListener('click', () => { location.hash = el.dataset.link; });
      });
    }
  };
}

function kpi(label, value, unit, foot, series, color = '#0d9488', alert = false) {
  return `<div class="kpi">
    <div class="k-label">${alert ? '<span class="dot" style="background:#be123c"></span>' : ''}${label}</div>
    <div class="k-value" style="color:${alert && value ? '#be123c' : 'inherit'}">${value}${unit ? `<small>${unit}</small>` : ''}</div>
    <div class="k-foot">${foot}</div>
    ${series ? `<div class="k-spark">${sparkline(series, { color })}</div>` : ''}
  </div>`;
}

function topPathways(cases) {
  const map = new Map();
  cases.forEach(c => map.set(c.pathwayId, (map.get(c.pathwayId) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, n]) => ({ label: (getPathways().find(p => p.id === id)?.name || id).replace(/（.*?）/g, ''), value: n }));
}
