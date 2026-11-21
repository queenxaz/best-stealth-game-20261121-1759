// input.js — keyboard and mouse for EMBERWATCH. WASD or arrows to move,
// Shift to sneak, Q or click to toss a pebble toward the mouse, P or Escape
// to pause, M to mute, Enter to start. All state lives here so the game loop
// just reads it.

export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    ax: 0,
    ay: 0,
    sneak: false,
    mouseX: 0,
    mouseY: 0,
    // Edge-triggered actions, consumed by the game each frame:
    pebbleQueued: false,
    pebbleTarget: null,
    pausePressed: false,
    confirmPressed: false,
    mutePressed: false,
    restartPressed: false,
  };

  const updateAxes = () => {
    let ax = 0;
    let ay = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) ax += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) ay -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) ay += 1;
    input.ax = ax;
    input.ay = ay;
    input.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyQ') {
      input.pebbleQueued = true;
      input.pebbleTarget = { x: input.mouseX, y: input.mouseY };
    }
    if (e.code === 'KeyP' || e.code === 'Escape') input.pausePressed = true;
    if (e.code === 'Enter' || e.code === 'Space') input.confirmPressed = true;
    if (e.code === 'KeyM') input.mutePressed = true;
    if (e.code === 'KeyR') input.restartPressed = true;
    updateAxes();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    updateAxes();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    updateAxes();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    input.pebbleQueued = true;
    input.pebbleTarget = { x: input.mouseX, y: input.mouseY };
  });

  // The game consumes these once per frame so a single press never double-fires.
  input.consumeEdges = () => {
    const edges = {
      pebbleQueued: input.pebbleQueued,
      pebbleTarget: input.pebbleTarget,
      pausePressed: input.pausePressed,
      confirmPressed: input.confirmPressed,
      mutePressed: input.mutePressed,
      restartPressed: input.restartPressed,
    };
    input.pebbleQueued = false;
    input.pausePressed = false;
    input.confirmPressed = false;
    input.mutePressed = false;
    input.restartPressed = false;
    return edges;
  };

  return input;
}
