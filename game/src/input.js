// Keyboard and mouse input, kept apart from the world so the autopilot in
// shots.js can drive the same step() with synthetic inputs.
export function makeInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since the last read, edge-triggered
  let pointerJump = false;
  let pointerDown = false;
  let pointerX = 0;
  let pointerY = 0;

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
  const SLIDE_KEYS = ['ArrowDown', 'KeyS'];

  function onKeyDown(event) {
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onPointerDown(event) {
    pointerDown = true;
    pointerJump = true;
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
  }
  function onPointerUp() {
    pointerDown = false;
  }
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointermove', onPointerMove);

  return {
    /** Edge-triggered: true once per physical press until read. */
    consumeJump() {
      const hit = JUMP_KEYS.some((k) => pressed.has(k)) || pointerJump;
      pointerJump = false;
      for (const k of JUMP_KEYS) pressed.delete(k);
      return hit;
    },
    consumeSlide() {
      const hit = SLIDE_KEYS.some((k) => pressed.has(k));
      for (const k of SLIDE_KEYS) pressed.delete(k);
      return hit;
    },
    consumeKey(code) {
      const hit = pressed.has(code);
      pressed.delete(code);
      return hit;
    },
    slideHeld() {
      return SLIDE_KEYS.some((k) => keys.has(k));
    },
    pointer() {
      return { x: pointerX, y: pointerY, down: pointerDown };
    },
    /** A click / tap anywhere: used to start and restart from buttons. */
    consumePointerTap() {
      const hit = pointerJump;
      pointerJump = false;
      return hit;
    },
  };
}
