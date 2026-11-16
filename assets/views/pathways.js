import { DOMAINS, PRODUCTS, CENTERS } from '../data.js';
import { getCases, getPathways, addPathway, productById, pathwayById, centerById } from '../store.js';
import { domainChip, chip, statusChip, esc, ICONS, sectionTitle, emptyState, openModal, closeModal, toast } from '../ui.js';

export function render() {
  const cases = getCases();
  const PATHWAYS = getPathways();
  const customCount = PATHWAYS.filter(p => p.custom).length;
  const byDomain = DOMAINS.map(d => ({ d, items: PATHWAYS.filter(p => p.domain === d.id) }));

  const html = `
  <div class="page">
    <div class="card card-pad" style="margin-bottom:16px;display:flex;gap:26px;align-items:center;flex-wrap:wrap">
      <div>
        <div class="tiny muted">术式路径库${customCount ? ` · 平台内自建 ${customCount} 条` : ''}</div>
        <div style="font-size:22px;font-weight:600;margin-top:2px">${PATHWAYS.length} 条术式 · 覆盖四大领域 · 可运营维护</div>
      </div>
      <div class="stat-inline" style="margin-left:auto">
        <div class="si"><b>${PATHWAYS.filter(p => p.level === '四级').length}</b><span>四级手术</span></div>
        <div class="si"><b>${PATHWAYS.filter(p => p.level === '三级').length}</b><span>三级手术</span></div>
        <div class="si"><b>${new Set(PATHWAYS.flatMap(p => p.devices)).size}</b><span>关联器械</span></div>
        <button class="btn primary" data-new-path>${ICONS.plus}新增术式</button>
      </div>
    </div>

    ${byDomain.map(({ d, items }) => `
      ${sectionTitle(d.name + ' · ' + d.desc)}
      <div class="grid g-2">
        ${items.map(p => pathCard(p, cases)).join('') || emptyState('该领域暂无术式', '用右上角"新增术式"录入第一条')}
      </div>
    `).join('')}
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-new-path]').forEach(el => el.addEventListener('click', openNewPathway));
      root.querySelectorAll('[data-path]').forEach(el => el.addEventListener('click', () => {
        location.hash = '#/pathways/' + el.dataset.path;
      }));
    }
  };
}

function pathCard(p, cases) {
  const caseCount = cases.filter(c => c.pathwayId === p.id).length;
  const d = DOMAINS.find(x => x.id === p.domain);
  return `<div class="card" data-path="${p.id}" style="cursor:pointer;transition:.15s">
    <div class="card-pad">
      <div class="row" style="gap:7px;margin-bottom:8px">${domainChip(p.domain, true)}${chip(p.level === '四级' ? '四级手术' : p.level === '三级' ? '三级手术' : '二级手术', 'soft-blue')}${p.custom ? chip('平台自建', 'soft-teal') : ''}</div>
      <div style="font-size:14px;font-weight:600;line-height:1.45">${esc(p.name)}</div>
      <div class="muted" style="font-size:12px;margin-top:6px;min-height:38px">${esc(p.indication)}</div>
      <div class="divider" style="margin:11px 0"></div>
      <div class="row tiny muted" style="gap:14px">
        <span>${p.steps.length} 个关键步骤</span><span>${p.devices.length} 类器械</span><span>${caseCount} 例病例</span>
        <span style="margin-left:auto;color:${d.color}">${ICONS.chev}</span>
      </div>
    </div>
  </div>`;
}

export function renderDetail(id) {
  const p = pathwayById(id);
  if (!p) return { html: `<div class="page">${emptyState('术式不存在', '请返回术式库重新选择')}</div>`, mount() { } };
  const cases = getCases().filter(c => c.pathwayId === id);
  const d = DOMAINS.find(x => x.id === p.domain);

  const html = `
  <div class="page">
    <a class="btn sm ghost" href="#/pathways" style="border:none;padding-left:0;margin-bottom:12px">← 返回术式库</a>
    <div class="card" style="overflow:hidden;margin-bottom:16px">
      <div style="height:4px;background:${d.color}"></div>
      <div class="card-pad">
        <div class="row wrap" style="gap:8px;margin-bottom:10px">${domainChip(p.domain)}${chip(p.level === '四级' ? '四级手术' : p.level === '三级' ? '三级手术' : '二级手术', 'soft-blue')}${chip('标准时长 ' + p.minutes + ' 分钟')}${p.custom ? chip('平台自建 · ' + (p.createdAt || ''), 'soft-teal') : ''}</div>
        <h2 style="font-size:22px;line-height:1.35">${esc(p.name)}</h2>
        <div class="muted" style="margin-top:8px;font-size:13px">${esc(p.indication)}</div>
        <div class="row" style="margin-top:16px;gap:9px">
          <button class="btn primary" data-new-case>以此术式新建病例</button>
          <a class="btn" href="#/products">查阅器械矩阵</a>
        </div>
      </div>
    </div>

    <div class="grid g-2-1">
      <div class="stack" style="gap:16px">
        <div class="card">
          <div class="card-h"><h3>关键步骤</h3><span class="sub">术中执行顺序与质控点</span></div>
          <div class="card-pad">
            <div class="stepper">
              ${p.steps.map((s, i) => `<div class="step"><div class="step-no">${String(i + 1).padStart(2, '0')}</div><div class="step-body">${esc(s)}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h3>器械准备清单</h3><span class="sub">${p.devices.length} 类，点击查看产品详情</span></div>
          <div class="list">
            ${p.devices.map(id => { const pr = productById(id); if (!pr) return '';
              return `<div class="list-item" data-prod="${id}">
                <div class="li-main"><div class="li-title">${esc(pr.name)}</div>
                  <div class="li-sub">${esc(pr.brand)} · ${esc(pr.anatomy)} · ${esc(pr.spec)}</div></div>
                <div class="li-side">${chip(pr.category)}</div>
              </div>`; }).join('')}
          </div>
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card">
          <div class="card-h"><h3>质量指标</h3><span class="sub">用于科室质控与 RWE</span></div>
          <div class="card-pad">
            ${p.metrics.length ? p.metrics.map(m => `<div class="spread" style="padding:7px 0;border-bottom:1px dashed var(--line-2)">
              <span style="font-size:12.5px">${esc(m.name)}</span><strong style="font-size:12.5px;color:#0b6f66">${esc(m.target)}</strong></div>`).join('')
              : '<div class="tiny muted">质控指标维护中</div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h3>常见并发症</h3></div>
          <div class="card-pad tag-line">${p.complications.length ? p.complications.map(c => chip(c, 'soft-rose')).join('') : '<span class="tiny muted">并发症口径维护中</span>'}</div>
        </div>
        <div class="card card-pad">
          <div class="row" style="gap:7px;margin-bottom:7px"><span class="dot" style="background:#b45309"></span><strong style="font-size:13px">术者经验提示</strong></div>
          <div class="muted" style="font-size:12.5px">${esc(p.tip)}</div>
        </div>
      </div>
    </div>

    ${sectionTitle('该术式下的病例')}
    <div class="card">
      ${cases.length ? `<div class="list">${cases.map(c => `<div class="list-item" data-case="${c.id}">
        <div class="li-main"><div class="li-title">${esc(c.patient.alias)} · ${c.patient.age} 岁 ${esc(c.patient.sex)}</div>
          <div class="li-sub">${esc(centerById(c.centerId)?.name || '')} · ${esc(c.preop.key)}</div></div>
        <div class="li-side">${statusChip(c.status)}<span class="tiny muted">${c.date}</span></div>
      </div>`).join('')}</div>` : `<div class="empty"><strong>还没有关联病例</strong>用「以此术式新建病例」录入第一例</div>`}
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelector('[data-new-case]').addEventListener('click', () => {
        location.hash = `#/cases?new=1&pathway=${p.id}`;
      });
      root.querySelectorAll('[data-case]').forEach(el => el.addEventListener('click', () => { location.hash = '#/cases/' + el.dataset.case; }));
      root.querySelectorAll('[data-prod]').forEach(el => el.addEventListener('click', () => {
        location.hash = '#/products';
      }));
    }
  };
}

// 新增术式：名称/领域/等级/时长/适应证/步骤/器械勾选，保存即入术式库
function openNewPathway() {
  openModal({
    title: '新增术式路径',
    body: `
      <div class="form-grid">
        <div class="field full"><label>术式名称 *</label><input id="np-name" placeholder="例如：髂动脉支架内再狭窄腔内治疗"></div>
        <div class="field"><label>治疗领域</label><select id="np-domain">${DOMAINS.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
        <div class="field"><label>手术等级</label><select id="np-level"><option>二级</option><option selected>三级</option><option>四级</option></select></div>
        <div class="field"><label>标准时长（分钟）</label><input id="np-minutes" type="number" min="10" max="600" value="60"></div>
        <div class="field"><label>常见并发症（顿号/逗号分隔，可空）</label><input id="np-comp" placeholder="再狭窄、血栓形成、穿刺点血肿"></div>
        <div class="field full"><label>适应证 *</label><input id="np-ind" placeholder="例如：髂动脉支架内再狭窄，血流限值性病变，不适合开放手术"></div>
        <div class="field full"><label>关键步骤 *（每行一步）</label><textarea id="np-steps" style="min-height:110px" placeholder="造影评估病变与流入流出&#10;导丝通过病变段&#10;球囊预扩张&#10;……"></textarea></div>
        <div class="field full"><label>质控指标（每行"名称｜目标"，可空）</label><textarea id="np-metrics" placeholder="技术成功率｜≥95%&#10;一期通畅率（12 月）｜≥80%"></textarea></div>
        <div class="field full"><label>器械准备清单（按领域过滤，勾选）</label><div id="np-devices" class="tag-line" style="gap:8px"></div></div>
        <div class="field full"><label>术者经验提示（可空）</label><input id="np-tip" placeholder="写给首过该术式的术者的一句话"></div>
      </div>
      <div class="note" style="margin-top:12px">保存后立即进入术式库：可用于新建病例的术式下拉、方案助手推荐与产品页"适配术式"，操作写入审计留痕。质控指标与并发症可后续补齐（详情页显示"维护中"）。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>保存术式</button>`,
    onMount(m) {
      const dSel = m.querySelector('#np-domain');
      const devBox = m.querySelector('#np-devices');
      function fillDevices() {
        devBox.innerHTML = PRODUCTS.filter(p => p.domain === dSel.value).map(p =>
          `<label class="chip" style="cursor:pointer;background:#f0f5f6"><input type="checkbox" value="${p.id}" style="margin-right:5px">${esc(p.name.slice(0, 20))}</label>`).join('');
      }
      dSel.addEventListener('change', fillDevices);
      fillDevices();

      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const name = m.querySelector('#np-name').value.trim();
        const indication = m.querySelector('#np-ind').value.trim();
        const steps = m.querySelector('#np-steps').value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!name) return toast('请填写术式名称', 'err');
        if (!indication) return toast('请填写适应证', 'err');
        if (steps.length < 2) return toast('关键步骤至少两步（每行一步）', 'err');
        const metrics = m.querySelector('#np-metrics').value.split('\n').map(s => s.trim()).filter(Boolean)
          .map(line => { const [n, t] = line.split(/[｜|]/); return { name: (n || '').trim(), target: (t || '').trim() }; })
          .filter(x => x.name && x.target);
        const complications = m.querySelector('#np-comp').value.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
        const rec = addPathway({
          name, domain: dSel.value,
          level: m.querySelector('#np-level').value,
          minutes: Number(m.querySelector('#np-minutes').value) || 60,
          indication, steps,
          devices: [...devBox.querySelectorAll('input:checked')].map(i => i.value),
          metrics, complications,
          tip: m.querySelector('#np-tip').value.trim()
        });
        closeModal();
        toast('术式已入库：' + rec.name);
        location.hash = '#/pathways/' + rec.id;
      });
    }
  });
}
