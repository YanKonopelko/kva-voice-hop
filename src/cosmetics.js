export const HATS = Object.freeze([
  { id: 'none', name: 'Без шляпы', price: 0, note: 'Красота от природы' },
  { id: 'straw', name: 'Панама садовода', price: 8, note: 'Для солнечных берегов' },
  { id: 'beret', name: 'Берет художника', price: 14, note: 'Всё дело в настроении' },
  { id: 'wizard', name: 'Шляпа волшебника', price: 22, note: 'Квадабра!' },
  { id: 'crown', name: 'Корона пруда', price: 32, note: 'Его кваческое величество' }
]);

// Shared native vector paths: the shop icons and the equipped in-game hat match.
const SHAPES = {
  straw: [
    ['M-32 0Q-34-7-18-8L21-8Q36-5 33 1Q3 10-32 0Z','#d7b67b'],
    ['M-21-7L-17-28Q-15-33 13-30L22-7Q2-2-21-7Z','#ead399'],
    ['M-20-12Q0-7 20-12L22-6Q0 0-21-6Z','#789563'],
    ['M-14-25Q-5-28 9-25','none','#f6e5b6',2]
  ],
  beret: [
    ['M-25-10Q-35-25-15-32Q5-40 25-25Q37-12 19-9Z','#b67765'],
    ['M-21-12Q2-7 22-13L21-6Q2-1-21-7Z','#925b4f'],
    ['M0-33Q-2-39 4-40L7-37L5-32Z','#8e5d4e'],
    ['M-17-25Q-9-30 0-29','none','#d39c82',2.5]
  ],
  wizard: [
    ['M-25-6Q-17-24-8-48Q1-39 3-29Q8-24 21-7Z','#8394b4'],
    ['M-31-3Q-18-12 3-10Q24-12 31-3Q10 6-14 3Z','#6e82a3'],
    ['M-20-10Q-1-6 19-12L22-6Q0-1-23-5Z','#b2bbcb'],
    ['M-5-32L-3-27L2-26L-2-23L-2-18L-6-21L-11-19L-9-24L-12-28L-7-28Z','#eed79b']
  ],
  crown: [
    ['M-24-7L-29-29L-13-20L-1-38L12-20L28-30L23-7Q0 1-24-7Z','#ddb859'],
    ['M-23-8Q0-2 23-8L23-2Q0 5-23-2Z','#f0d37e'],
    ['M-2-21L3-16L-2-11L-7-16Z','#86a68a'],
    ['M-16-17L-12-13L-16-10L-19-13Z','#f6e4a2'],
    ['M16-17L19-14L15-10L12-14Z','#f6e4a2']
  ]
};

export function drawHat(ctx, id) {
  if (!SHAPES[id]) return;
  ctx.save(); ctx.translate(2, id === 'beret' ? -55 : -64);
  for (const [d, fill, stroke, width] of SHAPES[id]) {
    const shape = new Path2D(d);
    if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(shape); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke(shape); }
  }
  ctx.restore();
}

export function hatSvg(id) {
  if (id === 'none') return '<svg viewBox="-40 -53 80 66" aria-hidden="true"><path d="M-20-9Q0-30 20-9M-20-7Q0 10 20-7" fill="none" stroke="#88a16a" stroke-width="3" stroke-linecap="round"/><circle cx="-8" cy="-9" r="2" fill="#527243"/><circle cx="8" cy="-9" r="2" fill="#527243"/></svg>';
  return `<svg viewBox="-40 -53 80 66" aria-hidden="true">${(SHAPES[id] || []).map(([d,fill,stroke,width])=>`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"`:''}/>`).join('')}</svg>`;
}
