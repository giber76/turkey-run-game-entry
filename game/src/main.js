// Gobble Dash — the game loop: screens, input, sound cues, the best score,
// and the ?shot= start|play|action|end scenes the screenshots are taken from.
import { STAGE, STEP } from './config.js';
import { makeWorld, EVENT_JUMP, EVENT_DOUBLE_JUMP, EVENT_SLIDE, EVENT_CORN, EVENT_FEATHER, EVENT_PIE, EVENT_DODGE, EVENT_HIT, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_LAND } from './world.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? 1) || 1;
const shotName = params.get('shot');
const shotMode = shotName !== null;

const world = makeWorld(seed);
const input = makeInput(canvas);
const audio = makeAudio();

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number(window.localStorage.getItem('gobble-dash-best') ?? 0) || 0;
} catch {
  best = 0;
}
let paused = false;
let time = 0;
let accumulator = 0;
let last = performance.now();

function saveBest() {
  if (world.state.score > best) {
    best = world.state.score;
    try {
      window.localStorage.setItem('gobble-dash-best', String(best));
    } catch {
      // Private mode: the best score just lives for this session.
    }
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function handleEvents(events) {
  if (events & EVENT_JUMP) audio.jump();
  if (events & EVENT_DOUBLE_JUMP) audio.doubleJump();
  if (events & EVENT_SLIDE) audio.slide();
  if (events & EVENT_LAND) audio.gobble();
  if (events & EVENT_CORN) audio.corn();
  if (events & EVENT_FEATHER) audio.feather();
  if (events & EVENT_PIE) audio.pie();
  if (events & EVENT_DODGE) audio.dodge();
  if (events & EVENT_HIT) {
    audio.hit();
    announce(`Ouch! ${world.state.hearts} ${world.state.hearts === 1 ? 'life' : 'lives'} left.`);
  }
  if (events & EVENT_CAUGHT) {
    saveBest();
    audio.caught();
    announce(`Caught! The farmer got you at ${Math.floor(world.state.metres)} metres. Score ${world.state.score}.`);
  }
  if (events & EVENT_ESCAPED) {
    saveBest();
    audio.escaped();
    announce(`Escaped! You reached the forest. Score ${world.state.score}.`);
  }
}

function resize() {
  const scale = Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
  const width = Math.floor(STAGE.width * scale);
  const height = Math.floor(STAGE.height * scale);
  canvas.width = STAGE.width;
  canvas.height = STAGE.height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
}
window.addEventListener('resize', resize);
resize();

function startRun() {
  audio.unlock();
  audio.click();
  world.startRun();
  screen = SCREEN_PLAY;
  paused = false;
  announce('Run! Jump the bales, fences and ovens, slide under the flying knives, eat the corn.');
}

function backToTitle() {
  world.reset();
  world.state.screen = 'title';
  screen = SCREEN_TITLE;
  announce('Gobble Dash. Press space or click to run.');
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += elapsed;

  if (input.consumeKey('KeyM')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (input.consumeKey('KeyP') && screen === SCREEN_PLAY) {
    paused = !paused;
    announce(paused ? 'Paused.' : 'Running!');
  }

  if (screen === SCREEN_TITLE) {
    if (input.consumeJump() || input.consumeKey('Enter')) startRun();
    else world.stepAttract(elapsed);
  } else if (screen === SCREEN_PLAY) {
    if (paused) {
      // Frozen frame; still draw so the pause is visible.
    } else {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, {
          jump: input.consumeJump(),
          slide: input.consumeSlide(),
          slideHeld: input.slideHeld(),
        });
        handleEvents(events);
        if (world.state.over) {
          screen = SCREEN_OVER;
          break;
        }
      }
    }
  } else if (screen === SCREEN_OVER) {
    if (input.consumeKey('KeyR') || input.consumeJump()) startRun();
    else if (input.consumeKey('Escape')) backToTitle();
  }

  render(ctx, world.state, screen, best, time);

  if (paused && screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(20,12,6,0.6)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 56px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', STAGE.width / 2, 340);
    ctx.fillStyle = '#fff3d0';
    ctx.font = 'bold 24px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Press P to keep running', STAGE.width / 2, 390);
    ctx.textAlign = 'left';
  }
}

if (shotMode) {
  // A still scene for a screenshot: stage it once, draw it once.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
  time = 12.6; // keeps the blinking "press space" prompt visible in stills
  // Debug handle for the screenshot driver: the staged state, so it can pick
  // the best seed for each scene.
  window.__shot = { state: world.state, screen, best };
  render(ctx, world.state, screen, best, time);
  document.title = `Gobble Dash — shot ${shotName}`;
} else {
  announce('Gobble Dash. Press space or click to run.');
  requestAnimationFrame(frame);
}
