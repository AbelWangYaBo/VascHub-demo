// 状态与持久化层：所有写操作都落到 localStorage，刷新后保留
import { CASES, COURSES, UDI_RECORDS, PATHWAYS, PRODUCTS, CENTERS, PHYSICIANS, IDENTITIES } from './data.js';

const KEY = 'vaschub.store.v1';
const TODAY = '2026-11-16';
// 演示数据版本：升级后首次打开自动重新播种，保证演示效果完整（点"重置演示数据"也可手动回到该版本）
const SEED_VERSION = 4;

// 患者授权（敏感个人信息单独同意）：随访 / 院内科研 / 真实世界研究（RWE）分项授权，可撤回。
// 默认仅随访 + 科研；RWE 属于对外流通用途，必须单独取得，演示数据里部分病例未授权。
const CONSENT_DEFAULT = { followup: true, research: true, rwe: false };
const CONSENT_OVERRIDES = {
  'VH-2601': { rwe: true }, 'VH-2602': { rwe: true }, 'VH-2604': { rwe: true },
  'VH-2605': { rwe: true }, 'VH-2606': { rwe: true }, 'VH-2608': { rwe: true },
  'VH-2609': { rwe: true }, 'VH-2611': { rwe: true }, 'VH-2612': { rwe: true },
  'VH-2613': { rwe: true },
  // VH-2603 仅同意随访与院内科研；VH-2607、VH-2610、VH-2614 仅随访（默认值即如此）
  'VH-2607': { research: false },
  'VH-2610': { research: false },
  'VH-2614': { research: false }
};

const seed = () => ({
  seedVersion: SEED_VERSION,
  identityId: 'id-wu',
  cases: JSON.parse(JSON.stringify(CASES)).map(c => ({
    ...c,
    consents: { ...CONSENT_DEFAULT, ...(CONSENT_OVERRIDES[c.id] || {}) },
    followups: c.followups.map(f => ({ ...f }))
  })),
  plans: [
    {
      id: 'PL-261101', name: '股腘动脉长段钙化 · 减容 + DCB 组合', createdAt: '2026-11-01',
      note: 'Rutherford 3 级，病变 24 cm，中重度钙化；先定向减容再 DCB，残余狭窄 >30% 时补救支架',
      items: ['p-pantheris', 'p-ultrafree', 'p-panflex', 'p-beidou', 'p-unicorn'], domains: ['peripheral']
    },
    {
      id: 'PL-261108', name: '急性 DVT 一站式清栓方案', createdAt: '2026-11-08',
      note: '髂股静脉急性血栓，大腔抽吸 + 滤器保护 + 髂静脉支架预备',
      items: ['p-mammoth', 'p-octoplus', 'p-penguin', 'p-zenflow'], domains: ['peripheral']
    }
  ],
  enrollments: [
    // 吴桐：神经学习期，课程晋升 1/3
    { identityId: 'id-wu', courseId: 'co-01', status: '已完成', progress: 100, enrolledAt: '2026-09-02', doneModules: [0, 1, 2, 3], certified: 'CERT-2026-0112' },
    { identityId: 'id-wu', courseId: 'co-02', status: '学习中', progress: 50, enrolledAt: '2026-10-11', doneModules: [0, 1] },
    { identityId: 'id-wu', courseId: 'co-03', status: '已报名', progress: 0, enrolledAt: '2026-11-08', doneModules: [] },
    // 李维：主动脉独立术者（已认证高阶课），外周学习期
    { identityId: 'id-li', courseId: 'co-03', status: '已完成', progress: 100, enrolledAt: '2026-08-15', doneModules: [0, 1, 2, 3], certified: 'CERT-2026-0821' },
    // 张明远：带教导师，持续教育
    { identityId: 'id-zhang', courseId: 'co-05', status: '已完成', progress: 100, enrolledAt: '2026-07-20', doneModules: [0, 1, 2, 3], certified: 'CERT-2026-0729' },
    // 秦岚：销售，外周产品线熟悉（产品课已认证），结构性心脏病切入学习中
    { identityId: 'id-qin', courseId: 'co-08', status: '已完成', progress: 100, enrolledAt: '2026-06-10', doneModules: [0, 1, 2, 3], certified: 'CERT-2026-0618' },
    { identityId: 'id-qin', courseId: 'co-05', status: '学习中', progress: 25, enrolledAt: '2026-11-02', doneModules: [0] }
  ],
  certifications: [
    { no: 'CERT-2026-0112', identityId: 'id-wu', courseId: 'co-01', courseTitle: '急性缺血性卒中取栓：首过效应与策略切换',
      hours: 3, cme: '国家级 I 类 3 分', date: '2026-09-18', holder: '吴桐 · 江城医院（学习期术者）' },
    { no: 'CERT-2026-0821', identityId: 'id-li', courseId: 'co-03', courseTitle: '胸腹主动脉分支重建：G-Branch 标准化流程',
      hours: 6, cme: '国家级 I 类 6 分', date: '2026-08-21', holder: '李维 · 华东中心医院（独立术者）' },
    { no: 'CERT-2026-0729', identityId: 'id-zhang', courseId: 'co-05', courseTitle: '左心耳封堵：心耳分型与 PASS 标准',
      hours: 2, cme: '国家级 I 类 2 分', date: '2026-07-29', holder: '张明远 · 北辰医院（带教导师）' },
    { no: 'CERT-2026-0618', identityId: 'id-qin', courseId: 'co-08', courseTitle: '临床支持工程师认证：全血管产品矩阵',
      hours: 4, cme: '内部认证', date: '2026-06-18', holder: '秦岚 · VascHub 商务团队（销售）' }
  ],
  udi: JSON.parse(JSON.stringify(UDI_RECORDS)),
  // 平台内自建术式（演示"术式库可运营"）：与静态术式库合并对外提供
  pathways: [],
  auditLog: [
    { time: '2026-11-16 09:12', actor: '顾** · 平台运营', action: '查看', detail: '病例主表 · 按"外周血管"筛选' },
    { time: '2026-11-15 16:40', actor: '徐清 · 长安医院', action: '随访登记', detail: 'VH-2607 · 术后 1 月 · 通路流量稳定' },
    { time: '2026-11-15 10:05', actor: '秦岚 · VascHub 商务团队', action: '导出', detail: '器械追溯 CSV（18 条 UDI，含效期）' },
    { time: '2026-11-14 16:40', actor: '陈叙 · 天府介入中心', action: 'UDI 登记', detail: '蛟龙取栓支架 JL261028 绑定 VH-2608' },
    { time: '2026-11-12 11:26', actor: '吴桐 · 江城医院', action: '报名课程', detail: '胸腹主动脉分支重建：G-Branch 标准化流程' },
    { time: '2026-11-10 18:03', actor: '李维 · 华东中心医院', action: '新建病例', detail: 'VH-2613 · 弓部三分支重建' },
    { time: '2026-11-08 09:47', actor: '顾** · 平台运营', action: '保存方案', detail: '急性 DVT 一站式清栓方案（4 件器械）' },
    { time: '2026-11-06 14:22', actor: '系统', action: '预警', detail: 'VH-2607 术后 1 月随访逾期，推送至风险待办' }
  ],
  seededAt: new Date().toISOString()
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw);
    // 演示数据版本变化时重新播种，保证各页面都有完整演示内容
    if (parsed.seedVersion !== SEED_VERSION) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    // 只补齐缺失集合，绝不覆盖用户记录
    if (!Array.isArray(parsed.cases)) parsed.cases = seed().cases;
    if (!Array.isArray(parsed.plans)) parsed.plans = [];
    if (!Array.isArray(parsed.enrollments)) parsed.enrollments = [];
    if (!Array.isArray(parsed.certifications)) parsed.certifications = [];
    if (!Array.isArray(parsed.auditLog)) parsed.auditLog = [];
    if (!Array.isArray(parsed.udi)) parsed.udi = seed().udi;
    if (!Array.isArray(parsed.pathways)) parsed.pathways = [];
    if (!IDENTITIES.find(i => i.id === parsed.identityId)) parsed.identityId = 'id-wu';
    return parsed;
  } catch (e) {
    console.warn('读取本地数据失败，使用初始数据', e);
    return seed();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn(e); }
}

export function resetAll() {
  localStorage.removeItem(KEY);
  state = load();
}

// ---------- 查询 ----------
export const getCases = () => state.cases;
export const getPlans = () => state.plans;
export const getUdi = () => state.udi;
export const getAuditLog = () => state.auditLog;

// ---------- 演示身份 ----------
// 身份决定培训档案、审计留痕的归属；层级按领域独立（学习期/独立术者/带教导师，
// 销售身份为产品熟悉度：熟悉/学习中）
export function currentIdentity() { return IDENTITIES.find(i => i.id === state.identityId) || IDENTITIES[0]; }
export function setIdentity(id) {
  if (!IDENTITIES.find(i => i.id === id)) return;
  state.identityId = id;
  save();
}
export const listIdentities = () => IDENTITIES;

// 报名 / 认证按身份隔离
export const getEnrollments = (identityId = state.identityId) =>
  state.enrollments.filter(e => (e.identityId || 'id-wu') === identityId);
export const getCertifications = (identityId = state.identityId) =>
  state.certifications.filter(c => (c.identityId || 'id-wu') === identityId);
// 全平台口径（运营视角）
export const getAllEnrollments = () => state.enrollments;
export const getAllCertifications = () => state.certifications;

// 审计留痕：默认取当前演示身份，生产环境替换为登录身份
export function logAudit(action, detail, actor) {
  const me = currentIdentity();
  const who = actor || `${me.name} · ${me.org}`;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
  state.auditLog.unshift({ time: `${TODAY} ${hh}:${mm}`, actor: who, action, detail });
  if (state.auditLog.length > 60) state.auditLog.length = 60;
  save();
}

export const productById = id => PRODUCTS.find(p => p.id === id);
// 术式库唯一出口：自建术式在前（最新运营内容先看到），静态标准库在后
export const getPathways = () => [...state.pathways, ...PATHWAYS];
export const pathwayById = id => getPathways().find(p => p.id === id);
export const centerById = id => CENTERS.find(c => c.id === id);
export const physicianById = id => PHYSICIANS.find(d => d.id === id);
export const courseById = id => COURSES.find(c => c.id === id);

export function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

// 随访状态派生：计划日期已过且未完成 => 逾期
export function followStatus(f, today = TODAY) {
  if (f.status === '已完成') return '已完成';
  const overdue = daysBetween(f.plan, today);
  if (overdue > 0) return f.status === '逾期未随访' ? '逾期未随访' : '待随访';
  return f.status || '待随访';
}

export function isOverdue(f, today = TODAY) {
  return f.status !== '已完成' && daysBetween(f.plan, today) > 0;
}

export function caseFollowStats(c, today = TODAY) {
  const total = c.followups.length;
  const done = c.followups.filter(f => f.status === '已完成').length;
  const overdue = c.followups.filter(f => isOverdue(f, today)).length;
  return { total, done, overdue, rate: total ? Math.round((done / total) * 100) : 0 };
}

// ---------- 写入 ----------
export function nextCaseId() {
  const nums = state.cases.map(c => parseInt(String(c.id).replace(/[^\d]/g, ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 2600;
  return 'VH-' + String(max + 1).padStart(4, '0');
}

export function addCase(payload) {
  const record = {
    id: nextCaseId(),
    patient: payload.patient,
    domain: payload.domain,
    pathwayId: payload.pathwayId,
    centerId: payload.centerId,
    physicianId: payload.physicianId,
    date: payload.date,
    status: '术后早期',
    preop: payload.preop,
    devices: payload.devices || [],
    consents: { ...CONSENT_DEFAULT },
    followups: payload.followups || [
      { label: '术后 30 天', plan: plusDays(payload.date, 30), status: '待随访', note: '' },
      { label: '术后 6 月', plan: plusDays(payload.date, 182), status: '待随访', note: '' }
    ],
    outcome: payload.outcome || '待评估',
    createdAt: new Date().toISOString()
  };
  state.cases.unshift(record);
  save();
  logAudit('新建病例', `${record.id} · ${pathwayById(record.pathwayId)?.name || ''}`);
  return record;
}

export function plusDays(date, n) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function completeFollowup(caseId, index, note) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c || !c.followups[index]) return null;
  const f = c.followups[index];
  f.status = '已完成';
  f.note = note || f.note || '随访完成，指标稳定';
  f.doneAt = TODAY;
  const allDone = c.followups.every(x => x.status === '已完成');
  c.status = allDone ? '已随访' : '随访中';
  save();
  logAudit('随访登记', `${caseId} · ${f.label}`);
  return f;
}

export function addFollowupPoint(caseId, label, plan) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return null;
  c.followups.push({ label, plan, status: '待随访', note: '' });
  save();
  logAudit('新增随访节点', `${caseId} · ${label}（计划 ${plan}）`);
  return c.followups[c.followups.length - 1];
}

// 患者授权切换：撤回即停止对应用途使用该病例数据（RWE 队列随即排除）
export function toggleConsent(caseId, key) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c || !['followup', 'research', 'rwe'].includes(key)) return null;
  c.consents = c.consents || { ...CONSENT_DEFAULT };
  c.consents[key] = !c.consents[key];
  save();
  const label = { followup: '随访', research: '院内科研', rwe: '真实世界研究' }[key];
  logAudit('授权变更', `${caseId} · ${label} → ${c.consents[key] ? '已授权' : '已撤回'}`);
  return c.consents;
}

// 新增术式：进入平台术式库，立即可用于建病例与方案助手推荐
export function addPathway(payload) {
  const rec = {
    id: 'pw-c' + (state.pathways.length + 1),
    custom: true,
    name: payload.name,
    domain: payload.domain,
    level: payload.level,
    minutes: payload.minutes || 60,
    indication: payload.indication,
    steps: payload.steps,
    devices: payload.devices || [],
    metrics: payload.metrics || [],
    complications: payload.complications || [],
    tip: payload.tip || '自建术式：质控口径与术者经验持续维护中。',
    createdAt: TODAY
  };
  state.pathways.unshift(rec);
  save();
  logAudit('新增术式', `${rec.name}（${rec.steps.length} 步 · ${rec.devices.length} 类器械）`);
  return rec;
}

export function savePlan(plan) {
  const p = { ...plan, id: 'PL-' + Date.now().toString().slice(-6), createdAt: TODAY };
  state.plans.unshift(p);
  save();
  logAudit('保存方案', `${p.name}（${p.items.length} 件器械）`);
  return p;
}

export function enroll(courseId) {
  const identityId = state.identityId;
  const exists = state.enrollments.find(e => (e.identityId || 'id-wu') === identityId && e.courseId === courseId);
  if (exists) return exists;
  const e = { identityId, courseId, status: '已报名', progress: 0, enrolledAt: TODAY, doneModules: [] };
  state.enrollments.push(e);
  save();
  logAudit('报名课程', courseById(courseId)?.title || courseId);
  return e;
}

export function updateEnrollment(courseId, patch) {
  const e = state.enrollments.find(x => (x.identityId || 'id-wu') === state.identityId && x.courseId === courseId);
  if (!e) return null;
  Object.assign(e, patch);
  save();
  return e;
}

// 模块化学习：勾选/取消模块后重算进度与状态
export function toggleModule(courseId, moduleIndex) {
  const e = state.enrollments.find(x => (x.identityId || 'id-wu') === state.identityId && x.courseId === courseId);
  const course = courseById(courseId);
  if (!e || !course) return null;
  const done = new Set(e.doneModules || []);
  done.has(moduleIndex) ? done.delete(moduleIndex) : done.add(moduleIndex);
  e.doneModules = [...done].sort((a, b) => a - b);
  e.progress = Math.round(e.doneModules.length / course.modules.length * 100);
  e.status = e.progress >= 100 ? '已完成' : e.doneModules.length ? '学习中' : '已报名';
  save();
  return e;
}

// 完成课程后申请认证学时，生成认证记录（归属当前身份）
export function addCertification(courseId) {
  const course = courseById(courseId);
  const e = state.enrollments.find(x => (x.identityId || 'id-wu') === state.identityId && x.courseId === courseId);
  if (!course || !e || e.progress < 100 || e.certified) return null;
  const me = currentIdentity();
  const hours = parseFloat(course.duration) || 0;
  const no = 'CERT-' + TODAY.replace(/-/g, '').slice(2) + '-' + String(state.certifications.length + 1).padStart(4, '0');
  const rec = { no, identityId: me.id, courseId, courseTitle: course.title, hours, cme: course.cme, date: TODAY, holder: `${me.name} · ${me.org}（${me.role}）` };
  state.certifications.unshift(rec);
  e.certified = no;
  save();
  logAudit('认证发放', `${no} · ${course.title} · ${course.duration}`);
  return rec;
}

export function useUdi(recordId, caseId) {
  const r = state.udi.find(u => u.id === recordId);
  if (!r) return null;
  r.status = '已使用';
  r.caseId = caseId;
  save();
  logAudit('UDI 登记', `${productById(r.productId)?.name || r.productId} 批号 ${r.lot} 绑定 ${caseId}`);
  return r;
}

// ---------- 聚合指标 ----------
export function overview() {
  const cases = state.cases;
  const total = cases.length;
  const byDomain = {};
  cases.forEach(c => { byDomain[c.domain] = (byDomain[c.domain] || 0) + 1; });

  let fuTotal = 0, fuDone = 0, overdue = 0;
  cases.forEach(c => {
    const s = caseFollowStats(c);
    fuTotal += s.total; fuDone += s.done; overdue += s.overdue;
  });

  const deviceCount = new Map();
  cases.forEach(c => (c.devices || []).forEach(d => deviceCount.set(d, (deviceCount.get(d) || 0) + 1)));
  const topProducts = [...deviceCount.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => ({ product: productById(id), count: n }));

  const activeCenters = new Set(cases.map(c => c.centerId)).size;
  const activePhysicians = new Set(cases.map(c => c.physicianId)).size;
  const followRate = fuTotal ? Math.round((fuDone / fuTotal) * 100) : 0;
  const domainCoverage = Object.keys(byDomain).length;

  return { total, byDomain, fuTotal, fuDone, overdue, followRate, topProducts, activeCenters, activePhysicians, domainCoverage };
}

export function alerts() {
  const out = [];
  state.cases.forEach(c => {
    c.followups.forEach((f, i) => {
      if (isOverdue(f)) {
        out.push({
          type: 'follow', severity: 'high',
          title: `${c.patient.alias} ${f.label}逾期 ${daysBetween(f.plan, TODAY)} 天`,
          meta: `${centerById(c.centerId)?.name || ''} · ${c.id} · 病例随访`,
          caseId: c.id, index: i
        });
      }
    });
  });
  state.udi.forEach(u => {
    if (u.status === '临期' || u.status === '在库') {
      const d = daysBetween(TODAY, u.expiry);
      if (d >= 0 && d <= 180) {
        out.push({
          type: 'udi', severity: d <= 90 ? 'high' : 'mid',
          title: `${productById(u.productId)?.name || u.productId} 批号 ${u.lot} 将在 ${d} 天后到期`,
          meta: `${centerById(u.centerId)?.name || ''} · UDI 效期`,
          udiId: u.id
        });
      }
    }
  });
  const unbound = state.cases.filter(c => (c.devices || []).some(d => !state.udi.some(u => u.caseId === c.id && u.productId === d)));
  if (unbound.length) {
    out.push({
      type: 'udi-reg', severity: 'mid',
      title: `${unbound.length} 例病例器械已使用但未登记 UDI`,
      meta: `器械追溯 · 含 ${unbound.slice(0, 3).map(c => c.id).join('、')} 等`,
      link: '#/trace'
    });
  }
  const idle = CENTERS.filter(ct => !state.cases.some(c => c.centerId === ct.id && daysBetween(c.date, TODAY) <= 90));
  if (idle.length) {
    out.push({
      type: 'center', severity: 'low',
      title: `${idle.length} 家合作中心近 90 天无病例`,
      meta: `${idle.slice(0, 3).map(ct => ct.name).join('、')} · 中心运营`,
      link: '#/centers'
    });
  }
  const dueSoon = [];
  state.cases.forEach(c => c.followups.forEach((f, i) => {
    if (f.status === '待随访') {
      const d = daysBetween(TODAY, f.plan);
      if (d >= 0 && d <= 14) dueSoon.push({ c, f, i, d });
    }
  }));
  if (dueSoon.length) {
    out.push({
      type: 'follow-due', severity: 'low',
      title: `${dueSoon.length} 个随访节点将在 14 天内到期`,
      meta: `${dueSoon.slice(0, 2).map(x => `${x.c.patient.alias} ${x.f.label}（${x.f.plan}）`).join('、')}${dueSoon.length > 2 ? ' 等' : ''}`,
      link: '#/cases'
    });
  }
  const weekCases = state.cases.filter(c => daysBetween(c.date, TODAY) <= 7).length;
  if (weekCases >= 3) {
    out.push({ type: 'ops', severity: 'low', title: `本周新增 ${weekCases} 例病例待结构化归档`, meta: '病例中心 · 数据治理' });
  }
  return out.sort((a, b) => (a.severity === 'high' ? -1 : 1) - (b.severity === 'high' ? -1 : 1));
}

// 供"方案助手"使用的院内器械使用偏好（真实由当前数据统计得到）
export function devicePreference(domain) {
  const map = new Map();
  state.cases.filter(c => c.domain === domain).forEach(c => (c.devices || []).forEach(d => map.set(d, (map.get(d) || 0) + 1)));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
}

export { TODAY };
