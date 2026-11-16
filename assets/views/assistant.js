import { PRODUCTS, DOMAINS } from '../data.js';
import { devicePreference, savePlan, productById, pathwayById
  , getPathways } from '../store.js';
import { domainChip, chip, esc, openDrawer, closeDrawer, toast, ICONS } from '../ui.js';

const TRAITS = {
  // 外周
  t_long: { label: '长段病变（>15 cm）', domain: 'peripheral', tags: ['长病变', 'DCB', '长覆盖'], paths: ['pw-sfa'],
    risk: '长段病变单纯球囊扩张弹性回缩明显，需明确补救支架指征与 12 个月再干预计划。' },
  t_calc: { label: '中重度钙化', domain: 'peripheral', tags: ['钙化', '减容', '棘突', '锯齿', '刻痕', '高压'],
    risk: '重度钙化直接 DCB 会因药物无法均匀渗透而失效，先做钙化修饰是前提。' },
  t_isr: { label: '支架内再狭窄（ISR）', domain: 'peripheral', tags: ['ISR', '减容', '刻痕', 'DCB'],
    risk: 'ISR 优先减容 + DCB，避免在同段反复叠加支架导致支架断裂。' },
  t_thrombus: { label: '大负荷血栓', domain: 'peripheral', tags: ['PMT', '大腔', '三合一', '血栓负荷', 'VTE'],
    risk: '大口径抽吸需评估失血量与静脉瓣膜保护，术后必须处理髂静脉受压。' },
  t_avf: { label: '血透通路病变', domain: 'peripheral', tags: ['通路', '高压', '棘突', '顽固狭窄'],
    risk: '通路破裂是主要急症，高压球囊需控制压力梯度与扩张时间。' },
  t_cli: { label: '严重肢体缺血（CLI）', domain: 'peripheral', tags: ['膝下', 'BTK', '可吸收'],
    risk: 'CLI 患者对比剂耐受差，优先单支直通足部，不追求多支全开通。' },
  // 神经
  t_lvo: { label: '颅内大血管闭塞', domain: 'neuro', tags: ['取栓', 'AIS', 'BGC', '通路', '血流阻断'], paths: ['pw-mt'],
    risk: '穿刺到再通时间直接影响预后，3 次取栓未通应切换策略而非重复操作。' },
  t_wide: { label: '宽颈 / 分叉部动脉瘤', domain: 'neuro', tags: ['宽颈', '分叉', '辅助支架', '瘤内', '灯笼技术'], paths: ['pw-coil'],
    risk: '宽颈分叉部优先评估瘤内栓塞器，可免支架辅助与长期双抗。' },
  t_large: { label: '大型 / 梭形动脉瘤', domain: 'neuro', tags: ['血流导向', 'FD', '密网'], paths: ['pw-coil'],
    risk: '血流导向需规范双抗与影像随访，支架内血栓是最需要防的并发症。' },
  t_icad: { label: '颅内动脉粥样硬化性狭窄', domain: 'neuro', tags: ['颅内狭窄', '低压', 'Rx'], paths: ['pw-coil'],
    risk: '颅内血管壁薄，低压缓慢扩张，避免过度扩张导致破裂。' },
  t_cas: { label: '颈动脉狭窄', domain: 'neuro', tags: ['CAS', '双层', '可回收'], paths: ['pw-cas'],
    risk: '不稳定斑块优先双层密网支架，降低远端栓塞风险。' },
  // 主动脉
  t_neck: { label: '锚定区不足（<15 mm）', domain: 'aorta', tags: ['单分支', '锚定区', '弓部'], paths: ['pw-tevar', 'pw-arch'],
    risk: '锚定区不足不要强行短锚定，II 型内漏与远期扩张风险高。' },
  t_visceral: { label: '累及内脏区分支', domain: 'aorta', tags: ['分支重建', '内脏区', '胸腹'], paths: ['pw-fevas'],
    risk: '分支超选顺序应先易后难，保留最后一条分支作为调整窗口。' },
  t_arch: { label: '累及弓部三分支', domain: 'aorta', tags: ['弓部', '三分支'], paths: ['pw-arch'],
    risk: '术前必须评估 Willis 环与椎动脉优势，否则脑缺血风险不可控。' },
  t_rupture: { label: '破裂 / 急诊', domain: 'aorta', tags: ['TEVAR', '夹层'], paths: ['pw-tevar'],
    risk: '急诊优先稳定血流动力学，控制性降压与快速释放比完美解剖更关键。' },
  // 结构
  t_ac: { label: '长期抗凝禁忌 / 出血史', domain: 'structural', tags: ['LAAC', '房颤', '抗凝禁忌'], paths: ['pw-laa'],
    risk: '术前必须 TEE 排除心耳血栓，否则术中栓塞风险极高。' },
  t_cauli: { label: '菜花型 / 多分叶心耳', domain: 'structural', tags: ['LAAC', '伞盘', '可回收'], paths: ['pw-laa'],
    risk: '多分叶心耳压缩比不足时装置易脱落，宁可换大一档型号。' },
  t_edge: { label: '缺损边缘不足', domain: 'structural', tags: ['先心病', 'ASD'], paths: ['pw-asd'],
    risk: '主动脉侧边缘不足是封堵失败主因，需多切面 TEE 复核。' }
};

const ROLE = {
  覆膜支架: '主器械', 支架: '主器械', 封堵器: '主器械', 栓塞: '主器械', 抽吸: '主器械',
  减容: '主器械', 消融: '主器械', 滤器: '辅助器械',
  球囊: '预处理 / 扩张', 导管: '通路建立', 微导管: '通路建立', 导丝: '通路建立', 鞘: '通路建立',
  闭合: '止血闭合', 其他: '其他'
};

export function openAssistant() {
  const domains = DOMAINS.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  const body = `
    <div class="field" style="margin-bottom:12px"><label>治疗领域</label>
      <select id="a-domain">${domains}</select></div>
    <div class="field" style="margin-bottom:12px"><label>解剖部位</label>
      <select id="a-anatomy"></select></div>
    <div class="field" style="margin-bottom:14px"><label>病变特征（可多选）</label>
      <div id="a-traits" class="tag-line" style="gap:7px"></div></div>
    <div class="row" style="gap:12px;margin-bottom:14px">
      <div class="field" style="flex:1"><label>参考血管直径（mm，可选）</label><input id="a-diam" type="number" step="0.1" placeholder="例如 5.5"></div>
      <div class="field" style="flex:1"><label>病变长度（cm，可选）</label><input id="a-len" type="number" step="1" placeholder="例如 24"></div>
    </div>
    <button class="btn primary" id="a-run" style="width:100%;justify-content:center">${ICONS.spark} 生成一体化方案</button>
    <div id="a-out" style="margin-top:18px"></div>
    <div class="note" style="margin-top:14px">方案由本地规则引擎基于产品矩阵、术式库与院内既往病例偏好计算得出，用于术前讨论与器械准备，最终由术者确认。</div>`;

  openDrawer({ title: '方案助手', sub: '解剖 → 病变 → 术式 → 器械组合', body, wide: true });

  const dr = document.querySelector('.drawer');
  const dSel = dr.querySelector('#a-domain');
  const aSel = dr.querySelector('#a-anatomy');
  const tBox = dr.querySelector('#a-traits');

  function fillAnatomy() {
    const anats = [...new Set(PRODUCTS.filter(p => p.domain === dSel.value).flatMap(p => p.anatomy.split(' / ')))];
    aSel.innerHTML = anats.map(a => `<option value="${a}">${a}</option>`).join('');
    fillTraits();
  }
  function fillTraits() {
    const ts = Object.entries(TRAITS).filter(([, r]) => r.domain === dSel.value);
    tBox.innerHTML = ts.map(([id, r]) => `<label class="chip" style="cursor:pointer;background:#f0f5f6">
      <input type="checkbox" value="${id}" style="margin-right:5px">${esc(r.label)}</label>`).join('')
      || '<span class="tiny muted">该领域暂无预设特征</span>';
  }
  dSel.addEventListener('change', fillAnatomy);
  fillAnatomy();

  dr.querySelector('#a-run').addEventListener('click', () => {
    const traits = [...tBox.querySelectorAll('input:checked')].map(i => i.value);
    const result = recommend(dSel.value, aSel.value, traits, dr.querySelector('#a-diam').value, dr.querySelector('#a-len').value);
    dr.querySelector('#a-out').innerHTML = renderResult(result);
    dr.querySelector('#a-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const saveBtn = dr.querySelector('#a-save');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const name = `方案助手 · ${DOMAINS.find(d => d.id === dSel.value).name} · ${aSel.value}`;
      savePlan({ name, note: result.summary, items: result.devices.map(d => d.p.id), domains: [dSel.value] });
      toast('方案已保存到数据资产页');
    });
  });
}

function recommend(domain, anatomy, traitIds, diam, len) {
  const usedTraits = traitIds.map(id => TRAITS[id]).filter(Boolean);
  const traitTags = new Set(usedTraits.flatMap(t => t.tags));
  const preferPaths = new Set(usedTraits.flatMap(t => t.paths || []));

  // 术式打分
  const pathScores = getPathways().filter(p => p.domain === domain).map(p => {
    let score = 0;
    const reasons = [];
    if (preferPaths.has(p.id)) { score += 4; reasons.push('与病变特征匹配'); }
    if (p.indication.includes(anatomy) || p.name.includes(anatomy)) { score += 3; reasons.push('解剖部位吻合'); }
    if (len && Number(len) > 15 && p.id === 'pw-sfa') { score += 2; reasons.push('长病变路径'); }
    if (diam && Number(diam) <= 4 && p.id === 'pw-btk') { score += 2; reasons.push('小口径血管'); }
    if (usedTraits.some(t => t.paths?.includes(p.id))) score += 1;
    return { p, score, reasons };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  const topPaths = pathScores.slice(0, 2);

  // 器械打分
  const prods = PRODUCTS.filter(p => p.domain === domain).map(p => {
    let score = 0;
    const why = [];
    const anats = p.anatomy.split(' / ');
    if (anats.some(a => a.includes(anatomy) || anatomy.includes(a))) { score += 3; why.push('解剖部位匹配'); }
    const tagHits = p.tags.filter(t => traitTags.has(t));
    if (tagHits.length) { score += tagHits.length * 2; why.push('特征匹配：' + tagHits.join('、')); }
    if (preferPaths.has(topPaths[0]?.p.id) && getPathways().find(x => x.id === topPaths[0].p.id)?.devices.includes(p.id)) {
      score += 2; why.push('术式标准器械');
    }
    if (p.innovation) score += 0.5;
    return { p, score, why };
  }).filter(x => x.score >= 3).sort((a, b) => b.score - a.score);

  // 保证组合结构：通路 + 主器械 + 辅助
  const picked = [];
  const rolesNeeded = ['通路建立', '预处理 / 扩张', '主器械', '辅助器械', '止血闭合'];
  const domainPool = PRODUCTS.filter(p => p.domain === domain);
  rolesNeeded.forEach(role => {
    let cands = prods.filter(x => ROLE[x.p.category] === role && !picked.some(y => y.p.id === x.p.id));
    if (!cands.length) {
      // 该角色无高分候选时，回落到领域内的基础器械，保证方案可用
      cands = domainPool.filter(p => ROLE[p.category] === role)
        .map(p => ({ p, score: 0, why: ['基础' + (ROLE[p.category] || '器械')] }))
        .sort((a, b) => (b.p.status === '已上市') - (a.p.status === '已上市'))
        .slice(0, 2);
    }
    if (cands.length) picked.push(cands[0]);
    if (role === '通路建立' && cands.length > 1) picked.push(cands[1]);
  });
  // 补充同分项（最多 7 件）
  prods.forEach(x => { if (picked.length < 7 && !picked.some(y => y.p.id === x.p.id) && x.score >= 4) picked.push(x); });

  const risks = [];
  usedTraits.forEach(t => risks.push(t.risk));
  if (topPaths[0]) {
    getPathways().find(p => p.id === topPaths[0].p.id)?.complications.slice(0, 2)
      .forEach(c => risks.push('需重点防范：' + c));
  }
  if (len && Number(len) > 20) risks.push('病变长度 >20 cm：单次治疗失败概率上升，提前准备补救支架与延长球囊。');

  const pref = devicePreference(domain).slice(0, 3)
    .map(x => ({ name: productById(x.id)?.name || x.id, n: x.n }));

  const summary = topPaths.length
    ? `推荐「${topPaths[0].p.name}」，主器械 ${picked.filter(x => ROLE[x.p.category] === '主器械').map(x => x.p.name).join('、') || '见组合'}。`
    : '暂无匹配术式，请调整特征。';

  return { domain, anatomy, usedTraits, topPaths, devices: picked, risks: [...new Set(risks)], pref, summary };
}

function renderResult(r) {
  const groups = {};
  r.devices.forEach(d => { const role = ROLE[d.p.category] || '其他'; (groups[role] = groups[role] || []).push(d); });

  return `
    <div class="divider"></div>
    <div class="row wrap" style="gap:7px;margin-bottom:10px">${domainChip(r.domain)}${chip(r.anatomy)}${r.usedTraits.length ? chip(r.usedTraits.length + ' 项特征', 'soft-amber') : ''}</div>
    <h4 style="font-size:13px;margin-bottom:8px">推荐术式</h4>
    ${r.topPaths.length ? r.topPaths.map((x, i) => `<div class="card" style="box-shadow:none;margin-bottom:8px">
      <div class="card-pad" style="padding:12px 14px">
        <div class="spread"><strong style="font-size:13px">${i === 0 ? '首选 · ' : '备选 · '}${esc(x.p.name)}</strong>${chip('匹配度 ' + Math.min(99, 60 + x.score * 5), i === 0 ? 'soft-teal' : '')}</div>
        <div class="tiny muted" style="margin-top:4px">${esc(x.reasons.join(' / ')) || '解剖与领域匹配'}</div>
        <div class="tiny muted" style="margin-top:4px">标准时长 ${x.p.minutes} 分钟 · ${x.p.devices.length} 类器械 · ${esc(x.p.level)}手术</div>
      </div></div>`).join('') : '<div class="tiny muted">未匹配到术式</div>'}

    <h4 style="font-size:13px;margin:14px 0 8px">建议器械组合（${r.devices.length} 件）</h4>
    ${Object.entries(groups).map(([role, arr]) => `<div style="margin-bottom:10px">
      <div class="tiny" style="color:#0b6f66;font-weight:600;margin-bottom:4px">${role}</div>
      ${arr.map(d => `<div style="padding:7px 0;border-bottom:1px dashed var(--line-2)">
        <div class="spread"><span style="font-size:12.5px;font-weight:500">${esc(d.p.name)}</span><span class="tiny muted">${esc(d.p.category)}</span></div>
        <div class="tiny muted">${esc(d.why.join(' · ')) || esc(d.p.indication)}</div>
      </div>`).join('')}
    </div>`).join('')}

    <h4 style="font-size:13px;margin:14px 0 8px">风险提示</h4>
    <div class="stack" style="gap:6px">
      ${r.risks.length ? r.risks.map(x => `<div class="warn" style="font-size:12px">${esc(x)}</div>`).join('') : '<div class="tiny muted">无额外风险提示</div>'}
    </div>

    ${r.pref.length ? `<h4 style="font-size:13px;margin:14px 0 8px">院内同类病例使用偏好</h4>
      <div class="tiny muted">按本平台现有病例统计：${r.pref.map(p => `${esc(p.name)}（${p.n} 例）`).join('、')}</div>` : ''}

    <div class="row" style="margin-top:16px;gap:8px">
      <button class="btn primary" id="a-save">保存为方案</button>
      <button class="btn" id="a-close">关闭</button>
    </div>`;
}
