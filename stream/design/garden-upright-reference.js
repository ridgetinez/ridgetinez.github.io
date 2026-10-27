// A few plants drawn as shaded characters. Geometry and glyphs are stable;
// only the stems and petals move, so the texture doesn't sparkle or flicker.
const TAU = Math.PI * 2;
const noise = n => Math.sin(n * 127.1 + 311.7) * 43758.5453 % 1;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

function plant(kind) {
  const points = [];
  const add = (x, y, z, shade, material = 'leaf', flutter = 0) => {
    points.push({ x, y, z, shade, material, flutter, grain: Math.abs(noise(x * 3.1 + y * 17.7 + z)) });
  };

  function stem(from, control, to, width = 1) {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    for (let i = 0; i <= length * 2; i++) {
      const t = i / (length * 2), u = 1 - t;
      const x = u * u * from[0] + 2 * u * t * control[0] + t * t * to[0];
      const y = u * u * from[1] + 2 * u * t * control[1] + t * t * to[1];
      for (let w = -width; w <= width; w += .7) add(x + w, y, -12, .4, 'stem');
    }
  }

  // Nasturtium leaves are round, with veins radiating from the petiole.
  function roundLeaf(cx, cy, radius, angle) {
    for (let y = -radius; y <= radius; y += .8) {
      for (let x = -radius; x <= radius; x += .8) {
        const r = Math.hypot(x, y), a = Math.atan2(y, x);
        if (r > radius * (1 + .045 * Math.sin(a * 9))) continue;
        const vein = Math.abs(Math.sin((a + .2) * 4.5)) < .065;
        const px = x * Math.cos(angle) - y * Math.sin(angle);
        const py = x * Math.sin(angle) + y * Math.cos(angle);
        add(cx + px, cy + py * .67, 3 + 5 * (1 - r / radius), vein ? .26 : .52 + .17 * x / radius, 'leaf');
      }
    }
  }

  function nasturtium(cx, cy, radius, turn, phase) {
    for (let petal = 0; petal < 5; petal++) {
      const angle = turn + petal * TAU / 5;
      const length = radius * (petal < 2 ? 1.08 : .94);
      for (let u = .02; u < 1; u += .025) {
        const width = Math.pow(Math.sin(Math.PI * u), .65) * radius * .51;
        for (let v = -1; v <= 1; v += .05) {
          const radial = 4 + u * length;
          const side = v * width;
          const depth = 7 * Math.sin(u * Math.PI) + 4 * v * v;
          const x = Math.cos(angle) * radial - Math.sin(angle) * side;
          const y = Math.sin(angle) * radial + Math.cos(angle) * side;
          const vein = u < .65 && Math.abs(Math.sin(v * 10 + petal)) < .11;
          add(cx + x, cy + y * .86 + depth * .2, 12 + depth + petal * .12,
            vein ? .1 : .5 + .3 * Math.cos(angle - .8) + .16 * v, 'petal', phase + u * 2);
        }
      }
    }
    for (let y = -5; y <= 6; y += .7) {
      for (let x = -6; x <= 6; x += .7) {
        if (x * x / 36 + y * y / 30 > 1) continue;
        add(cx + x, cy + y + 2, 30, .3 + y / 25, y < 1 ? 'throat' : 'pollen', phase);
      }
    }
  }

  // Several uneven rings of folded petals give the marigold its dense head.
  function marigold(cx, cy, radius) {
    for (let ring = 3; ring >= 0; ring--) {
      const count = 7 + ring * 5;
      const ringRadius = radius * ring / 4;
      for (let petal = 0; petal < count; petal++) {
        const angle = petal * TAU / count + ring * .47;
        const length = 9 + ring * .9 + Math.sin(petal * 7) * 1.8;
        for (let u = -1; u <= 1; u += .1) {
          for (let v = -1; v <= 1; v += .1) {
            if (u * u + v * v > 1 + .12 * Math.sin(v * 18 + petal)) continue;
            const radial = ringRadius + u * length;
            const side = v * (4 + ring * .8);
            const fold = Math.cos(v * 9 + petal) * 1.4;
            const x = Math.cos(angle) * radial - Math.sin(angle) * side;
            const y = Math.sin(angle) * radial + Math.cos(angle) * side;
            add(cx + x, cy + y * .87, 30 - ring * 4 + (1 - u * u) * 3 + fold,
              .48 + .25 * Math.cos(v * 5 + angle) + .14 * u, 'petal', petal * .3);
          }
        }
      }
    }
  }

  function leaflet(cx, cy, length, angle) {
    for (let u = 0; u < 1; u += .04) {
      const width = Math.sin(u * Math.PI) * 3.8 * (1 + .18 * Math.sin(u * 35));
      for (let v = -1; v <= 1; v += .2) {
        const x = u * length, y = v * width;
        add(cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle),
          3, Math.abs(v) < .15 ? .2 : .55 + v * .15);
      }
    }
  }

  if (kind === 'nasturtium') {
    stem([113, 251], [130, 157], [86, 66], 1.1);
    stem([115, 224], [165, 186], [163, 134], .8);
    stem([115, 221], [75, 199], [58, 163], .8);
    stem([116, 221], [143, 203], [143, 196], .7);
    stem([114, 163], [90, 139], [82, 123], .7);
    roundLeaf(58, 163, 29, -.4);
    roundLeaf(143, 196, 26, .35);
    roundLeaf(82, 123, 21, -.3);
    nasturtium(86, 66, 32, -1.9, 0);
    nasturtium(163, 134, 22, -1.3, 1.3);
  } else {
    stem([82, 215], [64, 123], [95, 54], .8);
    for (const [x, y, direction] of [[76, 108, -1], [73, 136, 1], [76, 164, -1], [79, 187, 1]]) {
      const end = [x + direction * 39, y - 29];
      stem([x, y], [x + direction * 20, y - 12], end, .5);
      for (let i = 1; i < 5; i++) {
        const px = x + direction * i * 7, py = y - i * 5;
        leaflet(px, py, 12 - i * .8, direction < 0 ? -2.4 : -.7);
        leaflet(px, py, 12 - i * .8, direction < 0 ? 2.9 : .25);
      }
    }
    marigold(95, 54, 34);
  }
  return { kind, points, width:kind === 'nasturtium' ? 220 : 180, height:kind === 'nasturtium' ? 266 : 230 };
}

function mountGarden() {
  const scene = document.createElement('div');
  scene.className = 'margin-garden';
  scene.setAttribute('aria-hidden', 'true');
  const plants = ['nasturtium', 'marigold'].map(kind => {
    const canvas = document.createElement('canvas');
    canvas.className = `garden-plant garden-plant--${kind}`;
    scene.append(canvas);
    return { canvas, context:canvas.getContext('2d'), model:plant(kind) };
  });
  if (plants.some(item => !item.context)) return;
  document.body.append(scene);

  const room = matchMedia('(min-width: 760px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const cellWidth = 3.8, cellHeight = 6;
  const glyphs = '.,:;=+*ox%#@';
  let timer, time = 0, last = 0;

  function draw() {
    const palette = dark.matches ? {
      petal:['#ad592d', '#c66b30', '#d57d37', '#df8c43', '#e4a35c'],
      marigold:['#aa6930', '#bf7d33', '#ce8d3c', '#dc9b49', '#e4ae62'],
      leaf:['#667a59', '#73815f', '#81916d', '#91a07a', '#9aaa84'],
      stem:['#667653'], throat:['#7f502f'], pollen:['#dca365']
    } : {
      petal:['#a55228', '#bc622b', '#ce732f', '#da8439', '#df9b4e'],
      marigold:['#aa6a2e', '#be7a2d', '#cb8a35', '#d6963d', '#dea44f'],
      leaf:['#7d8c69', '#899675', '#93a180', '#9eaa8e', '#a7b398'],
      stem:['#8c997c'], throat:['#8b4727'], pollen:['#c88a37']
    };
    for (const { canvas, context:ctx, model } of plants) {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) continue;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font = '7px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cols = Math.ceil(width / cellWidth), rows = Math.ceil(height / cellHeight);
      const grid = new Array(cols * rows);
      const scale = width / model.width;
      for (const point of model.points) {
        const rise = (model.height - point.y) / model.height;
        const breeze = Math.sin(time * .77) * 4.2 + Math.sin(time * 1.21 + rise * 2) * 1.6;
        const flutter = point.material === 'petal' ? Math.sin(time * 1.9 + point.flutter) * .9 : 0;
        const x = (point.x + breeze * rise * rise + flutter) * scale;
        const y = (point.y + Math.sin(time * .9 + point.x * .025) * rise * .7) * scale;
        const col = Math.floor(x / cellWidth), row = Math.floor(y / cellHeight);
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        const index = row * cols + col;
        if (!grid[index] || point.z > grid[index].z) grid[index] = point;
      }
      for (let i = 0; i < grid.length; i++) {
        const point = grid[i];
        if (!point) continue;
        const shade = clamp(point.shade, 0, .99);
        const colours = palette[model.kind === 'marigold' && point.material === 'petal' ? 'marigold' : point.material];
        ctx.fillStyle = colours[Math.floor(shade * colours.length)];
        const density = clamp(.2 + shade * .6 + point.grain * .22, 0, .99);
        const glyph = point.material === 'stem' ? (point.grain > .5 ? ':' : ';') : glyphs[Math.floor(density * glyphs.length)];
        ctx.fillText(glyph, (i % cols + .5) * cellWidth, (Math.floor(i / cols) + .5) * cellHeight);
      }
    }
  }

  // Twelve frames a second is enough for this small, slow breeze. Don't run
  // a render loop on phones, hidden tabs, or when reduced motion is requested.
  function update() {
    clearTimeout(timer);
    if (!room.matches || document.hidden) return;
    draw();
    if (motion.matches) return;
    last = performance.now();
    timer = setTimeout(frame, 1000 / 12);
  }
  function frame() {
    const now = performance.now();
    time += Math.min((now - last) / 1000, .15);
    last = now;
    draw();
    timer = setTimeout(frame, 1000 / 12);
  }
  const resize = new ResizeObserver(update);
  plants.forEach(({ canvas }) => resize.observe(canvas));
  [room, motion, dark].forEach(query => query.addEventListener('change', update));
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', update);
  update();
}

mountGarden();
