// The screenshot scenes behind ?shot=start|play|action|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (jump the ground hazards, slide under flying knives, chase
// corn), so the frame is what a short game really looks like and the same seed
// always gives the same frame.
import { GROUND_Y, TURKEY, STEP } from './config.js';
import { KIND_KNIFE_FLY, KIND_PUDDLE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 21;
const ACTION_SECONDS = 34;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The next hazard of each kind ahead of the turkey, with its time to arrive. */
function hazardsAhead(state) {
  const speed = state.speed;
  let knife = null;
  let ground = null;
  for (const o of state.obstacles) {
    if (o.kind === KIND_PUDDLE) continue;
    if (o.x + o.width < TURKEY.x - 10) continue;
    const timeTo = (o.x - (TURKEY.x + TURKEY.width)) / Math.max(200, speed + (o.flySpeed ?? 0));
    if (o.kind === KIND_KNIFE_FLY) {
      if (knife === null || timeTo < knife.timeTo) knife = { obstacle: o, timeTo };
    } else if (ground === null || timeTo < ground.timeTo) {
      ground = { obstacle: o, timeTo };
    }
  }
  return { knife, ground };
}

/**
 * Steer one step. The jump is the main move: it clears a ground hazard and,
 * once the turkey is above 90 px, a flying knife too — so when a ground
 * hazard and a knife arrive together, jumping beats sliding. Sliding is for
 * a knife on its own. The double jump is a recovery: it fires when the
 * turkey is coming down onto a hazard it would otherwise meet, or when a
 * blade is about to catch it low in the air.
 */
export function autopilot(state) {
  const t = state.turkey;
  const airborne = t.y < GROUND_Y - 0.5;
  const feetHeight = GROUND_Y - t.y;
  const { knife, ground } = hazardsAhead(state);

  // Height the turkey would reach by the time the knife arrives, if it jumped
  // right now (jumpSpeed 1100, gravity 2400: h = 1100*dt - 1200*dt^2).
  const jumpHeightAt = (dt) => 1100 * dt - 1200 * dt * dt;
  const knifeOverlaps = knife !== null && knife.obstacle.x < TURKEY.x + TURKEY.width && knife.obstacle.x + knife.obstacle.width > TURKEY.x;
  const knifeImminent = knife !== null && (knife.timeTo < 0.3 || knifeOverlaps);

  // 1. A ground hazard that must be jumped now. Jump even with a knife near,
  //    as long as the jump carries the turkey above the blade by the time it
  //    arrives (or the knife comes after the turkey has landed and can slide).
  if (ground !== null && !airborne && ground.timeTo < 0.35) {
    const knifeSafe =
      knife === null || knife.timeTo >= 0.92 || jumpHeightAt(Math.max(0, knife.timeTo)) > 90;
    if (knifeSafe || ground.timeTo < 0.15) return { jump: true, slide: false };
    if (knifeImminent) return { jump: false, slide: true };
    return { jump: true, slide: false };
  }
  // 2. Flying knife imminent (it flies at head height: a standing turkey is
  //    hit, a sliding one is safe, and a jumping one is safe only above it).
  if (knifeImminent) {
    if (airborne) {
      if (feetHeight > 90 && t.vy <= 0) return { jump: false, slide: false };
      if (t.jumps === 1 && feetHeight < 200) return { jump: true, slide: false };
      const groundClear = ground === null || ground.timeTo > 0.5 || ground.timeTo < -0.3;
      if (groundClear) return { jump: false, slide: true };
      return { jump: false, slide: false };
    }
    return { jump: false, slide: true };
  }
  // 3. Airborne and coming down onto a hazard it would otherwise meet:
  //    second hop, even if the hazard is already passing underneath.
  if (airborne && t.jumps === 1 && t.vy > 0 && ground !== null && ground.timeTo > -0.6 && ground.timeTo < 0.3 && feetHeight < ground.obstacle.height + 15) {
    return { jump: true, slide: false };
  }
  // 4. Nothing urgent: wait.
  return { jump: false, slide: false };
}

function runFor(state, seconds, world, horizon) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const input = horizon ? autopilot(state) : { jump: false, slide: false };
    world.step(STEP, input);
    if (state.over) break;
  }
}

/**
 * Set `world` to the named scene (start, play, action or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'play') {
    runFor(state, PLAY_SECONDS, world, true);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'action') {
    // A longer run with the farmer already closing in: a dramatic frame.
    state.gap = 45;
    runFor(state, ACTION_SECONDS, world, true);
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'end') {
    // A careless pilot: it jumps far too late and never slides, so it gets caught.
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const { knife, ground } = hazardsAhead(state);
      const input = { jump: false, slide: false };
      if (ground !== null && ground.obstacle.kind !== KIND_KNIFE_FLY && ground.timeTo < 0.06 && state.turkey.jumps === 0) {
        input.jump = true;
      }
      world.step(STEP, input);
      if (state.over) break;
    }
    return { screen: SCREEN_OVER, best: state.score };
  }
  // start: the title scene, turkey running in place.
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepAttract(STEP);
  return { screen: SCREEN_TITLE, best: 0 };
}
