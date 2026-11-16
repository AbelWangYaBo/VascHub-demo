import { CENTERS, PHYSICIANS, DOMAINS, PRODUCTS } from '../data.js';
import {
  getCases, addCase, caseFollowStats, followStatus, isOverdue, completeFollowup,
  addFollowupPoint, toggleConsent, getPathways, centerById, physicianById, pathwayById, productById, currentIdentity, TODAY, daysBetween
} from '../store.js';
import { domainChip, statusChip, chip, esc, ICONS, openDrawer, closeDrawer, openModal, closeModal, toast, emptyState } from '../ui.js';
import { progress } from '../charts.js';

let filters = { domain: 'all', follow: 'all', center: 'all', q: '' };

export function setSearch(q) { filters.q = q; }

export function render({ id = null, query = {} } = {}) {
  // 中心页跳转联动：#/cases?center=c-xx 自动按中心过滤
  if (query.center && centerById(query.center)) filters.center = query.center;
  const list = filterCases();
  const centers = [...new Set(getCases().map(c => c.centerId))];

  const html = `
  <div class="page">
    <div class="card">
      <div class="filters">
        <span class="tiny muted">领域</span>
        <button class="filter-chip ${filters.domain === 'all' ? 'on' : ''}" data-f="domain" data-v="all">全部</button>
        ${DOMAINS.map(d => `<button class="filter-chip ${filters.domain === d.id ? 'on' : ''}" data-f="domain" data-v="${d.id}"
          style="${filters.domain === d.id ? `background:${d.color};border-color:${d.color}` : ''}">${d.short}</button>`).join('')}
        <span style="width:8px"></span>
        <span class="tiny muted">随访</span>
        ${['all', '逾期', '待随访', '已完成'].map(v => `<button class="filter-chip ${filters.follow === v ? 'on' : ''}" data-f="follow" data-v="${v}">${v === 'all' ? '全部' : v}</button>`).join('')}
        <select class="select" data-f="center">
          <option value="all">全部中心</option>
          ${centers.map(c => `<option value="${c}" ${filters.center === c ? 'selected' : ''}>${esc(centerById(c)?.name || c)}</option>`).join('')}
        </select>
        <input class="select" data-f="q" placeholder="搜索病例号 / 患者 / 诊断" value="${esc(filters.q)}" style="min-width:200px">
        <button class="btn primary" data-new style="margin-left:auto">${ICONS.plus}新建病例</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr>
            <th>病例号</th><th>患者</th><th>领域 / 术式</th><th>中心 · 术者</th><th>手术日期</th><th>随访进度</th><th>状态</th><th></th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map(row).join('') : `<tr><td colspan="8">${emptyState('没有匹配的病例', '调整筛选条件，或新建一例病例')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="filters" style="border-top:1px solid var(--line-2);border-bottom:none">
        <span class="tiny muted">共 ${list.length} 例 · 数据本地保存，刷新不丢失</span>
        <span class="tiny muted" style="margin-left:auto">随访节点逾期会自动进入风险待办</span>
      </div>
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-f]').forEach(el => {
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', e => { filters.q = e.target.value; rerender(); });
        } else if (el.tagName === 'SELECT') {
          el.addEventListener('change', e => { filters.center = e.target.value; rerender(); });
        } else {
          el.addEventListener('click', () => { filters[el.dataset.f] = el.dataset.v; rerender(); });
        }
      });
      root.querySelector('[data-new]')?.addEventListener('click', () => openNew(query.pathway || null));
      root.querySelectorAll('[data-case]').forEach(el => el.addEventListener('click', () => openCase(el.dataset.case)));

      if (query.new) openNew(query.pathway || null);
      else if (id) openCase(id);
    }
  };
}

function rerender() {
  const app = document.getElementById('view');
  const res = render();
  app.innerHTML = res.html;
  res.mount(app);
}

function filterCases() {
  return getCases().filter(c => {
    if (filters.domain !== 'all' && c.domain !== filters.domain) return false;
    if (filters.center !== 'all' && c.centerId !== filters.center) return false;
    if (filters.follow !== 'all') {
      const hasOverdue = c.followups.some(f => isOverdue(f));
      if (filters.follow === '逾期' && !hasOverdue) return false;
      if (filters.follow === '待随访' && (hasOverdue || c.followups.every(f => f.status === '已完成'))) return false;
      if (filters.follow === '已完成' && !c.followups.every(f => f.status === '已完成')) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [c.id, c.patient.alias, c.preop.key, pathwayById(c.pathwayId)?.name, centerById(c.centerId)?.name]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function row(c) {
  const s = caseFollowStats(c);
  const p = pathwayById(c.pathwayId);
  const overdue = c.followups.some(f => isOverdue(f));
  return `<tr data-case="${c.id}">
    <td><span class="cell-main" style="font-family:var(--mono);font-size:12px">${c.id}</span><span class="cell-sub">${esc(c.date)}</span></td>
    <td><span class="cell-main">${esc(c.patient.alias)}</span><span class="cell-sub">${c.patient.age} 岁 ${esc(c.patient.sex)} · ASA ${esc(c.preop.asa)}</span></td>
    <td>${domainChip(c.domain, true)}<span class="cell-sub" style="margin-top:3px">${esc(p?.name || '')}</span></td>
    <td><span class="cell-main" style="font-weight:500">${esc(centerById(c.centerId)?.name || '')}</span><span class="cell-sub">${esc(physicianById(c.physicianId)?.name || '')}</span></td>
    <td class="tiny">${c.date}</td>
    <td style="min-width:120px">${progress(s.rate, overdue ? '#be123c' : '#0d9488')}<span class="cell-sub">${s.done}/${s.total} 节点${overdue ? ` · 逾期 ${s.overdue}` : ''}</span></td>
    <td>${statusChip(c.status)}</td>
    <td style="color:#8aa0a6">${ICONS.chev}</td>
  </tr>`;
}

function openCase(id) {
  const c = getCases().find(x => x.id === id);
  if (!c) { toast('病例不存在', 'err'); return; }
  const p = pathwayById(c.pathwayId);
  const s = caseFollowStats(c);

  const body = `
    <div class="row wrap" style="gap:8px;margin-bottom:14px">
      ${domainChip(c.domain)}${statusChip(c.status)}${chip(`随访 ${s.done}/${s.total}`, s.overdue ? 'soft-rose' : 'soft-teal')}
      ${s.overdue ? chip(`逾期 ${s.overdue} 个节点`, 'soft-rose') : ''}
    </div>

    <h4 style="font-size:13px;margin-bottom:7px">患者授权 <span class="tiny muted">（敏感个人信息单独同意 · 点击切换）</span></h4>
    <div class="tag-line" style="gap:7px;margin-bottom:6px">
      ${[['followup', '随访'], ['research', '院内科研'], ['rwe', '真实世界研究']].map(([k, label]) => {
        const on = c.consents?.[k];
        return `<button class="chip ${on ? 'soft-teal' : ''}" data-consent="${k}" style="cursor:pointer;${on ? '' : 'background:#f0f5f6;color:var(--muted)'}">
          <span class="dot" style="background:${on ? '#0d9488' : '#b9c8cc'}"></span>${label} · ${on ? '已授权' : '未授权'}</button>`;
      }).join('')}
    </div>
    <div class="tiny muted" style="margin-bottom:14px">撤回授权后，对应用途立即停止使用该病例数据；未授权 RWE 的病例不进入真实世界研究交付集。</div>

    <div class="kv">
      <span class="k">病例号</span><span style="font-family:var(--mono);font-size:12px">${c.id}</span>
      <span class="k">患者</span><span>${esc(c.patient.alias)} · ${c.patient.age} 岁 · ${esc(c.patient.sex)}</span>
      <span class="k">术式</span><span>${esc(p?.name || '')}</span>
      <span class="k">中心 / 术者</span><span>${esc(centerById(c.centerId)?.name || '')} · ${esc(physicianById(c.physicianId)?.name || '')}（${esc(physicianById(c.physicianId)?.title || '')}）</span>
      <span class="k">手术日期</span><span>${c.date}（术后 ${daysBetween(c.date, TODAY)} 天）</span>
      <span class="k">ASA 分级</span><span>ASA ${esc(c.preop.asa)}</span>
    </div>

    <div class="divider"></div>
    <h4 style="font-size:13px;margin-bottom:6px">术前评估</h4>
    <div class="note">${esc(c.preop.key)}</div>

    <h4 style="font-size:13px;margin:16px 0 8px">器械使用（${c.devices.length}）</h4>
    ${c.devices.length ? c.devices.map(did => {
      const pr = productById(did);
      return `<div class="row" style="gap:9px;padding:7px 0;border-bottom:1px dashed var(--line-2)">
        <span class="dot" style="background:${DOMAINS.find(x => x.id === pr?.domain)?.color || '#6a8189'}"></span>
        <span style="flex:1;font-size:12.5px">${esc(pr?.name || did)}</span>
        <span class="tiny muted">${esc(pr?.category || '')}</span>
        <a class="tiny" href="#/trace" style="color:#0b6f66">UDI</a>
      </div>`; }).join('') : '<div class="tiny muted">未登记器械</div>'}

    <h4 style="font-size:13px;margin:16px 0 10px">随访时间线</h4>
    ${!c.consents?.followup ? `<div class="warn" style="margin-bottom:10px">患者已撤回随访授权：随访用途已停止，登记与新增节点不可用。重新获得授权后恢复。</div>` : ''}
    <div class="timeline">
      ${c.followups.map((f, i) => {
        const st = followStatus(f);
        const over = isOverdue(f);
        return `<div class="tl-item ${st === '已完成' ? 'done' : ''} ${over ? 'overdue' : ''}">
          <div class="tl-title">${esc(f.label)} ${st === '已完成' ? chip('已完成', 'soft-teal') : over ? chip('逾期未随访', 'soft-rose') : chip('待随访', 'soft-amber')}</div>
          <div class="tl-meta">计划 ${f.plan}${over ? ` · 已逾期 ${daysBetween(f.plan, TODAY)} 天` : ''}${f.doneAt ? ` · 完成 ${f.doneAt}` : ''}</div>
          ${f.note ? `<div class="tl-note">${esc(f.note)}</div>` : ''}
          ${st !== '已完成' ? `<button class="btn sm" style="margin-top:6px" ${!c.consents?.followup ? 'disabled title="患者已撤回随访授权"' : ''} data-fu="${i}">登记随访</button>` : ''}
        </div>`;
      }).join('')}
    </div>
    <button class="btn sm" data-add-fu ${!c.consents?.followup ? 'disabled title="患者已撤回随访授权"' : ''}>${ICONS.plus} 新增随访节点</button>

    <div class="divider"></div>
    <h4 style="font-size:13px;margin-bottom:6px">当前结局</h4>
    <div class="muted" style="font-size:12.5px">${esc(c.outcome)}</div>`;

  openDrawer({
    title: `${esc(c.patient.alias)} · ${esc(p?.name || '')}`,
    sub: `${c.id} · ${esc(centerById(c.centerId)?.name || '')}`,
    body,
    footer: `<a class="btn" href="#/pathways/${c.pathwayId}">查看术式路径</a>
      <button class="btn primary" data-close-drawer>完成</button>`
  });

  const dr = document.querySelector('.drawer');
  dr.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
  dr.querySelectorAll('[data-fu]').forEach(el => el.addEventListener('click', () => openComplete(c.id, Number(el.dataset.fu))));
  dr.querySelector('[data-add-fu]').addEventListener('click', () => openAddFu(c.id));
  dr.querySelectorAll('[data-consent]').forEach(el => el.addEventListener('click', () => {
    toggleConsent(c.id, el.dataset.consent);
    rerender();
    openCase(c.id);
  }));
}

function openComplete(caseId, index) {
  const c = getCases().find(x => x.id === caseId);
  const f = c.followups[index];
  openModal({
    title: '登记随访结果',
    body: `
      <div class="kv" style="margin-bottom:14px">
        <span class="k">病例</span><span>${c.id} · ${esc(c.patient.alias)}</span>
        <span class="k">随访节点</span><span>${esc(f.label)}（计划 ${f.plan}）</span>
      </div>
      <div class="field"><label>随访结论与指标</label>
        <textarea id="fu-note" placeholder="例如：CTA 无内漏，支架形态良好，ABPI 0.96；患者无不适">${esc(f.note || '')}</textarea>
      </div>
      <div class="note" style="margin-top:12px">登记后该节点标记为已完成，随访完成率与质控看板会同步更新。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>确认完成</button>`,
    onMount(m) {
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const note = m.querySelector('#fu-note').value.trim();
        if (!note) { toast('请填写随访结论', 'err'); return; }
        completeFollowup(caseId, index, note);
        closeModal();
        closeDrawer();
        toast('随访已登记，完成率已更新');
        rerender();
        setTimeout(() => openCase(caseId), 60);
      });
    }
  });
}

function openAddFu(caseId) {
  const c = getCases().find(x => x.id === caseId);
  openModal({
    title: '新增随访节点',
    body: `
      <div class="form-grid">
        <div class="field"><label>节点名称</label><input id="fu-label" placeholder="例如：术后 12 月"></div>
        <div class="field"><label>计划日期</label><input id="fu-plan" type="date" value="${TODAY}"></div>
      </div>
      <div class="note" style="margin-top:12px">当前已有 ${c.followups.length} 个节点，新增后自动纳入随访看板与逾期提醒。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>新增</button>`,
    onMount(m) {
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const label = m.querySelector('#fu-label').value.trim();
        const plan = m.querySelector('#fu-plan').value;
        if (!label || !plan) { toast('请填写节点名称与日期', 'err'); return; }
        addFollowupPoint(caseId, label, plan);
        closeModal(); closeDrawer();
        toast('已新增随访节点');
        rerender();
        setTimeout(() => openCase(caseId), 60);
      });
    }
  });
}

function openNew(prefillPathway = null) {
  let presetPath = prefillPathway ? getPathways().find(p => p.id === prefillPathway) : null;
  const presetDomain = presetPath?.domain || 'peripheral';

  openModal({
    title: '新建病例',
    body: `
      <div class="form-grid">
        <div class="field"><label>患者标识（脱敏）</label><input id="f-alias" placeholder="王**" value="新**"></div>
        <div class="field"><label>年龄</label><input id="f-age" type="number" min="1" max="120" value="65"></div>
        <div class="field"><label>性别</label><select id="f-sex"><option>男</option><option>女</option></select></div>
        <div class="field"><label>ASA 分级</label><select id="f-asa"><option>I</option><option selected>II</option><option>III</option><option>IV</option></select></div>
        <div class="field"><label>治疗领域</label><select id="f-domain">${DOMAINS.map(d => `<option value="${d.id}" ${d.id === presetDomain ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
        <div class="field"><label>术式路径</label><select id="f-path"></select></div>
        <div class="field"><label>中心</label><select id="f-center">${CENTERS.map(c => `<option value="${c.id}">${esc(c.name)} · ${c.city}</option>`).join('')}</select></div>
        <div class="field"><label>术者</label><select id="f-doc"></select></div>
        <div class="field"><label>手术日期</label><input id="f-date" type="date" value="${TODAY}" max="${TODAY}"></div>
        <div class="field"><label>病例结局（可后补）</label><input id="f-outcome" placeholder="技术成功，无围术期并发症"></div>
        <div class="field full"><label>术前评估要点</label><textarea id="f-preop" placeholder="例如：股浅动脉长段闭塞 24 cm，中重度钙化，Rutherford 3 级"></textarea></div>
        <div class="field full"><label>器械使用（勾选本次实际使用）</label><div id="f-devices" class="tag-line" style="gap:8px"></div></div>
      </div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>保存病例</button>`,
    onMount(m) {
      const dSel = m.querySelector('#f-domain');
      const pSel = m.querySelector('#f-path');
      const cSel = m.querySelector('#f-center');
      const docSel = m.querySelector('#f-doc');
      const devBox = m.querySelector('#f-devices');

      function fillPaths() {
        const paths = getPathways().filter(p => p.domain === dSel.value);
        pSel.innerHTML = paths.map(p => `<option value="${p.id}" ${presetPath && presetPath.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
        fillDevices();
      }
      function fillDevices() {
        const p = getPathways().find(x => x.id === pSel.value);
        devBox.innerHTML = (p?.devices || []).map(id => {
          const pr = PRODUCTS.find(x => x.id === id);
          if (!pr) return '';
          return `<label class="chip" style="cursor:pointer;background:#f0f5f6"><input type="checkbox" value="${id}" checked style="margin-right:5px">${esc(pr.name.slice(0, 20))}</label>`;
        }).join('') || '<span class="tiny muted">该术式未绑定器械</span>';
      }
      function fillDocs() {
        const docs = PHYSICIANS.filter(d => d.center === cSel.value);
        docSel.innerHTML = (docs.length ? docs : PHYSICIANS).map(d => `<option value="${d.id}">${esc(d.name)} · ${esc(d.title)} · ${d.level}</option>`).join('');
      }
      dSel.addEventListener('change', () => { presetPath = null; fillPaths(); });
      pSel.addEventListener('change', fillDevices);
      cSel.addEventListener('change', fillDocs);

      fillPaths(); fillDocs();
      if (presetPath) pSel.value = presetPath.id;
      fillDevices();

      // 术者身份默认落在本人中心与本人术者
      const me = currentIdentity();
      if (me?.role === '术者' && me.home) {
        cSel.value = me.home;
        fillDocs();
        if (me.physicianId) docSel.value = me.physicianId;
      }

      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const alias = m.querySelector('#f-alias').value.trim();
        const age = Number(m.querySelector('#f-age').value);
        const preopKey = m.querySelector('#f-preop').value.trim();
        const date = m.querySelector('#f-date').value;
        if (!alias) return toast('请填写患者标识', 'err');
        if (!age || age < 1 || age > 120) return toast('年龄需在 1–120 之间', 'err');
        if (!pSel.value) return toast('请选择术式路径', 'err');
        if (!date) return toast('请选择手术日期', 'err');
        if (!preopKey) return toast('请填写术前评估要点', 'err');
        const devices = [...devBox.querySelectorAll('input:checked')].map(i => i.value);
        const rec = addCase({
          patient: { alias, age, sex: m.querySelector('#f-sex').value },
          domain: dSel.value,
          pathwayId: pSel.value,
          centerId: cSel.value,
          physicianId: docSel.value,
          date,
          preop: { asa: m.querySelector('#f-asa').value, key: preopKey },
          devices,
          outcome: m.querySelector('#f-outcome').value.trim() || '待评估'
        });
        closeModal();
        toast('病例已创建：' + rec.id);
        location.hash = '#/cases/' + rec.id;
        rerender();
        setTimeout(() => openCase(rec.id), 80);
      });
    }
  });
}
