// Gobble Dash tuning: one place for every number the world and renderer share.
// The game runs on a fixed 1280x720 stage, scaled to the window by main.js.
export const STAGE = { width: 1280, height: 720 };
export const GROUND_Y = 600; // top of the dirt the turkey runs on
export const STEP = 1 / 60; // fixed simulation step, seconds

export const TURKEY = {
  x: 300, // screen position; the world scrolls past it
  width: 64,
  height: 74,
  slideHeight: 36,
  gravity: 2400,
  jumpSpeed: 1100,
  doubleJumpSpeed: 860,
  slideSeconds: 0.5,
};

export const FARMER = {
  startGap: 55, // 0 = caught, 100 = safely far behind
  maxGap: 100,
  hitGapLoss: 22,
  cornGapGain: 4,
  cleanGapPerSecond: 1.4,
  cleanGapCeiling: 70,
  warnGap: 25, // below this the HUD flashes a warning
};

export const RUN = {
  startSpeed: 380, // px/s of world scroll
  speedPerMetre: 0.22, // the run gets faster as the turkey gets further
  maxSpeed: 720,
  metresPerPixel: 1 / 40, // 40 px of scroll = 1 metre of escape
  escapeMetres: 1200, // reach the forest gate and the turkey is free
  startHearts: 3,
  maxHearts: 3,
  invincibleSeconds: 1.6, // grace after a hit
  featherSeconds: 3, // golden feather: invincible + fast
};

export const SCORE = {
  perMetre: 10,
  perCorn: 50,
  perFeather: 100,
  perDodge: 25, // clearing an obstacle without a hit
  perPie: 150,
};

// Spawn pacing: a new pattern starts this far after the last one, in px of scroll.
export const SPAWN = { minGapPx: 520, maxGapPx: 880 };
