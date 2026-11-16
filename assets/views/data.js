import { getCases, getPlans, getUdi, getAuditLog, logAudit, caseFollowStats, pathwayById, centerById, physicianById, productById } from '../store.js';
import { DOMAINS, QUARTERS } from '../data.js';
import { domainChip, chip, esc, toast, sectionTitle, emptyState } from '../ui.js';
import { barRows, progress, lineChart } from '../charts.js';

// 数据分类分级（依据《数据安全法》21 条 + GB/T 39725-2020 + 行业分类分级指南）
const LEVELS = {
  sensitive: { label: '敏感', tone: 'soft-rose', ctrl: '脱敏入库 + 单独同意 + 字段级权限 + 导出审计' },
  important: { label: '重要', tone: 'soft-amber', ctrl: '分级审批可见 + 全程审计留痕' },
  internal: { label: '内部', tone: 'soft-blue', ctrl: '按角色最小必要可见' },
  public: { label: '公开', tone: 'soft-teal', ctrl: '聚合统计后可对外发布' }
};

const DICT = [
  ['病例主键', 'VH-YYYY-####', 'internal', '平台内唯一，跨中心不重复', '内部编码规则'],
  ['患者标识', '姓名首字 + **', 'sensitive', '脱敏后入库，原文仅院内可见；随访/科研/RWE 分项授权', '个人信息保护法最小必要'],
  ['术式编码', 'PW-xx', 'internal', '与术式路径库一一对应', '院内手术分级 + 平台术式库'],
  ['器械标识', '(01)GTIN + 批号', 'important', 'GS1 UDI，入库即赋码，使用绑定病例、可反查召回', '国家药监局 UDI 体系'],
  ['影像', 'DICOM 3.0 / DICOMweb', 'sensitive', 'DSA、CTA、IVUS、OCT 统一归档；元数据去标识化', 'IHE XDS-I.b'],
  ['临床文本', 'HL7 v2.5 / FHIR R4', 'sensitive', '与 HIS、EMR、PACS 双向；跨中心传输走协议管控', '互联互通标准化成熟度'],
  ['诊断与解剖', 'ICD-10 / SNOMED CT', 'sensitive', '支撑多中心语义对齐；科研用途需授权', 'RWE 数据治理'],
  ['结局指标', 'Rutherford / mRS / Raymond / PASS', 'internal', '按领域选择对应量表；聚合后可对外', '学会质控口径']
];

// 合规控制矩阵：义务 → 法规依据 → 平台控制 → 牵头方 → 状态 → 证据入口
// 治理口径：法规适用性判定与义务拆解由法务（含外部顾问）与注册法规（RA）牵头，
// IT/安全负责控制措施落地与证据产生；平台角色是医疗机构数据的受托处理/合作处理方。
const COMPLIANCE_MATRIX = [
  { group: '数据安全基线', items: [
    { duty: '网络安全等级保护', owner: 'IT 安全牵头', basis: '《网络安全法》· 等保 2.0 三级', control: '院内私有化部署按三级建设；云端多中心数据单独评估', status: '已落地', ev: null },
    { duty: '数据分类分级', owner: '法务定级口径 · IT 落地', basis: '《数据安全法》21 条 · 《卫生健康行业数据分类分级指南（试行）》2023', control: '字段级安全等级台账（本页），敏感/重要/内部/公开四级差异化管控', status: '已落地', ev: 'dict' },
    { duty: '数据全生命周期安全管理', owner: '法务 · IT 联合', basis: '《医疗卫生机构数据安全和个人信息保护管理办法（试行）》2026 · 五部门', control: '制度/人员/管理/技术四保障；数据安全年度会议纳入运营日历；对接中心时配合其主体责任', status: '建设中', ev: 'audit' }
  ]},
  { group: '个人信息保护', items: [
    { duty: '敏感个人信息单独同意', owner: '法务牵头（同意文本）· IT 落地（交互）', basis: '《个人信息保护法》28–29 条（医疗健康属敏感个人信息）', control: '病例级分项授权（随访/院内科研/RWE），撤回即停止对应用途；RWE 默认不授权', status: '已落地', ev: 'case' },
    { duty: '去标识化与最小必要', owner: 'IT 牵头（技术）· 法务认可口径', basis: 'GB/T 39725-2020《健康医疗数据安全指南》', control: '患者标识"姓 + **"脱敏入库，导出默认脱敏并写审计', status: '已落地', ev: 'export' },
    { duty: '数据主体权利响应', owner: '法务牵头', basis: '《个人信息保护法》44–47 条', control: '查阅/复制/更正/删除走运营工单，30 日内响应并留痕', status: '建设中', ev: 'audit' },
    { duty: '个人信息保护影响评估（PIA）', owner: '法务牵头评估 · IT 支撑材料', basis: '《个人信息保护法》55 条', control: '新用途/新场景上线前完成 PIA 并归档，处理目的变更重新评估', status: '规划中', ev: null }
  ]},
  { group: '数据流通与科研', items: [
    { duty: '多中心研究伦理与授权', owner: '医学事务牵头 · 法务支持', basis: '《涉及人的生命科学和医学研究伦理审查办法》2023', control: 'RWE 队列须伦理批件 + 中心授权 + 数据使用协议；队列只取完整率 ≥90% 且已授权 RWE 的病例', status: '已落地', ev: 'rwe' },
    { duty: '对外数据合作审批报备', owner: '法务牵头', basis: '《医疗卫生机构对外数据合作管理办法（试行）》（浙江 2026，全国风向标）', control: '共享/委托处理/联合研究/模型训练前：机构内部审批 + 行政部门报备 + 数据安全协议；合作方资质与安全记录审查', status: '建设中', ev: 'rwe' },
    { duty: '数据出境', owner: '法务牵头 · IT 落地', basis: '《数据出境安全评估办法》2022 ·《促进和规范数据跨境流动规定》2024', control: '海外中心数据本地化存储；跨境分析走安全评估，敏感个人信息出境取得单独同意', status: '规划中', ev: null },
    { duty: '匿名化与可信流通', owner: 'IT 牵头 · 法务认可', basis: '《可信数据空间发展行动计划（2024—2028）》· 数据要素×医疗健康试点', control: '聚合统计"原始数据不出域、可用不可见"；对接行业可信数据空间', status: '规划中', ev: null }
  ]},
  { group: '器械合规', items: [
    { duty: 'UDI 唯一标识', owner: '注册法规（RA）牵头', basis: '《医疗器械唯一标识系统规则》2019', control: '入库即赋码，使用登记与病例绑定，可反查批次召回', status: '已落地', ev: 'trace' },
    { duty: '真实世界数据质量', owner: '注册法规（RA）牵头 · 数据团队落地', basis: 'NMPA《真实世界数据用于医疗器械临床评价技术指导原则（试行）》2020', control: '完整率/随访率看板（本页顶部）；数据质量直接决定证据效力', status: '已落地', ev: 'self' },
    { duty: 'SaMD 软件属性边界', owner: '注册法规（RA）牵头', basis: '《医疗器械软件注册审查指导原则》', control: '辅助决策模块按 II/III 类路径注册；纯流程记录模块不纳入医疗器械管理', status: '规划中', ev: null },
    { duty: '合作数据保留与销毁', owner: '法务牵头（DUA 条款）· IT 执行', basis: '《个人信息保护法》19 条（最小必要期限）· 各中心 DUA 约定', control: '病历的法定保存义务（门诊 15 年 / 住院 30 年）在医疗机构；本平台作为受托处理方，按 DUA 约定保留，研究目的达成后按约定销毁或返还，销毁双人复核出具证明并留痕', status: '建设中', ev: null }
  ]}
];

// RWE 队列审批流（演示）：对外数据合作的完整链路
const RWE_STUDY = {
  title: '股腘动脉 DCB 术后一期通畅率多中心真实世界研究',
  no: 'RWE-2026-014',
  centers: 10, target: 240, current: 186,
  criteria: 'Rutherford 2–4 级 · 病变 10–30 cm · 主要终点：术后 12 月一期通畅率',
  steps: [
    { name: '队列定义与样本量计算', status: 'done', date: '2026-09-12', note: '10 中心 · 目标 240 例 · 基于平台 26Q3 数据预估，预估完成时间 2027-Q2' },
    { name: '牵头单位伦理审查批件', status: 'done', date: '2026-10-09', note: '伦审〔2026〕118 号 · 各参与中心伦理互认备案' },
    { name: '中心授权 + 数据使用协议（DUA）', status: 'doing', date: '进行中', note: '已签 8/10 家中心，剩余 2 家走院内审批；协议明确用途边界、访问权限、退出机制' },
    { name: '行政部门报备', status: 'todo', date: '待启动', note: 'DUA 全部签署后向卫生健康行政部门报备合作方案与审批意见' },
    { name: '数据交付（锁定交付集）', status: 'todo', date: '锁定后', note: '仅纳入完整率 ≥90% 且患者已授权 RWE 的病例 · 字段脱敏 · 操作全程审计' }
  ]
};

export function render() {
  const cases = getCases();
  const plans = getPlans();
  const udi = getUdi();
  const auditLog = getAuditLog();

  const fields = [
    { name: '患者基本信息', ok: c => c.patient?.alias && c.patient?.age && c.patient?.sex },
    { name: '治疗领域', ok: c => !!c.domain },
    { name: '术式路径', ok: c => !!c.pathwayId },
    { name: '中心与术者', ok: c => !!c.centerId && !!c.physicianId },
    { name: '术前评估', ok: c => !!c.preop?.key && !!c.preop?.asa },
    { name: '器械使用', ok: c => (c.devices || []).length > 0 },
    { name: '随访节点', ok: c => (c.followups || []).length >= 1 },
    { name: '随访结论', ok: c => (c.followups || []).some(f => f.status === '已完成' && f.note) },
    { name: '器械 UDI 绑定', ok: c => getUdi().some(u => u.caseId === c.id) },
    { name: '结局记录', ok: c => c.outcome && c.outcome !== '待评估' }
  ].map(f => ({
    ...f,
    rate: cases.length ? Math.round(cases.filter(f.ok).length / cases.length * 100) : 0,
    missing: cases.filter(c => !f.ok(c))
  }));

  const overall = Math.round(fields.reduce((s, f) => s + f.rate, 0) / fields.length);

  const rwe = DOMAINS.map(d => {
    const cs = cases.filter(c => c.domain === d.id);
    let t = 0, done = 0;
    cs.forEach(c => { const s = caseFollowStats(c); t += s.total; done += s.done; });
    return { label: d.name, value: t ? Math.round(done / t * 100) : 0, color: d.color };
  });

  const governing = fields.filter(f => f.rate < 100);

  const html = `
  <div class="page">
    <div class="grid g-2-1">
      <div class="card">
        <div class="card-h"><h3>结构化数据完整率</h3><span class="sub">按字段统计 ${cases.length} 例病例</span>
          <div class="right">${chip(`综合 ${overall}%`, overall >= 85 ? 'soft-teal' : 'soft-amber')}</div>
        </div>
        <div class="card-pad">
          ${barRows(fields.map(f => ({ label: f.name, value: f.rate, color: f.rate >= 85 ? '#0d9488' : f.rate >= 60 ? '#b45309' : '#be123c' })), { suffix: '%' })}
          <div class="divider"></div>
          <div class="note">低于 80% 的字段进入治理清单：表单字段（患者信息、术前评估等）在新建病例时设为必填；派生字段（随访结论、UDI 绑定）在病例详情页提示补齐。RWE 队列只取完整率 ≥90% 的记录，避免"有数据不可分析"。</div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>随访完成率（按领域）</h3></div>
        <div class="card-pad">
          ${rwe.map(r => `<div style="margin-bottom:12px">
            <div class="spread" style="margin-bottom:4px"><span style="font-size:12.5px">${r.label}</span><strong style="font-size:12.5px">${r.value}%</strong></div>
            ${progress(r.value, r.color)}
          </div>`).join('')}
          <div class="hint">随访完成率是真实世界数据能否成立的前置条件；低于 70% 的领域暂不进入疗效分析。</div>
        </div>
      </div>
    </div>

    <div class="grid g-2-1" style="margin-top:16px">
      <div class="card">
        <div class="card-h"><h3>数据质量趋势</h3><span class="sub">平台整体结构化完整率 · 近 7 个季度</span>
          <div class="right">${chip(`26Q3 ${QUARTERS[QUARTERS.length - 1].quality}%`, 'soft-teal')}</div>
        </div>
        <div class="card-pad">
          ${lineChart(QUARTERS.map(q => q.quality), { labels: QUARTERS.map(q => q.q) })}
          <div class="hint" style="margin-top:8px">完整率随表单必填项、随访专员配置与 UDI 扫码登记的推广逐季抬升；本页所有治理动作的目标是让下一个季度进入 ≥90% 的 RWE 可用区间。</div>
        </div>
      </div>
      <div class="card" id="sec-audit">
        <div class="card-h"><h3>审计留痕</h3><span class="sub">谁在何时做了什么</span>
          <div class="right">${chip(`${auditLog.length} 条`, 'soft-blue')}</div>
        </div>
        <div class="list" style="max-height:296px;overflow-y:auto">
          ${auditLog.slice(0, 12).map(a => `<div class="list-item" style="cursor:default;align-items:flex-start">
            <span class="chip ${a.action === '导出' ? 'soft-amber' : a.action === '预警' ? 'soft-rose' : a.action === '认证发放' ? 'soft-teal' : 'soft-blue'}" style="flex:none">${esc(a.action)}</span>
            <div class="li-main">
              <div class="li-title" style="font-size:12.5px;font-weight:500">${esc(a.detail)}</div>
              <div class="li-sub" style="white-space:normal">${a.time} · ${esc(a.actor)}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="card-pad" style="border-top:1px solid var(--line-2)">
          <div class="hint">生产环境按等保三级要求落库并支持字段级回溯；本页所有导出、随访登记、UDI 绑定、认证发放都会实时写入这条留痕。</div>
        </div>
      </div>
    </div>

    ${governing.length ? `
    ${sectionTitle('字段治理清单')}
    <div class="card">
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>字段</th><th>完整率</th><th>缺失病例</th><th>建议动作</th></tr></thead>
          <tbody>
            ${governing.map(f => `<tr style="cursor:default">
              <td><span class="cell-main" style="font-weight:600">${esc(f.name)}</span></td>
              <td style="min-width:130px">${progress(f.rate, f.rate >= 85 ? '#0d9488' : f.rate >= 60 ? '#b45309' : '#be123c')}<span class="cell-sub">${f.rate}% · 缺 ${f.missing.length} 例</span></td>
              <td><div class="tag-line">${f.missing.slice(0, 6).map(c => `<a class="chip" data-goto="${c.id}" style="cursor:pointer;background:#f0f5f6;font-family:var(--mono);font-size:11px">${c.id}</a>`).join('')}
                ${f.missing.length > 6 ? `<span class="tiny muted" style="align-self:center">等 ${f.missing.length} 例</span>` : ''}</div></td>
              <td class="tiny muted">${govAdvice(f.name)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    ${sectionTitle('数据资产与导出')}
    <div class="card" id="sec-export">
      <div class="card-h"><h3>可导出的数据资产</h3><span class="sub">CSV 带 UTF-8 BOM，可直接在 Excel 打开</span></div>
      <div class="list">
        <div class="list-item" style="cursor:default">
          <div class="li-main"><div class="li-title">病例主表 + 随访节点</div><div class="li-sub">${cases.length} 例 · ${cases.reduce((s, c) => s + c.followups.length, 0)} 个随访节点</div></div>
          <div class="li-side"><button class="btn sm primary" data-export="cases">导出 CSV</button></div>
        </div>
        <div class="list-item" style="cursor:default">
          <div class="li-main"><div class="li-title">器械使用与 UDI 追溯</div><div class="li-sub">${udi.length} 条 UDI 记录 · 已绑定 ${udi.filter(u => u.caseId).length} 例病例</div></div>
          <div class="li-side"><button class="btn sm" data-export="udi">导出 CSV</button></div>
        </div>
        <div class="list-item" style="cursor:default">
          <div class="li-main"><div class="li-title">已保存的一体化方案</div><div class="li-sub">${plans.length} 份方案 · 由产品矩阵组合生成</div></div>
          <div class="li-side"><button class="btn sm" data-export="plans">导出 JSON</button></div>
        </div>
      </div>
      ${plans.length ? `<div class="card-pad" style="border-top:1px solid var(--line-2)">
        <div class="tiny muted" style="margin-bottom:8px">最近保存的方案</div>
        ${plans.slice(0, 4).map(p => `<div class="row" style="gap:8px;padding:6px 0;border-bottom:1px dashed var(--line-2)">
          <span style="font-size:12.5px;font-weight:600">${esc(p.name)}</span>
          <span class="tiny muted" style="flex:1">${esc(p.note || '')}</span>
          <span class="tiny muted">${p.items.length} 件器械 · ${p.createdAt}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>

    ${sectionTitle('RWE 队列与对外合作审批')}
    <div class="card" id="sec-rwe">
      <div class="card-h"><h3>${esc(RWE_STUDY.title)}</h3>
        <div class="right">${chip(RWE_STUDY.no, 'soft-blue')}${chip(`样本 ${RWE_STUDY.current}/${RWE_STUDY.target}`, 'soft-teal')}</div>
      </div>
      <div class="card-pad">
        <div class="kv" style="margin-bottom:6px">
          <span class="k">纳入标准</span><span>${esc(RWE_STUDY.criteria)}</span>
        </div>
        <div class="timeline" style="margin-top:12px">
          ${RWE_STUDY.steps.map(s => {
            const tone = s.status === 'done' ? 'soft-teal' : s.status === 'doing' ? 'soft-amber' : '';
            const txt = s.status === 'done' ? '已完成' : s.status === 'doing' ? '进行中' : '待启动';
            return `<div class="tl-item ${s.status === 'done' ? 'done' : ''} ${s.status === 'doing' ? 'overdue' : ''}">
              <div class="tl-title">${esc(s.name)} ${chip(txt, tone)}</div>
              <div class="tl-meta">${esc(s.date)}</div>
              <div class="tl-note">${esc(s.note)}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="note" style="margin-top:12px">对外数据合作全链路留痕：队列定义 → 伦理批件 → 中心授权与 DUA → 行政报备 → 锁定交付。交付集只包含完整率 ≥90% 且患者已授权 RWE 的病例，任何环节不满足即暂停交付。生产环境中每一步对应审批工单与批件附件归档。</div>
      </div>
    </div>

    ${sectionTitle('数据字典与分级台账')}
    <div class="card" id="sec-dict">
      <div class="card-h"><h3>核心字段 · 安全分级</h3><span class="sub">《数据安全法》分类分级 + GB/T 39725-2020</span>
        <div class="right">${chip('敏感 4', 'soft-rose')}${chip('重要 1', 'soft-amber')}${chip('内部 3', 'soft-blue')}</div>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>字段</th><th>标准 / 格式</th><th>安全等级</th><th>控制措施</th><th>依据</th></tr></thead>
          <tbody>${DICT.map(([n, s, lv, d, r]) => `<tr style="cursor:default">
            <td><span class="cell-main" style="font-weight:600">${esc(n)}</span></td>
            <td class="tiny" style="font-family:var(--mono)">${esc(s)}</td>
            <td>${chip(LEVELS[lv].label, LEVELS[lv].tone)}</td>
            <td class="tiny muted" style="min-width:220px">${esc(d)}</td>
            <td>${chip(r)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="card-pad" style="border-top:1px solid var(--line-2)">
        <div class="tag-line" style="gap:10px">
          ${Object.values(LEVELS).map(l => `<span class="row" style="gap:6px">${chip(l.label, l.tone)}<span class="tiny muted">${esc(l.ctrl)}</span></span>`).join('')}
        </div>
      </div>
    </div>

    ${sectionTitle('合规控制矩阵')}
    <div class="stack" style="gap:16px" id="sec-matrix">
      ${COMPLIANCE_MATRIX.map(g => `
      <div class="card">
        <div class="card-h"><h3>${esc(g.group)}</h3><span class="sub">${g.items.filter(i => i.status === '已落地').length}/${g.items.length} 项已落地</span></div>
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th style="min-width:150px">合规义务</th><th style="min-width:240px">法规依据</th><th>平台控制措施</th><th>状态</th><th>证据</th></tr></thead>
            <tbody>
              ${g.items.map(it => `<tr style="cursor:default">
                <td><span class="cell-main" style="font-weight:600;font-size:12.5px">${esc(it.duty)}</span>
                  <span class="cell-sub" style="margin-top:2px">${esc(it.owner || '')}</span></td>
                <td class="tiny" style="color:var(--ink-2)">${esc(it.basis)}</td>
                <td class="tiny muted" style="min-width:260px">${esc(it.control)}</td>
                <td>${chip(it.status, it.status === '已落地' ? 'soft-teal' : it.status === '建设中' ? 'soft-amber' : '')}</td>
                <td>${evLink(it.ev)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`).join('')}
      <div class="hint">治理口径：法规适用性判定与义务拆解由<strong>法务（含外部顾问）与注册法规（RA）牵头</strong>，IT/安全负责控制措施落地与证据产生，本矩阵是二者的映射工作产物，生产部署时以法务审核版本为准。角色边界：病历的法定保存义务在医疗机构，本平台作为受托处理/合作处理方，义务来自法律（个保法）与合作中心的数据使用协议（DUA）。2026 年起卫生健康领域进入专项治理周期（网信办等三部门个人信息保护专项治理、14 部门纠正医药购销不正之风要点单列"严守医疗数据安全"），对外演示时此页即"合规怎么落地"的正面材料。</div>
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-export]').forEach(el => el.addEventListener('click', () => doExport(el.dataset.export)));
      root.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => { location.hash = '#/cases/' + el.dataset.goto; }));
      // 合规矩阵证据入口：本页锚点滚动 / 跨页跳转 / 提示
      root.querySelectorAll('[data-ev]').forEach(el => el.addEventListener('click', () => {
        const ev = el.dataset.ev;
        if (ev === 'trace') { location.hash = '#/trace'; return; }
        if (ev === 'case') { toast('患者授权在病例详情顶部：随访 / 院内科研 / RWE 分项可切换'); location.hash = '#/cases'; return; }
        const target = { audit: '#sec-audit', dict: '#sec-dict', rwe: '#sec-rwe', export: '#sec-export', self: null }[ev];
        if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    }
  };
}

// 证据入口按钮：无证据的不渲染
function evLink(ev) {
  const map = {
    audit: '审计留痕', dict: '分级台账', rwe: '审批流', export: '导出脱敏',
    trace: '器械追溯', case: '病例授权', self: '本页看板'
  };
  if (!ev || !map[ev]) return '<span class="tiny muted">—</span>';
  return `<button class="btn sm ghost" data-ev="${ev}" style="padding:3px 9px;font-size:11.5px">${map[ev]}</button>`;
}

// 字段治理建议：表单字段靠必填约束，派生字段靠流程提示
function govAdvice(name) {
  if (name === '器械 UDI 绑定') return '在器械追溯页扫码登记，或在病例详情器械行补绑 UDI';
  if (name === '随访结论') return '随访节点完成后自动回填；逾期节点优先在风险待办处理';
  if (name === '结局记录') return '在病例详情"当前结局"补录，或等末次随访后自动生成';
  return '新建病例时该字段已设为必填，历史病例在详情页补齐';
}

function download(filename, content, mime) {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}

function csvCell(v) {
  const s = String(v ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

function doExport(kind) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === 'cases') {
    const rows = [['病例号', '患者标识', '年龄', '性别', '领域', '术式', '中心', '术者', '手术日期', 'ASA', '术前评估', '器械数', '随访节点', '随访完成', '随访逾期', '状态', '结局']];
    getCases().forEach(c => {
      const s = caseFollowStats(c);
      rows.push([c.id, c.patient.alias, c.patient.age, c.patient.sex,
        DOMAINS.find(d => d.id === c.domain)?.name, pathwayById(c.pathwayId)?.name,
        centerById(c.centerId)?.name, physicianById(c.physicianId)?.name, c.date, c.preop.asa,
        c.preop.key, c.devices.length, s.total, s.done, s.overdue, c.status, c.outcome]);
    });
    download(`VascHub_病例主表_${stamp}.csv`, rows.map(r => r.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    logAudit('导出', `病例主表 CSV（${getCases().length} 例，患者标识脱敏）`);
    toast('已导出病例主表 CSV');
  } else if (kind === 'udi') {
    const rows = [['UDI', '产品', '领域', '批号', '有效期', '中心', '状态', '绑定病例']];
    getUdi().forEach(u => {
      const p = productById(u.productId);
      rows.push([u.udi, p?.name || '', DOMAINS.find(d => d.id === p?.domain)?.name || '', u.lot, u.expiry,
        centerById(u.centerId)?.name || '', u.status, u.caseId || '']);
    });
    download(`VascHub_器械追溯_${stamp}.csv`, rows.map(r => r.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    logAudit('导出', `器械追溯 CSV（${getUdi().length} 条 UDI）`);
    toast('已导出器械追溯 CSV');
  } else {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), plans: getPlans() }, null, 2);
    download(`VascHub_方案_${stamp}.json`, payload, 'application/json');
    toast('已导出方案 JSON');
  }
}
