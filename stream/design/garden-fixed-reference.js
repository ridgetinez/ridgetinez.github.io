// Top-down foliage, sampled into coloured cells. Each leaf is a small spring:
// wind moves it gently; a passing pointer displaces it, then it settles back.
const TAU = Math.PI * 2;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

function drawLeaf(ctx, radius, variant) {
  const edge = angle => {
    const r = radius * (1 + .038 * Math.cos(angle * 7 + variant * .7)
      + .018 * Math.sin(angle * 3 - variant) + .055 * Math.sin(angle + variant));
    return [Math.cos(angle) * r * (variant === 1 ? .94 : 1),
      Math.sin(angle) * r * (variant === 2 ? .88 : .98)];
  };
  const outline = new Path2D();
  for (let i = 0; i <= 120; i++) {
    const point = edge(i / 120 * TAU);
    if (!i) outline.moveTo(...point); else outline.lineTo(...point);
  }
  outline.closePath();
  const body = ctx.createRadialGradient(-58, -60, 0, 8, 32, 215);
  body.addColorStop(0, variant === 1 ? '#799780' : '#8ca58a');
  body.addColorStop(.36, variant === 2 ? '#5b8977' : '#628871');
  body.addColorStop(.73, variant === 1 ? '#3b695c' : '#40715f');
  body.addColorStop(1, '#254e44');
  ctx.fillStyle = body;
  ctx.shadowColor = 'rgba(9, 23, 16, .36)';
  ctx.shadowBlur = 10; ctx.shadowOffsetY = 7;
  ctx.fill(outline);
  ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
  ctx.save(); ctx.clip(outline);

  const centre = [-14 + variant * 5, 15 - variant * 3];
  for (let vein = 0; vein < 9; vein++) {
    const angle = vein * TAU / 9 + .13 + .07 * Math.sin(vein * 2.4 + variant);
    const end = edge(angle);
    const bow = Math.sin(vein * 2 + variant) * 13;
    ctx.beginPath(); ctx.moveTo(...centre);
    ctx.bezierCurveTo(centre[0] + end[0] * .24 + bow, centre[1] + end[1] * .22,
      end[0] * .65 + bow, end[1] * .66, ...end);
    ctx.strokeStyle = 'rgba(184, 208, 184, .74)';
    ctx.lineWidth = 4.5 + Math.sin(vein) * .8;
    ctx.stroke();
    for (let branch = 0; branch < 3; branch++) {
      const t = .34 + branch * .19;
      for (const side of [-1, 1]) {
        const a = angle + side * (.22 + branch * .025);
        const tip = edge(a);
        ctx.beginPath();
        ctx.moveTo(centre[0] + (end[0] - centre[0]) * t + bow * .4,
          centre[1] + (end[1] - centre[1]) * t);
        ctx.quadraticCurveTo(tip[0] * (t + .09), tip[1] * (t + .09),
          tip[0] * Math.min(.98, t + .27), tip[1] * Math.min(.98, t + .27));
        ctx.strokeStyle = 'rgba(157, 188, 158, .27)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = '#bfd0b4';
  ctx.beginPath(); ctx.ellipse(...centre, 4, 3, -.3, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#71957a';
  ctx.lineWidth = 1.6;
  ctx.stroke(outline);
}

function drawNasturtium(ctx) {
  // Three smaller lower petals and two broad upper fans, rather than a
  // rotational rosette. Their red veins converge on an off-centre throat.
  const petals = [
    { path:'M-14 8 C-38-24-101-50-133-10 C-158 19-130 59-93 76 C-47 98-28 47-8 18Z', tip:[-124, 22] },
    { path:'M-7 17 C-35 24-100 41-95 101 C-93 143-40 158-7 127 C13 108 18 66 11 31Z', tip:[-51, 132] },
    { path:'M17 14 C48 11 113-2 133 48 C155 96 111 140 74 132 C34 126 25 72 8 31Z', tip:[108, 101] },
    { path:'M-4 3 C-25-29-105-18-122-72 C-133-88-130-112-112-121 C-101-142-77-145-58-132 C-39-140-12-121-7-100 C10-74 19-39 13-8 C9 3 3 8-4 3Z', tip:[-67,-128], fan:true },
    { path:'M5-2 C10-40 11-119 68-140 C89-150 107-145 116-130 C145-128 158-99 139-64 C122-23 75-3 24 13 C12 12 7 7 5-2Z', tip:[89,-126], fan:true }
  ];
  for (const { path, tip, fan } of petals) {
    const outline = new Path2D(path);
    const colour = ctx.createLinearGradient(0, 6, ...tip);
    colour.addColorStop(0, '#82371f');
    colour.addColorStop(.23, fan ? '#ba461d' : '#ca5f21');
    colour.addColorStop(.65, fan ? '#e87d26' : '#e3912c');
    colour.addColorStop(1, fan ? '#ed9737' : '#e9aa43');
    ctx.fillStyle = colour;
    ctx.shadowColor = 'rgba(92, 37, 17, .36)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.fill(outline);
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(141, 55, 22, .4)'; ctx.lineWidth = 3;
    ctx.stroke(outline);
    ctx.save(); ctx.clip(outline);
    for (let vein = -4; vein <= 4; vein++) {
      ctx.beginPath(); ctx.moveTo(vein * 1.2, 3);
      const ex = tip[0] + vein * (fan ? 12 : 7), ey = tip[1] + Math.abs(vein) * 4;
      ctx.bezierCurveTo(ex * .23 + Math.sin(vein) * 4, ey * .28,
        ex * .68 + Math.sin(vein * 2) * 6, ey * .64, ex, ey);
      ctx.strokeStyle = fan ? 'rgba(130, 39, 20, .65)' : 'rgba(170, 77, 24, .26)';
      ctx.lineWidth = fan ? 3.8 : 2;
      ctx.stroke();
    }
    ctx.restore();
  }
  const throat = ctx.createLinearGradient(0, -23, 6, 29);
  throat.addColorStop(0, '#522b1b');
  throat.addColorStop(.5, '#71401c');
  throat.addColorStop(1, '#af6424');
  ctx.fillStyle = throat;
  ctx.fill(new Path2D('M-18-9 C-9-26 16-24 28-9 C33 3 20 6 13 22 C-1 34-13 10-18-9Z'));
  for (let i = 0; i < 7; i++) {
    const x = -15 + i * 4.5, y = 28 + Math.sin(i * 1.3) * 7;
    ctx.beginPath(); ctx.moveTo(-5 + i * 2, -3);
    ctx.quadraticCurveTo(x - 4, 18, x, y);
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#d3b16b'; ctx.stroke();
    ctx.fillStyle = '#b58e3d';
    ctx.beginPath(); ctx.ellipse(x, y, 2.2, 1.7, -.5, 0, TAU); ctx.fill();
  }
}

function makeTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 384;
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  if (!ctx) return null;
  const radius = 156;
  ctx.translate(192, 192);

  if (kind.startsWith('leaf')) {
    drawLeaf(ctx, radius, Number(kind.split('-')[1] || 0));
  } else if (kind === 'nasturtium') {
    drawNasturtium(ctx);
  } else {
    for (let ring = 4; ring >= 0; ring--) {
      const count = 7 + ring * 5, r = ring * 29;
      for (let petal = 0; petal < count; petal++) {
        const angle = petal * TAU / count + ring * .53;
        ctx.save();
        ctx.translate(Math.cos(angle) * r, Math.sin(angle) * r);
        ctx.rotate(angle);
        const colour = ctx.createRadialGradient(-9, -6, 1, 4, 8, 38);
        colour.addColorStop(0, '#f2ba59');
        colour.addColorStop(.5, '#d99132');
        colour.addColorStop(1, '#9b5426');
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.ellipse(0, 0, 30, 17 + Math.sin(petal * 4) * 3, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }
  // Filter the drawing before sampling cells. Thin veins otherwise alias
  // into disconnected bright dots, especially in the narrower side gutters.
  const levels = [64, 96, 128, 192, 384].map(size => {
    const filtered = document.createElement('canvas');
    filtered.width = filtered.height = size;
    const filter = filtered.getContext('2d', { willReadFrequently:true });
    filter.imageSmoothingQuality = 'high';
    filter.drawImage(canvas, 0, 0, size, size);
    return { data:filter.getImageData(0, 0, size, size).data, size, radius:radius * size / 384 };
  });
  return { levels };
}

function mountGarden() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const textures = Object.fromEntries(['leaf', 'leaf-1', 'leaf-2', 'nasturtium', 'marigold'].map(kind => [kind, makeTexture(kind)]));
  if (Object.values(textures).some(texture => !texture)) return;
  const scene = document.createElement('div');
  scene.className = 'margin-garden';
  scene.setAttribute('aria-hidden', 'true');
  canvas.className = 'garden-canopy';
  scene.append(canvas);
  document.body.append(scene);

  const room = matchMedia('(min-width: 760px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x:-1000, y:-1000, vx:0, vy:0, at:0, active:false };
  const cellW = 8.5, cellH = 9.5;
  const glyphs = '.,:;=+x%#';
  let items = [], width = 0, height = 0, gutter = 0, raf = 0, last = 0, painted = 0, time = 0;

  function layout() {
    ({ width, height } = canvas.getBoundingClientRect());
    gutter = Math.max(0, (width - 480) / 2 - 26);
    const span = Math.min(330, gutter);
    const leafR = Math.min(156, span * .65);
    const bloomR = Math.min(78, span * .36);
    const leftBloom = Math.min(span * .76, gutter - bloomR * 1.05 - 6);
    const rightBloom = Math.min(span * .74, gutter - bloomR * .95 - 6);
    const definitions = [
      ['leaf', span * .14, height * .91, leafR, -.24, .2],
      ['leaf-1', span * .25, height + 21, leafR * .84, .7, 1.3],
      ['leaf-2', width - span * .14, height * .88, leafR * .96, .48, 2.1],
      ['leaf-1', width - span * .26, height + 17, leafR * .78, -.8, 3.2],
      ['nasturtium', leftBloom, height * .70, bloomR, -.22, .7],
      ['nasturtium', width - rightBloom, height * .72, bloomR * .9, .38, 2.6],
      ['marigold', width - span * .18, height + 1, bloomR * .65, .1, 3.8]
    ];
    items = definitions.map(([kind, x, y, radius, turn, phase]) => ({ kind, x, y, radius, turn, phase,
      dx:0, dy:0, vx:0, vy:0, rotation:0, spin:0 }));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '7.5px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }

  function step(dt) {
    pointer.vx *= Math.exp(-dt * 7);
    pointer.vy *= Math.exp(-dt * 7);
    for (const item of items) {
      const dx = item.x + item.dx - pointer.x, dy = item.y + item.dy - pointer.y;
      const distance = Math.hypot(dx, dy), reach = item.radius * 1.4 + 24;
      const touch = pointer.active ? Math.pow(Math.max(0, 1 - distance / reach), 2) : 0;
      const wind = Math.sin(time * .46 + item.phase) + Math.sin(time * .79 + item.phase * 2) * .32;
      const tx = wind * 3.2 + touch * (dx / Math.max(distance, 1) * 19 + pointer.vx * .027);
      const ty = Math.cos(time * .39 + item.phase) * 2.4 + touch * (dy / Math.max(distance, 1) * 15 + pointer.vy * .024);
      const turn = wind * .022 + touch * clamp(pointer.vx * .00012 + dx * .0003, -.15, .15);
      item.vx += ((tx - item.dx) * 24 - item.vx * 7.5) * dt;
      item.vy += ((ty - item.dy) * 24 - item.vy * 7.5) * dt;
      item.spin += ((turn - item.rotation) * 20 - item.spin * 7) * dt;
      item.dx = clamp(item.dx + item.vx * dt, -26, 26);
      item.dy = clamp(item.dy + item.vy * dt, -24, 24);
      item.rotation += item.spin * dt;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // Even a fast pointer flick cannot send the decoration into the feed.
    ctx.beginPath(); ctx.rect(0, 0, gutter, height); ctx.rect(width - gutter, 0, gutter, height); ctx.clip();
    // Pedicels emerge from behind the canopy. Their tips follow the moving
    // flowers, while the roots continue out of frame rather than forming an
    // upright plant silhouette.
    for (const item of items.filter(item => item.kind === 'nasturtium')) {
      const side = item.x < width / 2 ? 1 : -1;
      const span = Math.min(330, gutter);
      const root = [side === 1 ? span * .18 : width - span * .18, height + 50];
      const bend = [side === 1 ? span * .88 : width - span * .88, height + 25];
      const tip = [item.x + item.dx, item.y + item.dy];
      const neck = [tip[0] + side * 30, tip[1] + 70];
      const cells = new Set();
      for (let i = 0; i <= 220; i++) {
        const t = i / 220, u = 1 - t;
        const x = u ** 3 * root[0] + 3 * u * u * t * bend[0] + 3 * u * t * t * neck[0] + t ** 3 * tip[0];
        const y = u ** 3 * root[1] + 3 * u * u * t * bend[1] + 3 * u * t * t * neck[1] + t ** 3 * tip[1];
        const col = Math.floor(x / cellW), row = Math.floor(y / cellH);
        const key = `${col},${row}`;
        if (cells.has(key)) continue;
        cells.add(key);
        ctx.fillStyle = t > .75 ? '#64815a' : '#466b50';
        ctx.fillRect(col * cellW, row * cellH, cellW - .65, cellH - .65);
        ctx.fillStyle = 'rgba(24, 45, 31, .42)';
        ctx.fillText(side === 1 ? '/' : String.fromCharCode(92), (col + .5) * cellW, (row + .5) * cellH);
      }
    }
    for (const item of items) {
      const desired = 384 / (156 / item.radius * cellW * .7);
      const texture = textures[item.kind].levels.find(level => level.size >= desired) || textures[item.kind].levels.at(-1);
      const x = item.x + item.dx, y = item.y + item.dy;
      const turn = item.turn + item.rotation, cos = Math.cos(turn), sin = Math.sin(turn);
      const reach = item.radius * 1.24;
      const x0 = Math.max(0, Math.floor((x - reach) / cellW));
      const x1 = Math.min(Math.ceil(width / cellW), Math.ceil((x + reach) / cellW));
      const y0 = Math.max(0, Math.floor((y - reach) / cellH));
      const y1 = Math.min(Math.ceil(height / cellH), Math.ceil((y + reach) / cellH));
      const scale = texture.radius / item.radius;
      for (let row = y0; row < y1; row++) {
        for (let col = x0; col < x1; col++) {
          const px = (col + .5) * cellW, py = (row + .5) * cellH;
          const rx = px - x, ry = py - y;
          const flex = motion.matches ? 0 : Math.sin(ry / item.radius * 2 + time * .8 + item.phase) * 1.2;
          const u = Math.floor((rx * cos + ry * sin + flex) * scale + texture.size / 2);
          const v = Math.floor((-rx * sin + ry * cos) * scale + texture.size / 2);
          if (u < 0 || v < 0 || u >= texture.size || v >= texture.size) continue;
          const index = (v * texture.size + u) * 4, data = texture.data;
          const alpha = data[index + 3] / 255;
          if (alpha < .06) continue;
          const r = data[index], g = data[index + 1], b = data[index + 2];
          const leaf = item.kind.startsWith('leaf');
          // The colour belongs to the whole cell. The character is a quieter
          // second layer, rather than the only carrier of the silhouette.
          // Interiors are opaque. Only the silhouette's antialiasing and
          // cast shadow blend; an overlapping leaf cannot show through.
          const opacity = alpha > .95 ? 1 : alpha;
          ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
          ctx.fillRect(col * cellW, row * cellH, cellW - .65, cellH - .65);
          const luminance = (r * .2126 + g * .7152 + b * .0722) / 255;
          const grain = ((col * 13 + row * 7) % 19) / 19;
          const glyph = glyphs[Math.floor(clamp(luminance * .67 + grain * .3, 0, .99) * glyphs.length)];
          ctx.fillStyle = leaf ? `rgba(24,52,42,${alpha * .47})` : `rgba(91,43,22,${alpha * .56})`;
          ctx.fillText(glyph, px - .1, py);
        }
      }
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .04);
    last = now; time += dt;
    step(dt);
    if (now - painted >= 1000 / 30) { draw(); painted = now; }
    raf = requestAnimationFrame(frame);
  }
  function update() {
    cancelAnimationFrame(raf);
    if (!room.matches || document.hidden) return;
    if (motion.matches) {
      items.forEach(item => { item.dx = item.dy = item.vx = item.vy = item.rotation = item.spin = 0; });
    }
    draw();
    if (!motion.matches) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || motion.matches || !room.matches) return;
    const now = performance.now(), dt = Math.max((now - pointer.at) / 1000, .016);
    pointer.vx = pointer.active ? clamp((event.clientX - pointer.x) / dt, -1400, 1400) : 0;
    pointer.vy = pointer.active ? clamp((event.clientY - pointer.y) / dt, -1400, 1400) : 0;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.at = now; pointer.active = true;
  }, { passive:true });
  const release = () => { pointer.active = false; pointer.vx = pointer.vy = 0; };
  document.documentElement.addEventListener('pointerleave', release);
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { release(); update(); });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
  window.addEventListener('pageshow', update);
  [room, motion].forEach(query => query.addEventListener('change', () => { release(); update(); }));
  new ResizeObserver(() => { layout(); update(); }).observe(canvas);
  layout(); update();
}

mountGarden();
