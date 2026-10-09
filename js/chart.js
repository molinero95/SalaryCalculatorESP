// Dependency-free SVG line chart with crosshair tooltip and an accessible data table.

import { t } from './i18n/index.js';
import { formatCompactEuros, formatEuros, escapeHtml } from './format.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARGIN = { top: 16, right: 24, bottom: 36, left: 64 };
const HEIGHT = 300;
const MIN_WIDTH = 320;
const LABEL_GAP = 14;

function svg(name, attributes = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
}

/** "Nice" axis ticks on a 1-2-5 progression. */
function niceTicks(min, max, target = 5) {
  const span = max - min || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span / target));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => span / s <= target);
  const ticks = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

/**
 * Renders a line chart into `container`.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {number[]} options.xs                 X values (gross salary).
 * @param {{name: string, className: string, values: number[]}[]} options.series
 * @param {(v: number) => string} options.formatValue  Formatter for tooltip values.
 * @param {(v: number) => string} [options.formatAxis] Formatter for Y-axis ticks.
 * @param {number} [options.marker]             X value to highlight (the user's salary).
 * @param {boolean} [options.includeZero]       Force the Y domain to include zero.
 */
export function renderChart(container, { xs, series, formatValue, formatAxis = formatValue, marker, includeZero = true }) {
  container.replaceChildren();

  const width = Math.max(MIN_WIDTH, container.clientWidth);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const values = series.flatMap((s) => s.values);
  const yTicks = niceTicks(
    includeZero ? Math.min(0, ...values) : Math.min(...values),
    includeZero ? Math.max(0, ...values) : Math.max(...values),
  );
  const [yMin, yMax] = [yTicks[0], yTicks.at(-1)];
  const [xMin, xMax] = [xs[0], xs.at(-1)];

  const scaleX = (x) => MARGIN.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (y) => MARGIN.top + (1 - (y - yMin) / (yMax - yMin || 1)) * plotHeight;

  const root = svg('svg', { viewBox: `0 0 ${width} ${HEIGHT}`, width, height: HEIGHT, role: 'img', class: 'chart-svg' });
  svg('title', {}, root).textContent = series.map((s) => s.name).join(' · ');

  // Grid and Y axis
  const grid = svg('g', { class: 'grid' }, root);
  for (const tick of yTicks) {
    const y = scaleY(tick);
    svg('line', { x1: MARGIN.left, x2: width - MARGIN.right, y1: y, y2: y, class: tick === 0 ? 'zero' : '' }, grid);
    svg('text', { x: MARGIN.left - 8, y, dy: '0.32em', 'text-anchor': 'end', class: 'axis' }, grid).textContent =
      formatAxis(tick);
  }

  // X axis
  for (const tick of niceTicks(xMin, xMax, Math.max(3, Math.floor(plotWidth / 90)))) {
    if (tick < xMin || tick > xMax) continue;
    svg('text', { x: scaleX(tick), y: HEIGHT - 12, 'text-anchor': 'middle', class: 'axis' }, root).textContent =
      formatCompactEuros(tick);
  }

  // User salary marker
  if (marker >= xMin && marker <= xMax) {
    const x = scaleX(marker);
    svg('line', { x1: x, x2: x, y1: MARGIN.top, y2: MARGIN.top + plotHeight, class: 'marker' }, root);
    svg('text', { x: x + 6, y: MARGIN.top + 10, class: 'marker-label' }, root).textContent = t('yourSalary');
  }

  // Series
  for (const s of series) {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${scaleX(xs[i]).toFixed(1)},${scaleY(v).toFixed(1)}`).join('');
    svg('path', { d, class: `line ${s.className}` }, root);
  }

  // Direct labels at the end of each line when there are several series
  if (series.length > 1) {
    const ends = series.map((s) => ({ s, y: scaleY(s.values.at(-1)) })).sort((a, b) => a.y - b.y);
    ends.forEach((end, i) => {
      if (i > 0 && end.y - ends[i - 1].y < LABEL_GAP) end.y = ends[i - 1].y + LABEL_GAP;
      svg('text', { x: width - MARGIN.right - 4, y: end.y - 8, 'text-anchor': 'end', class: 'direct-label' }, root)
        .textContent = end.s.name;
    });
  }

  addHoverLayer({ container, root, xs, series, width, plotWidth, plotHeight, scaleX, scaleY, formatValue });
}

function addHoverLayer({ container, root, xs, series, width, plotWidth, plotHeight, scaleX, scaleY, formatValue }) {
  const crosshair = svg('line', { y1: MARGIN.top, y2: MARGIN.top + plotHeight, class: 'crosshair', visibility: 'hidden' }, root);
  const dots = series.map((s) => svg('circle', { r: 5, class: `dot ${s.className}`, visibility: 'hidden' }, root));
  const hitArea = svg('rect', { x: MARGIN.left, y: MARGIN.top, width: plotWidth, height: plotHeight, class: 'hit-area' }, root);

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.hidden = true;

  const show = (event) => {
    const box = root.getBoundingClientRect();
    const ratio = ((event.clientX - box.left) / box.width) * width - MARGIN.left;
    const i = Math.max(0, Math.min(xs.length - 1, Math.round((ratio / plotWidth) * (xs.length - 1))));
    const x = scaleX(xs[i]);

    crosshair.setAttribute('x1', x);
    crosshair.setAttribute('x2', x);
    crosshair.setAttribute('visibility', 'visible');
    series.forEach((s, k) => {
      dots[k].setAttribute('cx', x);
      dots[k].setAttribute('cy', scaleY(s.values[i]));
      dots[k].setAttribute('visibility', 'visible');
    });

    tooltip.innerHTML =
      `<div class="tooltip-title">${t('grossAnnual')}: ${formatEuros(xs[i], 0)}</div>` +
      series
        .map(
          (s) =>
            `<div class="tooltip-row"><span class="swatch ${s.className}"></span>${escapeHtml(s.name)}` +
            `<strong>${formatValue(s.values[i])}</strong></div>`,
        )
        .join('');

    const left = (x / width) * box.width;
    tooltip.style.left = `${left}px`;
    tooltip.classList.toggle('flip', left > box.width * 0.6);
    tooltip.hidden = false;
  };

  const hide = () => {
    crosshair.setAttribute('visibility', 'hidden');
    dots.forEach((dot) => dot.setAttribute('visibility', 'hidden'));
    tooltip.hidden = true;
  };

  hitArea.addEventListener('pointermove', show);
  hitArea.addEventListener('pointerdown', show);
  hitArea.addEventListener('pointerleave', hide);

  container.append(root, tooltip);
}

/** Renders the chart data as a table, keeping one row every `every` points. */
export function renderDataTable(container, { xs, series, formatValue, every = 1 }) {
  const head = `<tr><th scope="col">${t('grossAnnual')}</th>${series
    .map((s) => `<th scope="col">${escapeHtml(s.name)}</th>`)
    .join('')}</tr>`;
  const rows = xs
    .map((x, i) =>
      i % every
        ? ''
        : `<tr><td>${formatEuros(x, 0)}</td>${series.map((s) => `<td>${formatValue(s.values[i])}</td>`).join('')}</tr>`,
    )
    .join('');
  container.innerHTML = `<table class="table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}
