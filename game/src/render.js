// Every pixel is drawn here, from code: the autumn farm, the turkey, the farmer,
// the oven, the knives, the HUD and the title / end screens. No images, no
// fonts and no files are loaded: the game is one canvas and its own code.
import { STAGE, GROUND_Y, TURKEY, FARMER, RUN } from './config.js';
import { KIND_BALE, KIND_FENCE, KIND_OVEN, KIND_KNIFE_GROUND, KIND_KNIFE_FLY, KIND_PUDDLE, KIND_CORN, KIND_FEATHER, KIND_PIE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t) | 0, lerp(c1[1], c2[1], t) | 0, lerp(c1[2], c2[2], t) | 0];
}

function rgb(c, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// Sky palettes through the run: dawn, midday, golden hour, dusk.
const SKIES = [
  { top: [255, 183, 140], mid: [255, 214, 165], low: [255, 236, 200], sun: [255, 214, 120] },
  { top: [110, 178, 235], mid: [165, 210, 245], low: [220, 238, 250], sun: [255, 236, 150] },
  { top: [255, 170, 90], mid: [255, 205, 130], low: [255, 232, 190], sun: [255, 180, 80] },
  { top: [72, 52, 110], mid: [180, 90, 110], low: [255, 160, 110], sun: [255, 120, 70] },
];

function skyAt(progress) {
  const p = Math.max(0, Math.min(0.999, progress));
  const i = Math.min(SKIES.length - 2, Math.floor(p * (SKIES.length - 1)));
  const t = p * (SKIES.length - 1) - i;
  const a = SKIES[i];
  const b = SKIES[i + 1];
  return {
    top: mixColor(a.top, b.top, t),
    mid: mixColor(a.mid, b.mid, t),
    low: mixColor(a.low, b.low, t),
    sun: mixColor(a.sun, b.sun, t),
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** The turkey, facing right. `opts` carries run cycle, slide, airborne, glow. */
export function drawTurkey(ctx, x, feetY, scale, opts = {}) {
  const cycle = opts.cycle ?? 0;
  const sliding = opts.sliding ?? false;
  const airborne = opts.airborne ?? false;
  const glow = opts.glow ?? false;
  const flip = opts.flip ?? false; // upside down, for the caught screen
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale * (flip ? -1 : 1), scale * (flip ? -1 : 1));
  if (glow) {
    ctx.shadowColor = '#ffe98a';
    ctx.shadowBlur = 24;
  }
  const bob = airborne ? 0 : Math.sin(cycle * 2) * 2;
  const legSwing = airborne ? 0.5 : Math.sin(cycle * 2) * 0.7;
  const wingFlap = airborne ? Math.sin(cycle * 6) * 0.5 - 0.3 : Math.sin(cycle * 2) * 0.25;

  if (sliding) {
    // Low and stretched, beak first.
    ctx.fillStyle = '#7a4a22';
    ellipse(ctx, 0, -16, 34, 13);
    ctx.fillStyle = '#a06a35';
    ellipse(ctx, -6, -20, 26, 11);
    // Tail fan flattened behind.
    ctx.fillStyle = '#c65a2e';
    ellipse(ctx, -34, -16, 16, 7);
    ctx.fillStyle = '#e8a13c';
    ellipse(ctx, -30, -20, 13, 6);
    // Head low, beak forward.
    ctx.fillStyle = '#8a5a2b';
    ellipse(ctx, 30, -22, 11, 10);
    ctx.fillStyle = '#e2572b';
    ellipse(ctx, 32, -12, 4, 6);
    ctx.fillStyle = '#f08c1e';
    ctx.beginPath();
    ctx.moveTo(38, -24);
    ctx.lineTo(50, -20);
    ctx.lineTo(38, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ellipse(ctx, 33, -25, 2, 2.5);
    // One leg stretched back.
    ctx.strokeStyle = '#d98a3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(-30, 0);
    ctx.stroke();
  } else {
    // Tail fan: five feathers fanned behind the body.
    const featherColors = ['#b03a2e', '#c65a2e', '#e8a13c', '#8a5a2b', '#d97b2b'];
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI * 0.72 + (i * Math.PI * 0.44) / 4;
      const fx = Math.cos(angle) * 26;
      const fy = -34 + Math.sin(angle) * 26;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = featherColors[i];
      ellipse(ctx, 0, 0, 7, 17);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ellipse(ctx, 0, -8, 3.5, 8);
      ctx.restore();
    }
    // Legs, alternating with the run cycle.
    ctx.strokeStyle = '#d98a3d';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const legA = Math.sin(cycle * 2) * 10;
    const legB = Math.sin(cycle * 2 + Math.PI) * 10;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(-6 + legA, 0);
    ctx.moveTo(6, -12);
    ctx.lineTo(6 + legB, 0);
    ctx.stroke();
    // Body.
    ctx.fillStyle = '#8a5a2b';
    ellipse(ctx, 0, -30 + bob, 26, 24);
    ctx.fillStyle = '#a06a35';
    ellipse(ctx, 2, -26 + bob, 20, 18);
    // Wing, flapping.
    ctx.save();
    ctx.translate(-2, -32 + bob);
    ctx.rotate(wingFlap);
    ctx.fillStyle = '#6e4520';
    ellipse(ctx, -4, 0, 16, 9);
    ctx.restore();
    // Neck and head.
    ctx.fillStyle = '#a06a35';
    ctx.fillRect(14, -58 + bob, 10, 26);
    ctx.fillStyle = '#8a5a2b';
    ellipse(ctx, 20, -62 + bob, 12, 11);
    // Wattle and snood.
    ctx.fillStyle = '#e2572b';
    ellipse(ctx, 24, -50 + bob, 4, 7);
    ctx.fillStyle = '#f08c1e';
    ctx.beginPath();
    ctx.moveTo(30, -64 + bob);
    ctx.lineTo(42, -60 + bob);
    ctx.lineTo(30, -56 + bob);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#fff';
    ellipse(ctx, 23, -65 + bob, 3.4, 3.4);
    ctx.fillStyle = '#1a1a1a';
    ellipse(ctx, 24, -65 + bob, 1.8, 1.8);
  }
  ctx.restore();
}

/** The farmer, chasing from the left, pitchfork in hand. */
export function drawFarmer(ctx, x, feetY, scale, cycle, angry = 1) {
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);
  const legSwing = Math.sin(cycle * 2) * 0.8;
  // Legs: blue overalls, running.
  ctx.strokeStyle = '#2e4a7a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -34);
  ctx.lineTo(-4 + Math.sin(cycle * 2) * 14, 0);
  ctx.moveTo(6, -34);
  ctx.lineTo(6 + Math.sin(cycle * 2 + Math.PI) * 14, 0);
  ctx.stroke();
  // Body: red plaid shirt.
  ctx.fillStyle = '#b03a2e';
  roundRect(ctx, -16, -62, 34, 32, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -52);
  ctx.lineTo(18, -52);
  ctx.moveTo(-16, -42);
  ctx.lineTo(18, -42);
  ctx.moveTo(-6, -62);
  ctx.lineTo(-6, -30);
  ctx.moveTo(6, -62);
  ctx.lineTo(6, -30);
  ctx.stroke();
  // Overalls straps.
  ctx.strokeStyle = '#2e4a7a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, -62);
  ctx.lineTo(-8, -46);
  ctx.moveTo(10, -62);
  ctx.lineTo(10, -46);
  ctx.stroke();
  // Arms pumping, one gripping the pitchfork.
  ctx.strokeStyle = '#e8b98a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-14, -56);
  ctx.lineTo(-26, -40 + legSwing * 8);
  ctx.moveTo(16, -56);
  ctx.lineTo(28, -44 - legSwing * 8);
  ctx.stroke();
  // Pitchfork.
  ctx.save();
  ctx.translate(30, -30);
  ctx.rotate(0.5);
  ctx.strokeStyle = '#8a6a3b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 3;
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(dx, -34);
    ctx.lineTo(dx, -48);
    ctx.stroke();
  }
  ctx.restore();
  // Head with straw hat.
  ctx.fillStyle = '#e8b98a';
  ellipse(ctx, 2, -74, 13, 12);
  // Mustache and angry brows.
  ctx.fillStyle = '#5a3a1a';
  ellipse(ctx, 8, -66, 7, 2.6);
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(2, -80 - angry);
  ctx.lineTo(9, -78);
  ctx.moveTo(16, -80 - angry);
  ctx.lineTo(10, -78);
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ellipse(ctx, 6, -76, 1.8, 1.8);
  ellipse(ctx, 13, -76, 1.8, 1.8);
  // Straw hat.
  ctx.fillStyle = '#e8c96a';
  ctx.beginPath();
  ctx.ellipse(2, -82, 20, 5, 0, 0, TAU);
  ctx.fill();
  ellipse(ctx, 2, -88, 11, 7);
  ctx.fillStyle = '#b03a2e';
  ctx.fillRect(-9, -86, 22, 3);
  ctx.restore();
}

function drawBale(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#d9a441';
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fill();
  ctx.fillStyle = '#c98f2e';
  roundRect(ctx, 0, h - 14, w, 14, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(122,74,20,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(8, 10 + i * 10);
    ctx.quadraticCurveTo(w / 2, 6 + i * 10, w - 8, 10 + i * 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFence(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#8a5f33';
  ctx.fillRect(2, 0, 10, h);
  ctx.fillRect(w - 12, 0, 10, h);
  ctx.fillStyle = '#a5763f';
  ctx.fillRect(0, 12, w, 12);
  ctx.fillRect(0, 42, w, 12);
  ctx.fillStyle = '#6e4a26';
  ctx.fillRect(2, 0, 10, 4);
  ctx.fillRect(w - 12, 0, 10, 4);
  ctx.restore();
}

function drawOven(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.translate(x, y);
  // Body.
  ctx.fillStyle = '#2b2b30';
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#3d3d44';
  roundRect(ctx, 4, 4, w - 8, 22, 6);
  ctx.fill();
  // Chimney with smoke.
  ctx.fillStyle = '#22222a';
  ctx.fillRect(w - 26, -26, 18, 28);
  for (let i = 0; i < 3; i += 1) {
    const phase = (time * 0.7 + i * 0.33) % 1;
    ctx.fillStyle = `rgba(220,220,220,${0.5 * (1 - phase)})`;
    ellipse(ctx, w - 17 + Math.sin(phase * 5) * 8, -30 - phase * 46, 8 + phase * 10, 8 + phase * 10);
  }
  // Open door, glowing with fire.
  const flicker = Math.sin(time * 11) * 0.5 + Math.sin(time * 23) * 0.5;
  const fireH = 34 + flicker * 4;
  ctx.fillStyle = '#ff7a1a';
  roundRect(ctx, 12, h - 46, w - 24, 38, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.moveTo(20, h - 10);
  ctx.quadraticCurveTo(28, h - 10 - fireH, 36, h - 10);
  ctx.quadraticCurveTo(44, h - 10 - fireH * 0.7, 52, h - 10);
  ctx.quadraticCurveTo(60, h - 10 - fireH, 68, h - 10);
  ctx.quadraticCurveTo(76, h - 10 - fireH * 0.7, 84, h - 10);
  ctx.closePath();
  ctx.fill();
  // Door frame and handle.
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, h - 46, w - 24, 38);
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(w / 2 - 12, 30, 24, 5);
  // Heat shimmer lines.
  ctx.strokeStyle = 'rgba(255,150,60,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const sx = 20 + i * 28;
    ctx.beginPath();
    ctx.moveTo(sx, h - 52);
    ctx.quadraticCurveTo(sx + 6, h - 66 + Math.sin(time * 6 + i) * 3, sx, h - 78);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKnifeGround(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.12);
  // Blade, stuck point-up.
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#e8e8ec');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, '#b8bcc4');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w, 44);
  ctx.lineTo(w * 0.72, 52);
  ctx.lineTo(w * 0.28, 52);
  ctx.lineTo(0, 44);
  ctx.closePath();
  ctx.fill();
  // Glint.
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  const glint = (Math.sin(time * 3) + 1) / 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, 12 + glint * 8);
  ctx.lineTo(w * 0.62, 40);
  ctx.stroke();
  // Wooden handle in the dirt.
  ctx.fillStyle = '#6e4520';
  roundRect(ctx, w * 0.2, 50, w * 0.6, h - 50, 4);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(w * 0.2, 54, w * 0.6, 4);
  ctx.restore();
}

function drawKnifeFly(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.sin(time * 2) * 0.08);
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, '#f4f4f8');
  grad.addColorStop(0.6, '#ffffff');
  grad.addColorStop(1, '#b8bcc4');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, -h / 2);
  ctx.lineTo(w / 2, -2);
  ctx.lineTo(-w / 2 + 8, h / 2);
  ctx.lineTo(-w / 2 + 22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6e4520';
  roundRect(ctx, -w / 2 - 16, -7, 24, 14, 5);
  ctx.fill();
  // Motion streaks.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + 10 + i * 8, -8 + i * 8);
    ctx.lineTo(w / 2 + 34 + i * 8, -8 + i * 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPuddle(ctx, x, y, w, h, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#7a5a34';
  ellipse(ctx, w / 2, h / 2, w / 2, h / 2);
  ctx.fillStyle = '#5a8ab0';
  ellipse(ctx, w / 2, h / 2 - 1, w / 2 - 6, h / 2 - 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2 - 12, h / 2 - 2, 18, 2.5, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawCorn(ctx, x, y, w, h, time, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 5);
  if (Math.sin(time * 4 + x) > 0.6) {
    ctx.shadowColor = '#ffd94d';
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = '#ffd94d';
  ellipse(ctx, 0, -2, 11, 15);
  ctx.fill();
  ctx.fillStyle = '#e8b32a';
  for (let row = -1; row <= 1; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      ellipse(ctx, col * 6, row * 8 - 2, 2, 2.6);
    }
  }
  ctx.fillStyle = '#4a9a3a';
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.quadraticCurveTo(-16, 18, -10, 22);
  ctx.quadraticCurveTo(-4, 16, -2, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.quadraticCurveTo(16, 18, 10, 22);
  ctx.quadraticCurveTo(4, 16, 2, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFeatherPickup(ctx, x, y, w, h, time, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 5);
  ctx.shadowColor = '#ffe98a';
  ctx.shadowBlur = 18;
  ctx.rotate(Math.sin(time * 2) * 0.2 - 0.4);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.ellipse(0, -4, 9, 18, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.ellipse(0, -8, 4, 12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c98f2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.restore();
}

function drawPie(ctx, x, y, w, h, time, bob) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + Math.sin(bob) * 5);
  ctx.shadowColor = '#ff9d5c';
  ctx.shadowBlur = 14;
  // Slice of pumpkin pie.
  ctx.fillStyle = '#e8a13c';
  ctx.beginPath();
  ctx.moveTo(-18, 8);
  ctx.lineTo(18, 8);
  ctx.lineTo(4, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c97a2e';
  ctx.beginPath();
  ctx.moveTo(-18, 8);
  ctx.lineTo(18, 8);
  ctx.lineTo(18, 14);
  ctx.lineTo(-18, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ellipse(ctx, 2, -8, 7, 5);
  // Steam.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.quadraticCurveTo(0, -24 + Math.sin(time * 5) * 2, -4, -30);
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -7, -12, 0, -6);
  ctx.bezierCurveTo(7, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = filled ? '#e2572b' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  if (filled) {
    ctx.strokeStyle = '#7a1f12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground(ctx, state, time) {
  const progress = Math.min(1, state.metres / RUN.escapeMetres);
  const sky = skyAt(progress);
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, rgb(sky.top));
  grad.addColorStop(0.55, rgb(sky.mid));
  grad.addColorStop(1, rgb(sky.low));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STAGE.width, GROUND_Y + 2);

  // Sun, travelling across the sky as the run goes on.
  const sunX = 180 + progress * 900;
  const sunY = 150 - Math.sin(progress * Math.PI) * 60;
  ctx.fillStyle = rgb(sky.sun);
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgb(sky.sun, 0.25);
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, TAU);
  ctx.fill();

  // Clouds, slow parallax.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i += 1) {
    const cx = ((i * 260 + hash(i) * 120 - state.distancePx * 0.05) % 1500 + 1500) % 1500 - 110;
    const cy = 60 + hash(i + 40) * 130;
    const s = 0.7 + hash(i + 9) * 0.7;
    ellipse(ctx, cx, cy, 46 * s, 16 * s);
    ellipse(ctx, cx + 30 * s, cy + 6 * s, 34 * s, 13 * s);
    ellipse(ctx, cx - 32 * s, cy + 7 * s, 30 * s, 12 * s);
  }

  // Distant hills.
  ctx.fillStyle = progress > 0.75 ? '#5a7a4a' : '#8aa86a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= STAGE.width; x += 40) {
    const wx = x + state.distancePx * 0.15;
    ctx.lineTo(x, GROUND_Y - 70 - Math.sin(wx * 0.004) * 46 - Math.sin(wx * 0.011) * 18);
  }
  ctx.lineTo(STAGE.width, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Tree line and the occasional barn, mid parallax.
  for (let i = 0; i < 14; i += 1) {
    const wx = i * 340 + hash(i + 77) * 160;
    const tx = ((wx - state.distancePx * 0.4) % 1600 + 1600) % 1600 - 160;
    const treeH = 70 + hash(i + 3) * 50;
    ctx.fillStyle = '#4a6a35';
    ctx.beginPath();
    ctx.moveTo(tx, GROUND_Y - treeH);
    ctx.lineTo(tx - 26, GROUND_Y - treeH + 52);
    ctx.lineTo(tx + 26, GROUND_Y - treeH + 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(tx - 4, GROUND_Y - 34, 8, 34);
  }
  // The farmhouse, drifting past now and then.
  const barnX = ((900 - state.distancePx * 0.55) % 2600 + 2600) % 2600 - 300;
  ctx.fillStyle = '#a83a2e';
  ctx.fillRect(barnX, GROUND_Y - 150, 180, 150);
  ctx.fillStyle = '#7a2a20';
  ctx.beginPath();
  ctx.moveTo(barnX - 12, GROUND_Y - 150);
  ctx.lineTo(barnX + 90, GROUND_Y - 210);
  ctx.lineTo(barnX + 192, GROUND_Y - 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.fillRect(barnX + 30, GROUND_Y - 110, 34, 34);
  ctx.fillRect(barnX + 116, GROUND_Y - 110, 34, 34);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(barnX + 72, GROUND_Y - 80, 36, 80);

  // The forest gate, visible in the last stretch.
  const metresLeft = RUN.escapeMetres - state.metres;
  if (metresLeft < 60) {
    const gateX = TURKEY.x + metresLeft / RUN.metresPerPixel;
    ctx.fillStyle = '#3a5a2e';
    ctx.beginPath();
    ctx.moveTo(gateX - 90, GROUND_Y);
    ctx.lineTo(gateX - 90, GROUND_Y - 190);
    ctx.lineTo(gateX - 40, GROUND_Y - 230);
    ctx.lineTo(gateX + 10, GROUND_Y - 190);
    ctx.lineTo(gateX + 10, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gateX + 90, GROUND_Y);
    ctx.lineTo(gateX + 90, GROUND_Y - 190);
    ctx.lineTo(gateX + 140, GROUND_Y - 230);
    ctx.lineTo(gateX + 190, GROUND_Y - 190);
    ctx.lineTo(gateX + 190, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a5f33';
    ctx.fillRect(gateX - 100, GROUND_Y - 120, 300, 14);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FOREST — FREEDOM!', gateX + 50, GROUND_Y - 140);
  }

  // Ground: dirt with a grass lip.
  ctx.fillStyle = '#8a5f33';
  ctx.fillRect(0, GROUND_Y, STAGE.width, STAGE.height - GROUND_Y);
  ctx.fillStyle = '#6e4a26';
  for (let x = 0; x < STAGE.width; x += 90) {
    const wx = x + state.distancePx;
    const tile = Math.floor(wx / 90);
    ctx.fillRect(x, GROUND_Y + 30 + hash(tile) * 60, 40 + hash(tile + 5) * 30, 8);
  }
  ctx.fillStyle = '#5a9a3a';
  ctx.fillRect(0, GROUND_Y, STAGE.width, 14);
  ctx.fillStyle = '#4a8a2e';
  for (let x = 0; x < STAGE.width; x += 26) {
    const wx = x + state.distancePx;
    const tile = Math.floor(wx / 26);
    const h = 8 + hash(tile) * 10;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 14);
    ctx.lineTo(x + 4, GROUND_Y + 14 - h);
    ctx.lineTo(x + 8, GROUND_Y + 14);
    ctx.closePath();
    ctx.fill();
  }
  // Fence posts scrolling past at ground level, tiled on world space so each
  // fence stays whole as it scrolls.
  ctx.fillStyle = '#a5763f';
  const firstTile = Math.floor(state.distancePx / 150);
  for (let i = 0; i < 11; i += 1) {
    const tile = firstTile + i;
    if (hash(tile + 21) >= 0.75) continue;
    const fx = tile * 150 - state.distancePx;
    ctx.fillRect(fx, GROUND_Y - 52, 8, 52);
    ctx.fillRect(fx + 60, GROUND_Y - 52, 8, 52);
    ctx.fillRect(fx, GROUND_Y - 44, 68, 8);
    ctx.fillRect(fx, GROUND_Y - 22, 68, 8);
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ellipse(ctx, p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawWorldObjects(ctx, state, time) {
  for (const o of state.obstacles) {
    if (o.kind === KIND_BALE) drawBale(ctx, o.x, o.y, o.width, o.height, time);
    else if (o.kind === KIND_FENCE) drawFence(ctx, o.x, o.y, o.width, o.height);
    else if (o.kind === KIND_OVEN) drawOven(ctx, o.x, o.y, o.width, o.height, time);
    else if (o.kind === KIND_KNIFE_GROUND) drawKnifeGround(ctx, o.x, o.y, o.width, o.height, time);
    else if (o.kind === KIND_KNIFE_FLY) drawKnifeFly(ctx, o.x, o.y, o.width, o.height, time);
    else if (o.kind === KIND_PUDDLE) drawPuddle(ctx, o.x, o.y, o.width, o.height, time);
  }
  for (const p of state.pickups) {
    if (p.kind === KIND_CORN) drawCorn(ctx, p.x, p.y, p.width, p.height, time, p.bob);
    else if (p.kind === KIND_FEATHER) drawFeatherPickup(ctx, p.x, p.y, p.width, p.height, time, p.bob);
    else if (p.kind === KIND_PIE) drawPie(ctx, p.x, p.y, p.width, p.height, time, p.bob);
  }
}

function drawHud(ctx, state, time) {
  const progress = Math.min(1, state.metres / RUN.escapeMetres);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Score panel, top left.
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 16, 14, 330, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 30px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`${state.score}`, 30, 44);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`SCORE   •   CORN ${state.corn}   •   DODGED ${state.dodges}`, 30, 66);

  // Distance bar, top centre.
  const barX = 366;
  const barW = 620;
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, barX - 10, 14, barW + 20, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 14px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE FARM', barX + 34, 34);
  ctx.fillText('THE FOREST', barX + barW - 40, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, barX, 42, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#5a9a3a';
  roundRect(ctx, barX, 42, Math.max(14, barW * progress), 14, 7);
  ctx.fill();
  const markerX = barX + barW * progress;
  ctx.fillStyle = '#ffd94d';
  ellipse(ctx, markerX, 49, 10, 10);
  ctx.fillStyle = '#8a5a2b';
  ellipse(ctx, markerX, 49, 5, 5);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`${Math.floor(state.metres)} m / ${RUN.escapeMetres} m to freedom`, barX + barW / 2, 76);
  ctx.textAlign = 'left';

  // Hearts, top right.
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 1010, 14, 254, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('LIVES', 1026, 38);
  for (let i = 0; i < RUN.maxHearts; i += 1) {
    drawHeart(ctx, 1100 + i * 52, 50, 34, i < state.hearts);
  }

  // Farmer gap meter, bottom left.
  const gapFrac = state.gap / FARMER.maxGap;
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 16, 640, 300, 56, 12);
  ctx.fill();
  ctx.fillStyle = gapFrac < 0.25 ? '#ff5a3c' : '#fff3d0';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('FARMER', 30, 664);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 110, 652, 180, 12, 6);
  ctx.fill();
  ctx.fillStyle = gapFrac < 0.25 ? '#ff5a3c' : gapFrac < 0.5 ? '#ffb13c' : '#5a9a3a';
  roundRect(ctx, 110, 652, Math.max(12, 180 * gapFrac), 12, 6);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(gapFrac < 0.25 ? 'RUN!' : gapFrac < 0.5 ? 'CLOSING IN…' : 'SAFE (FOR NOW)', 110, 682);

  // Golden feather timer.
  if (state.turkey.featherTimer > 0) {
    ctx.fillStyle = 'rgba(20,12,6,0.6)';
    roundRect(ctx, 500, 96, 280, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    ctx.font = 'bold 18px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`GOLDEN FEATHER  ${state.turkey.featherTimer.toFixed(1)}s`, 640, 120);
    ctx.textAlign = 'left';
  }

  // Farmer closing warning.
  if (state.gap < FARMER.warnGap && Math.sin(time * 10) > 0) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 34px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText("HE'S RIGHT BEHIND YOU!", STAGE.width / 2, 170);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  // Hit flash.
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255,40,20,${state.flashTimer * 0.9})`;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,77,0.6)';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, state, best, time) {
  // Warm dusk overlay over the attract scene.
  ctx.fillStyle = 'rgba(30,16,8,0.35)';
  ctx.fillRect(0, 0, STAGE.width, STAGE.height);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 92px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('GOBBLE DASH', STAGE.width / 2, 150);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 34px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('— THE GREAT TURKEY ESCAPE —', STAGE.width / 2, 196);
  ctx.shadowBlur = 0;

  panel(ctx, 330, 250, 620, 250);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 21px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('Thanksgiving is coming. The farmer is coming faster.', 640, 292);
  ctx.font = '20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('SPACE / CLICK — jump (press twice: double jump)', 640, 332);
  ctx.fillText('S / ↓ — slide under flying carving knives', 640, 362);
  ctx.fillText('Eat corn to keep the farmer back. Dodge the oven!', 640, 392);
  ctx.fillText('Reach the forest gate at 1200 m and you are free.', 640, 422);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('3 lives  •  golden feathers smash through anything', 640, 462);
  if (best > 0) {
    ctx.fillStyle = '#fff3d0';
    ctx.font = 'bold 18px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(`BEST SCORE: ${best}`, 640, 490);
  }
  if (Math.sin(time * 4) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 30px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO RUN', STAGE.width / 2, 570);
  }
  ctx.fillStyle = 'rgba(255,243,208,0.75)';
  ctx.font = '16px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('P — pause    •    M — mute    •    R — restart', STAGE.width / 2, 640);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, best, time, escaped) {
  ctx.fillStyle = escaped ? 'rgba(10,40,10,0.45)' : 'rgba(40,8,4,0.5)';
  ctx.fillRect(0, 0, STAGE.width, STAGE.height);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = escaped ? '#8ae06a' : '#ff5a3c';
  ctx.font = 'bold 88px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', STAGE.width / 2, 150);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 28px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(
    escaped
      ? 'You made it to the forest — no Thanksgiving dinner this year!'
      : `The farmer got you at ${Math.floor(state.metres)} m — Thanksgiving dinner awaits…`,
    STAGE.width / 2,
    198,
  );
  ctx.shadowBlur = 0;

  panel(ctx, 380, 250, 520, 220);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 24px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('RUN STATS', 640, 292);
  ctx.fillStyle = '#fff3d0';
  ctx.font = '21px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`Score: ${state.score}      Distance: ${Math.floor(state.metres)} m`, 640, 330);
  ctx.fillText(`Corn eaten: ${state.corn}      Obstacles dodged: ${state.dodges}`, 640, 362);
  if (state.score >= best && state.score > 0) {
    ctx.fillStyle = '#8ae06a';
    ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('NEW BEST SCORE!', 640, 402);
  } else if (best > 0) {
    ctx.fillStyle = '#fff3d0';
    ctx.font = '20px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(`Best score: ${best}`, 640, 402);
  }
  if (Math.sin(time * 4) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 28px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO RUN AGAIN', STAGE.width / 2, 540);
  }
  ctx.textAlign = 'left';

  if (!escaped) {
    // The farmer, holding his prize upside down.
    drawFarmer(ctx, 1010, 560, 1.5, time, 0);
    drawTurkey(ctx, 1085, 430, 1.1, { flip: true, cycle: time });
  } else {
    // Confetti leaves over the forest clearing.
    for (let i = 0; i < 24; i += 1) {
      const lx = (hash(i) * STAGE.width + time * (30 + hash(i + 50) * 60)) % STAGE.width;
      const ly = (hash(i + 90) * 300 + time * (60 + hash(i + 30) * 80)) % 320 + 180;
      ctx.fillStyle = ['#e8a13c', '#c65a2e', '#5a9a3a', '#ffd94d'][i % 4];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(time * 2 + i);
      ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
    }
    drawTurkey(ctx, 1050, 560, 1.4, { cycle: time, glow: true });
  }
}

/** Draw one frame. `screen` is title | play | over; `best` is the saved best score. */
export function render(ctx, state, screen, best, time) {
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);
  drawBackground(ctx, state, time);
  drawWorldObjects(ctx, state, time);
  drawParticles(ctx, state);

  const t = state.turkey;
  const airborne = t.y < GROUND_Y - 0.5;
  const blink = t.invincibleTimer > 0 && Math.floor(time * 12) % 2 === 0 && screen === SCREEN_PLAY;
  // On the end screen the turkey is in the farmer's hands (drawn by drawEnd),
  // not still running in the world.
  if (screen !== SCREEN_OVER && !blink) {
    drawTurkey(ctx, TURKEY.x, t.y, 1, {
      cycle: t.runCycle,
      sliding: t.sliding,
      airborne,
      glow: t.featherTimer > 0,
    });
  }

  // The farmer, closing in as the gap shrinks (not on the end screen, where
  // drawEnd shows him holding his prize).
  if (screen !== SCREEN_OVER) {
    const farmerX = TURKEY.x - 70 - state.gap * 1.6;
    if (farmerX > -120) {
      drawFarmer(ctx, farmerX, GROUND_Y, 1.05, t.runCycle, state.gap < FARMER.warnGap ? 1 : 0.4);
    }
  }

  if (screen === SCREEN_PLAY) drawHud(ctx, state, time);
  if (screen === SCREEN_TITLE) drawTitle(ctx, state, best, time);
  if (screen === SCREEN_OVER) drawEnd(ctx, state, best, time, state.escaped);

  // Soft vignette.
  const vig = ctx.createRadialGradient(640, 360, 420, 640, 360, 780);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, STAGE.width, STAGE.height);
}
