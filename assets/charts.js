// 轻量 SVG 图表：不依赖任何外部库，直接输出字符串
const NS = 'http://www.w3.org/2000/svg';

export function sparkline(values, { width = 90, height = 28, color = '#0d9488' } = {}) {
  if (!values.length) return '';
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="spark" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}

export function donut(items, { size = 168, thickness = 22, centerLabel = '', centerSub = '' } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - thickness) / 2 - 2;
  const cx = size / 2, cy = size / 2;
  let a0 = -Math.PI / 2;
  const arcs = items.map(it => {
    const angle = (it.value / total) * Math.PI * 2;
    const a1 = a0 + angle;
    const p = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    let d;
    if (angle >= Math.PI * 2 - 0.001) {
      d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    } else {
      d = `M ${p(a0)} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${p(a1)}`;
    }
    a0 = a1;
    const mid = (a0 - angle / 2);
    const lx = cx + (r - thickness / 2 - 6) * Math.cos(mid);
    const ly = cy + (r - thickness / 2 - 6) * Math.sin(mid);
    const pct = Math.round((it.value / total) * 100);
    return `<path d="${d}" fill="none" stroke="${it.color}" stroke-width="${thickness}" stroke-linecap="butt" opacity="0.92"/>
      ${pct >= 22 ? `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">${pct}%</text>` : ''}`;
  }).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#eef2f4" stroke-width="${thickness}"/>
      ${arcs}
    </svg>
    <div class="donut-center"><strong>${centerLabel}</strong><span>${centerSub}</span></div>
  </div>`;
}

export function lineChart(points, { width = 560, height = 180, color = '#0d9488', fill = 'rgba(13,148,136,.12)', labels = [] } = {}) {
  if (!points.length) return '';
  const padL = 36, padR = 12, padT = 14, padB = 26;
  const iw = width - padL - padR, ih = height - padT - padB;
  const max = Math.max(...points) * 1.1, min = 0;
  const step = iw / Math.max(points.length - 1, 1);
  const xy = (i, v) => [padL + i * step, padT + ih - ((v - min) / (max - min || 1)) * ih];
  const path = points.map((v, i) => { const [x, y] = xy(i, v); return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  const area = path + ` L ${(padL + (points.length - 1) * step).toFixed(1)} ${padT + ih} L ${padL} ${padT + ih} Z`;
  const grid = [0, .25, .5, .75, 1].map(t => {
    const y = padT + ih - t * ih;
    return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#eef2f4"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${Math.round(min + t * (max - min))}</text>`;
  }).join('');
  const dots = points.map((v, i) => { const [x, y] = xy(i, v); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke-width="1.6"/>`; }).join('');
  const xlabels = labels.map((l, i) => `<text x="${(padL + i * step).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#94a3b8">${l}</text>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" preserveAspectRatio="xMidYMid meet">
    ${grid}<path d="${area}" fill="${fill}"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${dots}${xlabels}
  </svg>`;
}

export function barRows(items, { color = '#0d9488', suffix = '' } = {}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bar-rows">${items.map(i => `
    <div class="bar-row">
      <span class="bar-label">${i.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(i.value / max) * 100}%;background:${i.color || color}"></span></span>
      <span class="bar-value">${i.value}${suffix}</span>
    </div>`).join('')}</div>`;
}

export function progress(pct, color = '#0d9488') {
  return `<span class="prog"><span class="prog-fill" style="width:${Math.min(Math.max(pct, 0), 100)}%;background:${color}"></span></span>`;
}
