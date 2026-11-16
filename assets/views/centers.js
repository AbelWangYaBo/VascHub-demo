import { CENTERS, PHYSICIANS, DOMAINS, REGIONS } from '../data.js';
import { getCases, caseFollowStats, getPathways } from '../store.js';
import { domainChip, chip, esc, openDrawer, closeDrawer, ICONS, sectionTitle } from '../ui.js';

export function render() {
  const cases = getCases();
  const rows = CENTERS.map(c => {
    const cs = cases.filter(x => x.centerId === c.id);
    const docs = PHYSICIANS.filter(d => d.center === c.id);
    const followRate = avgFollow(cs);
    return { c, cs, docs, followRate };
  }).sort((a, b) => b.cs.length - a.cs.length);

  const totalHosp = REGIONS.reduce((s, r) => s + r.hospitals, 0);

  const html = `
  <div class="page">
    <div class="card card-pad" style="margin-bottom:16px">
      <div class="row" style="gap:34px;flex-wrap:wrap;align-items:flex-end">
        <div>
          <div class="tiny muted">平台覆盖（区域模型 + 重点中心）</div>
          <div style="font-size:24px;font-weight:600;margin-top:3px">${totalHosp} 家医院 <span class="tiny muted" style="font-weight:400">/ ${CENTERS.length} 家重点中心</span></div>
        </div>
        <div class="stat-inline" style="margin-left:auto">
          <div class="si"><b>${PHYSICIANS.filter(d => d.level === '带教导师').length}</b><span>带教导师</span></div>
          <div class="si"><b>${PHYSICIANS.filter(d => d.level === '独立术者').length}</b><span>独立术者</span></div>
          <div class="si"><b>${PHYSICIANS.filter(d => d.level === '学习期').length}</b><span>学习期术者</span></div>
          <div class="si"><b>${cases.length}</b><span>平台内病例</span></div>
        </div>
      </div>
    </div>

    ${sectionTitle('重点中心画像')}
    <div class="card">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>中心</th><th>城市 / 等级</th><th>年介入量</th><th>领域覆盖</th><th>认证术者</th><th>平台内病例</th><th>随访完成率</th><th></th></tr></thead>
          <tbody>
            ${rows.map(({ c, cs, docs, followRate }) => `<tr data-center="${c.id}">
              <td><span class="cell-main">${esc(c.name)}</span><span class="cell-sub">${esc(c.leadTime)}</span></td>
              <td class="tiny">${esc(c.city)} · ${esc(c.tier)}</td>
              <td>${c.annual} 台</td>
              <td><div class="tag-line">${c.domains.map(d => domainChip(d, true)).join('')}</div></td>
              <td>${docs.filter(d => d.level !== '学习期').length} / ${docs.length}</td>
              <td>${cs.length}</td>
              <td><span class="${followRate >= 60 ? 'up' : 'down'}">${followRate}%</span></td>
              <td style="color:#8aa0a6">${ICONS.chev}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${sectionTitle('能力建设建议')}
    <div class="grid g-3">
      ${buildAdvice(rows).map(a => `
        <div class="card card-pad">
          ${chip(a.tag, a.tone)}
          <div style="font-weight:600;margin:8px 0 4px">${esc(a.center)}</div>
          <div class="muted" style="font-size:12.5px">${a.text}</div>
        </div>`).join('')}
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-center]').forEach(el => el.addEventListener('click', () => openCenter(el.dataset.center)));
    }
  };
}

function avgFollow(cs) {
  let t = 0, d = 0;
  cs.forEach(c => { const s = caseFollowStats(c); t += s.total; d += s.done; });
  return t ? Math.round(d / t * 100) : 0;
}

function openCenter(id) {
  const c = CENTERS.find(x => x.id === id);
  const cs = getCases().filter(x => x.centerId === id);
  const docs = PHYSICIANS.filter(d => d.center === id);

  const body = `
    <div class="row wrap" style="gap:8px;margin-bottom:14px">
      ${c.domains.map(d => domainChip(d)).join('')}${chip(c.tier)}
    </div>
    <div class="kv">
      <span class="k">城市</span><span>${esc(c.city)}</span>
      <span class="k">床位</span><span>${c.beds} 张</span>
      <span class="k">年介入量</span><span>${c.annual} 台</span>
      <span class="k">急诊能力</span><span>${esc(c.leadTime)}</span>
      <span class="k">平台内病例</span><span>${cs.length} 例，随访完成率 ${avgFollow(cs)}%</span>
    </div>
    <div class="divider"></div>
    <h4 style="font-size:13px;margin-bottom:6px">中心特点</h4>
    <div class="note">${esc(c.note)}</div>

    <h4 style="font-size:13px;margin:16px 0 8px">术者与认证状态（${docs.length}）</h4>
    <div class="list">
      ${docs.map(d => `<div class="row" style="gap:9px;padding:9px 0;border-bottom:1px dashed var(--line-2)">
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:600">${esc(d.name)} <span class="tiny muted">${esc(d.title)}</span></div>
          <div class="tiny muted">累计 ${d.cases} 例 · 带教 ${d.trained} 人 · ${d.domains.map(x => DOMAINS.find(y => y.id === x)?.short).join(' / ')}</div>
        </div>
        ${chip(d.level, d.level === '带教导师' ? 'soft-teal' : d.level === '独立术者' ? 'soft-blue' : 'soft-amber')}
      </div>`).join('') || '<div class="tiny muted">暂无登记术者</div>'}
    </div>

    <div class="divider"></div>
    <h4 style="font-size:13px;margin-bottom:6px">建议动作</h4>
    <div class="muted" style="font-size:12.5px">
      ${docs.filter(d => d.level === '学习期').length
      ? `该中心有 ${docs.filter(d => d.level === '学习期').length} 位学习期术者，建议在平台内指派带教导师，并把学习期术者的前 10 例纳入结构化随访。`
      : '认证结构完整，可承接新术式首批应用与多中心真实世界研究。'}
    </div>`;

  openDrawer({
    title: esc(c.name),
    sub: `${esc(c.city)} · ${esc(c.tier)} · 年介入量 ${c.annual} 台`,
    body,
    footer: `<button class="btn" data-close>关闭</button><a class="btn primary" href="#/cases?center=${c.id}">查看该中心病例</a>`
  });
  document.querySelector('.drawer [data-close]').addEventListener('click', closeDrawer);
}

function buildAdvice(rows) {
  const scored = rows.map(({ c, cs, docs, followRate }) => {
    const certified = docs.filter(d => d.level !== '学习期').length;
    const lead = getPathways().find(p => p.domain === c.domains[0])?.name || '标准术式';
    if (cs.length === 0) {
      return { w: 1, tag: '病例量缺口', tone: 'soft-rose', center: c.name,
        text: `近 90 天平台内没有病例，中心已具备「${esc(lead)}」开展条件，建议先用 1 例标准病例走通申请—报告—随访全流程，再申请术者认证。` };
    }
    if (certified < 4) {
      return { w: 2, tag: '认证缺口', tone: 'soft-amber', center: c.name,
        text: `认证术者 ${certified} / ${docs.length} 人，低于区域中心建议的 4 人。建议优先安排「${esc(lead)}」带教跟台，把学习期术者的前 10 例纳入结构化随访。` };
    }
    if (c.domains.length <= 2) {
      return { w: 3, tag: '术式结构单一', tone: 'soft-teal', center: c.name,
        text: `只覆盖 ${c.domains.length} 个领域，病例集中在「${esc(lead)}」。建议引入相邻血管床的 1–2 个术式，避免患者转诊外流。` };
    }
    if (followRate < 60) {
      return { w: 4, tag: '随访质量', tone: 'soft-blue', center: c.name,
        text: `随访完成率 ${followRate}%，低于 RWE 分析要求的 70%。建议配置随访专员，把术后 30 天节点纳入科室质控考核。` };
    }
    return null;
  }).filter(Boolean).sort((a, b) => a.w - b.w);
  const seen = new Set();
  const out = [];
  for (const a of scored) {
    if (!seen.has(a.tag)) { out.push(a); seen.add(a.tag); }
  }
  for (const a of scored) {
    if (out.length >= 3) break;
    if (!out.includes(a)) out.push(a);
  }
  return out.slice(0, 3);
}
