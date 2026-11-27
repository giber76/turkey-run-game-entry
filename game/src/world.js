// The simulation: a turkey that auto-runs to the right while the world scrolls
// left. The farmer closes in on every hit; corn pushes him back. Reach the
// forest gate at RUN.escapeMetres and the turkey escapes. Pure logic, no
// drawing and no DOM: shots.js drives it with an autopilot for screenshots.
import { GROUND_Y, TURKEY, FARMER, RUN, SCORE, SPAWN, STEP } from './config.js';
import { makeRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_JUMP = 1;
export const EVENT_DOUBLE_JUMP = 2;
export const EVENT_SLIDE = 4;
export const EVENT_CORN = 8;
export const EVENT_FEATHER = 16;
export const EVENT_PIE = 32;
export const EVENT_DODGE = 64;
export const EVENT_HIT = 128;
export const EVENT_CAUGHT = 256;
export const EVENT_ESCAPED = 512;
export const EVENT_LAND = 1024;

export const KIND_BALE = 'bale';
export const KIND_FENCE = 'fence';
export const KIND_OVEN = 'oven';
export const KIND_KNIFE_GROUND = 'knife-ground';
export const KIND_KNIFE_FLY = 'knife-fly';
export const KIND_PUDDLE = 'puddle';
export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';
export const KIND_PIE = 'pie';

const GROUND_OBSTACLES = [
  { kind: KIND_BALE, width: 78, height: 62 },
  { kind: KIND_FENCE, width: 48, height: 86 },
  { kind: KIND_OVEN, width: 98, height: 102 },
  { kind: KIND_KNIFE_GROUND, width: 30, height: 78 },
];

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function makeWorld(seed = 1) {
  const random = makeRandom(seed);
  const state = freshState();

  function freshState() {
    return {
      screen: 'title',
      time: 0,
      distancePx: 0,
      metres: 0,
      speed: RUN.startSpeed,
      hearts: RUN.startHearts,
      gap: FARMER.startGap,
      score: 0,
      corn: 0,
      dodges: 0,
      turkey: {
        y: GROUND_Y, // feet position
        vy: 0,
        jumps: 0,
        sliding: false,
        slideTimer: 0,
        invincibleTimer: 0,
        featherTimer: 0,
        runCycle: 0,
        wasAirborne: false,
      },
      obstacles: [],
      pickups: [],
      particles: [],
      spawnInPx: 700,
      slowTimer: 0,
      dustTimer: 0,
      over: false,
      escaped: false,
      flashTimer: 0,
    };
  }

  function reset() {
    const keep = state.screen;
    Object.assign(state, freshState());
    state.screen = keep;
  }

  function turkeyBox() {
    const t = state.turkey;
    const height = t.sliding ? TURKEY.slideHeight : TURKEY.height;
    return { x: TURKEY.x + 8, y: t.y - height + 6, width: TURKEY.width - 16, height: height - 6 };
  }

  function addParticle(x, y, vx, vy, life, color, size) {
    state.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      addParticle(x, y, Math.cos(angle) * v, Math.sin(angle) * v - 60, random.range(0.3, 0.7), color, random.range(3, 7));
    }
  }

  function spawnObstacle(kind, x, extra = {}) {
    const def = GROUND_OBSTACLES.find((o) => o.kind === kind);
    const width = extra.width ?? def?.width ?? 60;
    const height = extra.height ?? def?.height ?? 60;
    const y = extra.y ?? GROUND_Y - height;
    state.obstacles.push({ kind, x, y, width, height, hit: false, dodged: false, passed: false, ...extra });
  }

  function spawnPickup(kind, x, y) {
    const size = kind === KIND_CORN ? 36 : 42;
    state.pickups.push({ kind, x, y, width: size, height: size, taken: false, bob: random.range(0, Math.PI * 2) });
  }

  /** Pick one spawn pattern and lay it just past the right edge. */
  function spawnPattern() {
    const difficulty = Math.min(1, state.metres / 900);
    const x = 1280 + 80;
    // How far the world travels during one jump: two hazards closer than this
    // cannot both be cleared, so every in-pattern gap is at least this wide.
    const airTravel = state.speed * 0.85;
    const roll = random.next();
    const groundKind = () => random.pick(GROUND_OBSTACLES).kind;

    if (roll < 0.16) {
      // A lone obstacle, easy to read.
      spawnObstacle(groundKind(), x);
    } else if (roll < 0.32) {
      // Obstacle with a corn arc over it: jump and eat.
      const kind = groundKind();
      spawnObstacle(kind, x);
      const top = GROUND_Y - (GROUND_OBSTACLES.find((o) => o.kind === kind).height + 70);
      spawnPickup(KIND_CORN, x - 30, top + 40);
      spawnPickup(KIND_CORN, x + 22, top);
      spawnPickup(KIND_CORN, x + 74, top + 40);
    } else if (roll < 0.44) {
      // Two obstacles, a hop apart.
      spawnObstacle(groundKind(), x);
      spawnObstacle(groundKind(), x + random.range(airTravel + 20, airTravel + 140));
    } else if (roll < 0.56) {
      // A flying carving knife at head height: slide under it.
      spawnObstacle(KIND_KNIFE_FLY, x, { y: GROUND_Y - 80, width: 82, height: 20, flySpeed: 260 });
      if (random.chance(0.5)) spawnPickup(KIND_CORN, x + 140, GROUND_Y - 44);
    } else if (roll < 0.66) {
      // Flying knife, then a ground obstacle to jump.
      spawnObstacle(KIND_KNIFE_FLY, x, { y: GROUND_Y - 80, width: 82, height: 20, flySpeed: 260 });
      spawnObstacle(groundKind(), x + Math.max(330, airTravel + 60));
    } else if (roll < 0.76) {
      // A row of corn on the ground, free food.
      for (let i = 0; i < 4; i += 1) spawnPickup(KIND_CORN, x + i * 52, GROUND_Y - 46);
      if (random.chance(0.35)) spawnObstacle(groundKind(), x + 300);
    } else if (roll < 0.84) {
      // A mud puddle that slows the run, then a bale.
      spawnObstacle(KIND_PUDDLE, x, { y: GROUND_Y - 14, width: 140, height: 14 });
      spawnObstacle(KIND_BALE, x + Math.max(260, airTravel * 0.7));
    } else if (roll < 0.92 && difficulty > 0.15) {
      // Golden feather, high up: a well-timed double jump earns 3 s of safety.
      spawnPickup(KIND_FEATHER, x + 60, GROUND_Y - 240);
      spawnObstacle(groundKind(), x + Math.max(200, airTravel * 0.6));
    } else if (roll < 0.96) {
      // Pumpkin pie, rare and worth a heart.
      spawnPickup(KIND_PIE, x + 40, GROUND_Y - 170);
      spawnObstacle(KIND_OVEN, x + Math.max(220, airTravel * 0.6));
    } else {
      // The oven, alone and roaring: the signature hazard.
      spawnObstacle(KIND_OVEN, x);
      spawnPickup(KIND_CORN, x - 60, GROUND_Y - 46);
      spawnPickup(KIND_CORN, x + 130, GROUND_Y - 46);
    }
  }

  function doJump() {
    const t = state.turkey;
    // A jump cancels a slide: a turkey that just slid under a knife must be
    // able to hop the bale right behind it.
    t.sliding = false;
    t.slideTimer = 0;
    if (t.y >= GROUND_Y - 0.5 && t.jumps === 0) {
      t.vy = -TURKEY.jumpSpeed;
      t.jumps = 1;
      t.wasAirborne = true;
      return EVENT_JUMP;
    }
    if (t.jumps === 1) {
      t.vy = -TURKEY.doubleJumpSpeed;
      t.jumps = 2;
      burst(TURKEY.x + 32, t.y - 10, '#fff7e0', 6, 120);
      return EVENT_DOUBLE_JUMP;
    }
    return EVENT_NONE;
  }

  function doSlide() {
    const t = state.turkey;
    if (t.y < GROUND_Y - 0.5) {
      // In the air, sliding slams the turkey down fast.
      t.vy = Math.max(t.vy, 900);
      return EVENT_SLIDE;
    }
    if (t.sliding) {
      // Holding the slide: keep it going while the slide input keeps coming,
      // so a slow knife (through a mud puddle) cannot catch the turkey
      // standing up too early.
      t.slideTimer = Math.max(t.slideTimer, 0.12);
      return EVENT_SLIDE;
    }
    t.sliding = true;
    t.slideTimer = TURKEY.slideSeconds;
    return EVENT_SLIDE;
  }

  /** One fixed step of the run. `input` is { jump, slide } edge triggers. */
  function step(dt, input) {
    let events = EVENT_NONE;
    const t = state.turkey;
    state.time += dt;

    if (input.jump) events |= doJump();
    if (input.slide) events |= doSlide();
    // Holding the slide key keeps the slide going, so a slow knife (through
    // a mud puddle) cannot catch the turkey standing up too early.
    if (input.slideHeld && t.y >= GROUND_Y - 0.5 && t.sliding) {
      t.slideTimer = Math.max(t.slideTimer, 0.1);
    }

    // --- turkey vertical motion ---
    const wasAirborne = t.y < GROUND_Y - 0.5;
    t.vy += TURKEY.gravity * dt;
    t.y += t.vy * dt;
    if (t.y >= GROUND_Y) {
      if (wasAirborne && t.vy > 500) {
        events |= EVENT_LAND;
        for (let i = 0; i < 8; i += 1) addParticle(TURKEY.x + 20 + random.range(-10, 50), GROUND_Y, random.range(-60, 60), random.range(-120, -20), 0.35, '#c9a06a', 4);
      }
      t.y = GROUND_Y;
      t.vy = 0;
      t.jumps = 0;
    }
    if (t.sliding) {
      t.slideTimer -= dt;
      if (t.slideTimer <= 0) t.sliding = false;
    }
    if (t.invincibleTimer > 0) t.invincibleTimer -= dt;
    if (t.featherTimer > 0) t.featherTimer -= dt;
    if (state.flashTimer > 0) state.flashTimer -= dt;
    if (state.slowTimer > 0) state.slowTimer -= dt;

    // --- speed, distance, score ---
    const targetSpeed = Math.min(RUN.maxSpeed, RUN.startSpeed + state.metres * RUN.speedPerMetre);
    const slowFactor = state.slowTimer > 0 ? 0.55 : 1;
    const featherFactor = t.featherTimer > 0 ? 1.25 : 1;
    state.speed = targetSpeed * slowFactor * featherFactor;
    state.distancePx += state.speed * dt;
    state.metres = state.distancePx * RUN.metresPerPixel;
    state.score = Math.floor(state.metres) * SCORE.perMetre + state.corn * SCORE.perCorn + state.dodges * SCORE.perDodge;

    // The farmer drifts back while the run is clean, closes in on a hit.
    if (state.gap < FARMER.cleanGapCeiling) state.gap = Math.min(FARMER.cleanGapCeiling, state.gap + FARMER.cleanGapPerSecond * dt);
    t.runCycle += dt * (state.speed / 40);

    // --- spawn patterns ---
    state.spawnInPx -= state.speed * dt;
    if (state.spawnInPx <= 0) {
      spawnPattern();
      const difficulty = Math.min(1, state.metres / 900);
      state.spawnInPx = random.range(SPAWN.minGapPx, SPAWN.maxGapPx) * (1 - difficulty * 0.25);
    }

    // --- move the world left ---
    const move = state.speed * dt;
    for (const o of state.obstacles) {
      o.x -= move + (o.flySpeed ?? 0) * dt;
      if (o.kind === KIND_PUDDLE) {
        const box = turkeyBox();
        if (box.x + box.width > o.x && box.x < o.x + o.width && t.y >= GROUND_Y - 1) state.slowTimer = 0.15;
      }
    }
    for (const p of state.pickups) {
      p.x -= move;
      p.bob += dt * 4;
    }
    state.obstacles = state.obstacles.filter((o) => o.x + o.width > -120);
    state.pickups = state.pickups.filter((p) => p.x + p.width > -80);

    // --- pickups ---
    const box = turkeyBox();
    for (const p of state.pickups) {
      if (p.taken) continue;
      const pbox = { x: p.x, y: p.y + Math.sin(p.bob) * 5, width: p.width, height: p.height };
      if (overlaps(box, pbox)) {
        p.taken = true;
        if (p.kind === KIND_CORN) {
          state.corn += 1;
          state.gap = Math.min(FARMER.maxGap, state.gap + FARMER.cornGapGain);
          events |= EVENT_CORN;
          burst(p.x + 18, p.y + 18, '#ffd94d', 8, 160);
        } else if (p.kind === KIND_FEATHER) {
          t.featherTimer = RUN.featherSeconds;
          state.score += SCORE.perFeather;
          events |= EVENT_FEATHER;
          burst(p.x + 20, p.y + 20, '#ffe98a', 14, 220);
        } else if (p.kind === KIND_PIE) {
          state.hearts = Math.min(RUN.maxHearts, state.hearts + 1);
          state.score += SCORE.perPie;
          events |= EVENT_PIE;
          burst(p.x + 20, p.y + 20, '#ff9d5c', 12, 200);
        }
      }
    }
    state.pickups = state.pickups.filter((p) => !p.taken);

    // --- obstacle collisions and dodges ---
    for (const o of state.obstacles) {
      if (o.kind === KIND_PUDDLE) continue;
      if (!o.passed && o.x + o.width < TURKEY.x) {
        o.passed = true;
        if (!o.hit) {
          state.dodges += 1;
          events |= EVENT_DODGE;
        }
      }
      if (o.hit) continue;
      if (overlaps(box, o)) {
        if (t.featherTimer > 0) {
          // The golden feather smashes straight through.
          o.hit = true;
          burst(o.x + o.width / 2, o.y + o.height / 2, '#ffe98a', 10, 200);
          continue;
        }
        if (t.invincibleTimer > 0) continue;
        o.hit = true;
        state.hearts -= 1;
        state.gap = Math.max(0, state.gap - FARMER.hitGapLoss);
        t.invincibleTimer = RUN.invincibleSeconds;
        state.flashTimer = 0.35;
        events |= EVENT_HIT;
        burst(TURKEY.x + 32, t.y - 40, '#ffffff', 16, 260);
        burst(TURKEY.x + 32, t.y - 40, '#8a5a2b', 10, 200);
        if (state.hearts <= 0 || state.gap <= 0) {
          state.over = true;
          state.screen = 'caught';
          events |= EVENT_CAUGHT;
          return events;
        }
      }
    }

    // --- escape? ---
    if (state.metres >= RUN.escapeMetres) {
      state.over = true;
      state.escaped = true;
      state.screen = 'escaped';
      events |= EVENT_ESCAPED;
      return events;
    }

    // --- dust and particles ---
    state.dustTimer -= dt;
    if (t.y >= GROUND_Y - 0.5 && state.dustTimer <= 0 && !t.sliding) {
      state.dustTimer = 0.09;
      addParticle(TURKEY.x + 8, GROUND_Y - 2, random.range(-40, -10), random.range(-50, -10), 0.4, '#d8b98a', 5);
    }
    if (t.sliding) {
      addParticle(TURKEY.x + 4, GROUND_Y - 2, random.range(-30, 0), random.range(-40, -5), 0.3, '#c9a06a', 4);
    }
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    return events;
  }

  /** The title screen's idle scene: the turkey runs in place, no hazards. */
  function stepAttract(dt) {
    state.time += dt;
    state.distancePx += 220 * dt;
    const t = state.turkey;
    t.runCycle += dt * 6;
    state.dustTimer -= dt;
    if (state.dustTimer <= 0) {
      state.dustTimer = 0.12;
      addParticle(TURKEY.x + 8, GROUND_Y - 2, -30, random.range(-50, -10), 0.4, '#d8b98a', 5);
    }
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function startRun() {
    reset();
    state.screen = 'play';
  }

  return { state, reset, step, stepAttract, startRun, turkeyBox };
}
