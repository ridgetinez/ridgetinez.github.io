import { gardenRandom, GARDEN_PROFILES } from '../public/garden.js';

export function renderDayFlower(day) {
  const random = gardenRandom(Number(day.replaceAll('-', '')));
  const pick = count => Math.floor(random() * count);
  const { flowers, leaves, vein } = GARDEN_PROFILES[pick(GARDEN_PROFILES.length)];
  const stemX = 8 + pick(2);
  const bloomX = stemX + pick(5) - 2;
  const bloomY = 5 + pick(2);
  const count = 4 + pick(4);
  const phase = random() * Math.PI * 2;
  const petals = Array.from({ length:count }, (_, index) => {
    const angle = phase + index * Math.PI * 2 / count;
    const reach = 2 + random() * 1.8;
    return {
      x:bloomX + Math.cos(angle) * reach,
      y:bloomY + Math.sin(angle) * reach,
      width:1.4 + random() * 1.25,
      height:1.35 + random() * 1.15,
    };
  });

  const pixels = new Map();
  const paint = (x, y, color) => pixels.set(y * 18 + x, color);
  for (let y = bloomY; y < 16; y++) paint(y < 11 ? bloomX : stemX, y, leaves[1]);
  for (let x = Math.min(bloomX, stemX); x <= Math.max(bloomX, stemX); x++) paint(x, 11, leaves[1]);
  const leafSide = pick(2) ? 1 : -1;
  for (const [direction, y] of [[leafSide,10],[-leafSide,13]]) {
    const base = y < 11 ? bloomX : stemX;
    const length = 3 + pick(3);
    for (let offset = 1; offset <= length; offset++) {
      const x = base + direction * offset;
      paint(x, y - 1, leaves[1]);
      paint(x, y, offset === 2 ? vein : leaves[0]);
      if (offset < length) paint(x, y + 1, leaves[2]);
    }
  }
  for (let y = 0; y < 12; y++) {
    for (let x = 1; x < 17; x++) {
      const petal = petals.find(p => ((x - p.x) / p.width) ** 2 + ((y - p.y) / p.height) ** 2 <= 1);
      if (petal) paint(x, y, flowers[y < petal.y - .7 ? 0 : y > petal.y + .85 ? 2 : 1]);
    }
  }
  paint(bloomX, bloomY, '#ffe5a5');
  paint(bloomX + 1, bloomY, flowers[0]);
  paint(bloomX, bloomY + 1, flowers[3]);
  paint(bloomX + 1, bloomY + 1, flowers[2]);

  const paths = new Map();
  for (const [position, color] of pixels) {
    paths.set(color, (paths.get(color) || '') + `M${position % 18} ${Math.floor(position / 18)}h1v1h-1z`);
  }
  return `<svg class="day-flower" width="18" height="16" viewBox="0 0 18 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${[...paths].map(([fill,d]) => `<path fill="${fill}" d="${d}"/>`).join('')}</svg>`;
}
