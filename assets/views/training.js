import { COURSES, DOMAINS } from '../data.js';
import { currentIdentity, getEnrollments, getCertifications, getAllEnrollments, getAllCertifications, enroll, toggleModule, addCertification } from '../store.js';
import { domainChip, chip, esc, toast, ICONS, sectionTitle, openDrawer, closeDrawer, openModal, closeModal } from '../ui.js';
import { progress } from '../charts.js';

let filter = 'all';

const LADDER = [
  { level: '学习期', color: '#b45309', req: ['完成 3 门基础课程', '在带教导师监督下完成 ≥10 例', '掌握器械准备与并发症上报流程'], next: '可独立完成二级术式' },
  { level: '独立术者', color: '#2563eb', req: ['独立完成 ≥30 例本领域术式', '并发症率低于平台均值', '完成 1 次病例复盘分享'], next: '可申请带教导师认证' },
  { level: '带教导师', color: '#0d9488', req: ['独立完成 ≥100 例，覆盖 ≥3 类术式', '带教 ≥3 名学习期术者', '通过平台术式标准化考核'], next: '可承接新术式首批应用' }
];

const LEVEL_TONE = { '带教导师': 'soft-teal', '独立术者': 'soft-blue', '学习期': 'soft-amber', '熟悉': 'soft-teal', '学习中': 'soft-amber', '未开展': '' };

// 领域层级矩阵：术者是"学习期/独立术者/带教导师"，销售是"熟悉/学习中"，按领域各自独立
function domainLevelBlock(me) {
  const isSales = me.role === '销售';
  const label = isSales ? '产品线熟悉度' : '领域术者层级';
  return `
    <div style="min-width:260px">
      <div class="tiny muted" style="margin-bottom:7px">${label}（按领域各自独立，可在顶栏切换身份查看差异）</div>
      <div class="tag-line" style="gap:7px">
        ${DOMAINS.map(d => {
          const lv = me.domainLevels[d.id];
          return `<span class="chip" style="background:${d.color}10;border-color:${d.color}25;color:var(--ink-2)">
            <span class="dot" style="background:${d.color}"></span>${d.short}
            <b style="color:${lv ? (LEVEL_TONE[lv] === 'soft-teal' ? '#0b6f66' : LEVEL_TONE[lv] === 'soft-blue' ? '#1d4ed8' : '#92400e') : '#8aa0a6'};font-weight:600">${lv || '未开展'}</b></span>`;
        }).join('')}
      </div>
      <div class="tiny muted" style="margin-top:7px">${esc(me.desc || '')}</div>
    </div>`;
}

export function render() {
  const me = currentIdentity();
  const enr = getEnrollments();
  const certs = getCertifications();
  const list = filter === 'all' ? COURSES : COURSES.filter(c => c.domain === filter);

  const doneCount = enr.filter(e => e.progress >= 100).length;
  const learningCount = enr.filter(e => e.progress > 0 && e.progress < 100).length;
  const totalHours = certs.reduce((s, c) => s + (c.hours || 0), 0);
  const isOperator = me.role === '平台运营';
  const learnerDomains = Object.entries(me.domainLevels).filter(([, v]) => v === '学习期' || v === '学习中');

  // 运营身份看全局；其他身份看自己
  const showStats = isOperator
    ? `<div class="si"><b>${getAllEnrollments().length}</b><span>全平台报名人次</span></div>
       <div class="si"><b>${getAllCertifications().length}</b><span>全平台认证</span></div>
       <div class="si"><b>${COURSES.length}</b><span>在运营课程</span></div>`
    : `<div class="si"><b>${enr.length}</b><span>已报名课程</span></div>
       <div class="si"><b style="color:#b45309">${learningCount}</b><span>学习中</span></div>
       <div class="si"><b style="color:#0d9488">${doneCount}</b><span>已完成</span></div>
       <div class="si"><b>${totalHours}</b><span>累计认证学时</span></div>`;

  // 晋升条只对"含学习期/学习中领域"的身份显示（学习期晋升是课程维度）
  const progressBlock = !isOperator && learnerDomains.length
    ? (() => {
        const need = 3;
        const pct = Math.min(doneCount / need * 100, 100);
        const domainTxt = learnerDomains.map(([id]) => DOMAINS.find(d => d.id === id)?.short).join('、');
        return `<div style="flex:1;min-width:300px;max-width:460px">
          <div class="spread" style="margin-bottom:5px"><span class="tiny muted">学习期晋升（课程维度 · ${domainTxt}）· 要求 ${need} 门</span><span class="tiny" style="color:#0b6f66">${doneCount >= need ? '已达成' : '进行中'}</span></div>
          ${progress(pct, '#b45309')}
          <div class="tiny muted" style="margin-top:6px">已完成 ${doneCount} / ${need} 门课程${doneCount >= need ? '，可发起独立术者评估（还需带教监督下 10 例手术记录）' : `，还差 ${need - doneCount} 门；课程学习与带教手术并行推进。`}</div>
        </div>`;
      })()
    : `<div class="tiny muted" style="flex:1;min-width:260px;align-self:center">${isOperator
        ? '运营视角：课程与认证数据按全平台汇总，用于讲师排期与课程运营决策。'
        : '当前无学习期领域，课程学习计入持续教育学分，不影响术者层级。'}</div>`;

  const html = `
  <div class="page">
    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h3>我的学习档案</h3><span class="sub">演示身份：${esc(me.name)} · ${esc(me.org)}</span>
        <div class="right">${chip(`认证 ${certs.length} 项`, 'soft-teal')}</div>
      </div>
      <div class="card-pad">
        <div class="row wrap" style="gap:18px">
          ${domainLevelBlock(me)}
          <div style="flex:1;min-width:320px">
            <div class="stat-inline" style="justify-content:flex-start;gap:26px;flex-wrap:wrap">
              ${showStats}
            </div>
            <div style="height:10px"></div>
            ${progressBlock}
          </div>
        </div>
      </div>
    </div>

    ${me.role === '销售' ? `
    <div class="card card-pad" style="margin-bottom:16px;border-color:#f5dbe1;background:#fffafa">
      <div class="row" style="gap:8px;margin-bottom:8px">
        <span class="dot" style="background:#be123c"></span>
        <strong style="font-size:13.5px;color:#9f1239">数据使用红线（销售身份必读）</strong>
        <span class="tiny muted" style="margin-left:auto">14 部门 2026 年纠正医药购销不正之风工作要点 · "严守医疗数据安全"单列</span>
      </div>
      <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.9">
        <li><b>只见聚合，不见患者</b>：销售视角仅开放中心级 / 术式级统计数据，患者级数据（哪怕已脱敏）一律不可见、不可导出。</li>
        <li><b>病例用途三问</b>：这份病例数据用途是否已告知患者并取得对应授权？是否经中心审批？操作是否可审计？三问有一个"否"就不碰。</li>
        <li><b>严禁"科研名义"变相利益输送</b>：2026 年专项整治重点指向借第三方科研合作名义的带金销售；RWE 队列参与只走伦理批件 + DUA + 报备的正规链路。</li>
        <li><b>学习痕迹即合规证据</b>：本页产品课程学习与认证记录，是对外数据合作方资质审查（安全记录、合规能力）的一部分——学完的课程就是你的准入资产。</li>
      </ul>
    </div>` : ''}

    ${me.role === '术者' ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h3>术者成长路径</h3><span class="sub">平台认证与带教体系</span></div>
      <div class="card-pad">
        <div class="grid g-3">
          ${LADDER.map((l, i) => {
            const mine = Object.values(me.domainLevels).includes(l.level);
            return `<div style="border:1px solid ${mine ? '#f3d3da' : 'var(--line)'};border-radius:12px;padding:14px 16px;position:relative${mine ? ';background:#fffdfa' : ''}">
              <div class="row" style="gap:8px"><span style="width:22px;height:22px;border-radius:50%;background:${l.color}18;color:${l.color};display:grid;place-items:center;font-size:11px;font-weight:600">${i + 1}</span>
                <strong style="font-size:13px;color:${l.color}">${l.level}</strong>${mine ? chip('我的层级', 'soft-amber') : ''}</div>
              <ul style="margin:9px 0 0;padding-left:16px;font-size:12px;color:var(--ink-2);line-height:1.85">
                ${l.req.map(r => `<li>${esc(r)}</li>`).join('')}
              </ul>
              <div class="tiny muted" style="margin-top:8px">→ ${esc(l.next)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="filters">
        <span class="tiny muted">领域</span>
        <button class="filter-chip ${filter === 'all' ? 'on' : ''}" data-f="all">全部</button>
        ${DOMAINS.map(d => `<button class="filter-chip ${filter === d.id ? 'on' : ''}" data-f="${d.id}"
          style="${filter === d.id ? `background:${d.color};border-color:${d.color}` : ''}">${d.short}</button>`).join('')}
        <span class="tiny muted" style="margin-left:auto">${list.length} 门课程 · 点击卡片查看大纲与学习进度</span>
      </div>
      <div class="card-pad">
        <div class="grid g-2">
          ${list.map(c => courseCard(c, enr)).join('')}
        </div>
      </div>
    </div>

    ${sectionTitle('我的认证记录')}
    <div class="card">
      ${certs.length ? `<div class="table-wrap">
        <table class="tbl">
          <thead><tr><th>认证编号</th><th>课程</th><th>学时 / 学分</th><th>持有人</th><th>发放日期</th></tr></thead>
          <tbody>
            ${certs.map(ct => `<tr style="cursor:default">
              <td><span class="cell-main" style="font-family:var(--mono);font-size:12px">${esc(ct.no)}</span></td>
              <td><span class="cell-main" style="font-size:12.5px">${esc(ct.courseTitle)}</span></td>
              <td>${ct.hours} 学时 · <span class="tiny muted">${esc(ct.cme)}</span></td>
              <td class="tiny">${esc(ct.holder)}</td>
              <td class="tiny">${ct.date}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty"><strong>还没有认证记录</strong>完成任意课程后可在课程详情中申请认证学时</div>`}
    </div>
  </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll('[data-f]').forEach(el => el.addEventListener('click', () => {
        filter = el.dataset.f; rerender();
      }));
      root.querySelectorAll('[data-course]').forEach(el => el.addEventListener('click', () => openCourse(el.dataset.course)));
    }
  };
}

function rerender() {
  const app = document.getElementById('view');
  const res = render();
  app.innerHTML = res.html;
  res.mount(app);
}

function courseCard(c, enr) {
  const e = enr.find(x => x.courseId === c.id);
  const pct = e ? e.progress : Math.round((c.enrolled / c.capacity) * 100);
  return `<div class="card" data-course="${c.id}" style="box-shadow:none;border-color:var(--line);cursor:pointer;transition:.15s">
    <div class="card-pad">
      <div class="row wrap" style="gap:7px;margin-bottom:8px">${domainChip(c.domain, true)}${chip(c.level, c.level === '高阶' ? 'soft-rose' : c.level === '进阶' ? 'soft-blue' : '')}${chip(c.duration)}</div>
      <div style="font-size:13.5px;font-weight:600;line-height:1.45">${esc(c.title)}</div>
      <div class="muted" style="font-size:12px;margin-top:6px;min-height:36px">${esc(c.desc)}</div>
      <div class="divider" style="margin:10px 0"></div>
      <div class="row tiny muted" style="gap:12px;flex-wrap:wrap">
        <span title="${esc(c.instructor || '')}">${esc((c.instructor || '').split(' · ')[0] || '')} 主讲</span><span>${esc(c.format)}</span><span>${esc(c.cme)}</span>
        <span style="margin-left:auto">${c.enrolled}/${c.capacity} 人</span>
      </div>
      <div style="margin-top:9px">${progress(pct, e ? (e.progress >= 100 ? '#0d9488' : '#b45309') : '#94a3b8')}</div>
      <div class="row" style="margin-top:10px;gap:8px">
        ${e ? `<span class="tiny" style="color:#0b6f66">${e.certified ? `已认证 · ${e.certified}` : e.progress >= 100 ? '已完成，可申请认证' : `已报名 · 进度 ${e.progress}%`}</span>
          <button class="btn sm primary" style="margin-left:auto">${e.progress >= 100 ? '查看课程' : '继续学习'}</button>`
      : `<span class="tiny muted">剩余 ${c.capacity - c.enrolled} 个名额</span>
          <button class="btn sm" style="margin-left:auto">查看课程</button>`}
      </div>
    </div>
  </div>`;
}

function openCourse(id) {
  const c = COURSES.find(x => x.id === id);
  if (!c) return;
  const enr = getEnrollments();
  const e = enr.find(x => x.courseId === c.id);
  const done = new Set(e?.doneModules || []);
  const pct = e ? e.progress : 0;

  const body = `
    <div class="row wrap" style="gap:8px;margin-bottom:12px">
      ${domainChip(c.domain)}${chip(c.level, c.level === '高阶' ? 'soft-rose' : c.level === '进阶' ? 'soft-blue' : '')}${chip(c.duration)}${chip(c.cme)}
    </div>
    <div class="muted" style="font-size:12.5px;margin-bottom:14px">${esc(c.desc)}</div>
    <div class="kv">
      <span class="k">主讲</span><span>${esc(c.instructor || '—')}</span>
      <span class="k">面向人群</span><span>${esc(c.audience || '—')}</span>
      <span class="k">形式</span><span>${esc(c.format)}</span>
      <span class="k">最近一期</span><span>${esc(c.nextSession || '随报随学')}</span>
      <span class="k">名额</span><span>${c.enrolled}/${c.capacity} 人已报名</span>
    </div>
    <div class="divider"></div>
    <div class="spread" style="margin-bottom:8px">
      <h4 style="font-size:13px;margin:0">课程大纲 · ${c.modules.length} 个模块</h4>
      ${e && !e.certified ? `<span class="tiny muted">点击模块标记完成 / 取消</span>` : ''}
    </div>
    <div class="list">
      ${c.modules.map((m, i) => `<div class="list-item" data-mod="${i}" style="${e && !e.certified ? '' : 'cursor:default'}">
        <div class="li-main"><div class="li-title" style="${done.has(i) ? 'color:#0b6f66' : ''}">
          <span style="width:18px;height:18px;border-radius:50%;display:inline-grid;place-items:center;font-size:10px;font-weight:600;
            background:${done.has(i) ? '#0d9488' : '#f0f5f6'};color:${done.has(i) ? '#fff' : '#6a8189'}">${done.has(i) ? '✓' : i + 1}</span>
          ${esc(m)}</div></div>
        ${done.has(i) ? chip('已完成', 'soft-teal') : e ? chip('待学习', 'soft-amber') : ''}
      </div>`).join('')}
    </div>
    ${e ? `
      <div style="margin-top:14px">
        <div class="spread" style="margin-bottom:5px"><span class="tiny muted">学习进度（按模块计算）</span><strong style="font-size:12.5px">${pct}%</strong></div>
        ${progress(pct, pct >= 100 ? '#0d9488' : '#b45309')}
      </div>
      ${e.certified ? `<div class="note" style="margin-top:12px">已完成认证：编号 <b style="font-family:var(--mono)">${e.certified}</b>，学时已计入学习档案与学习期晋升进度。</div>` : ''}`
    : `<div class="note" style="margin-top:12px">报名后按模块记录学习进度；全部模块完成后可申请认证学时，计入术者成长路径。</div>`}`;

  const footerAction = !e
    ? `<button class="btn primary" data-enroll-now>立即报名</button>`
    : e.certified
      ? `<span class="tiny" style="align-self:center;color:#0b6f66">已认证 · ${e.certified}</span>`
      : pct >= 100
        ? `<button class="btn primary" data-certify>申请认证学时</button>`
        : `<button class="btn primary" data-next-mod>完成下一个模块</button>`;

  openDrawer({
    title: esc(c.title),
    sub: `${esc(c.instructor || '')} · ${esc(c.cme)}`,
    body,
    footer: `<button class="btn" data-close-drawer>关闭</button>${footerAction}`,
    wide: false
  });

  const dr = document.querySelector('.drawer');
  dr.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
  if (e && !e.certified) {
    dr.querySelectorAll('[data-mod]').forEach(el => el.addEventListener('click', () => {
      toggleModule(c.id, Number(el.dataset.mod));
      refreshAfterLearn(c.id);
    }));
  }
  dr.querySelector('[data-enroll-now]')?.addEventListener('click', () => {
    enroll(c.id);
    toast('报名成功：' + c.title);
    refreshAfterLearn(c.id);
  });
  dr.querySelector('[data-next-mod]')?.addEventListener('click', () => {
    const next = c.modules.findIndex((m, i) => !(getEnrollments().find(x => x.courseId === c.id)?.doneModules || []).includes(i));
    if (next < 0) return;
    toggleModule(c.id, next);
    const cur = getEnrollments().find(x => x.courseId === c.id);
    toast(cur.progress >= 100 ? '全部模块完成，可申请认证学时' : `已进入下一模块，进度 ${cur.progress}%`);
    refreshAfterLearn(c.id);
  });
  dr.querySelector('[data-certify]')?.addEventListener('click', () => confirmCertify(c));
}

// 学习状态变化后：刷新列表页，并在原位重开抽屉保持上下文
function refreshAfterLearn(courseId) {
  rerender();
  openCourse(courseId);
}

function confirmCertify(c) {
  const me = currentIdentity();
  openModal({
    title: '申请认证学时',
    body: `
      <div class="kv" style="margin-bottom:14px">
        <span class="k">课程</span><span>${esc(c.title)}</span>
        <span class="k">学时 / 学分</span><span>${esc(c.duration)} · ${esc(c.cme)}</span>
        <span class="k">申请人</span><span>${esc(me.name)} · ${esc(me.org)}（${esc(me.role)}）</span>
      </div>
      <div class="note">提交后平台核验模块完成记录并发放认证编号，学时计入该身份的成长路径。生产环境中此步骤对接国家级 CME 学分平台。</div>`,
    footer: `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>确认申请</button>`,
    onMount(m) {
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const rec = addCertification(c.id);
        if (!rec) { toast('该课程已认证或未完成', 'err'); return; }
        closeModal();
        toast('认证已发放：' + rec.no);
        refreshAfterLearn(c.id);
      });
    }
  });
}
