// Original MEW concept artwork. No network requests, data collection or economic actions.
const TAU = Math.PI * 2;
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const decisions = new Set([
  "READY",
  "ALLOW",
  "UNKNOWN",
  "DEFER",
  "UNAVAILABLE",
]);
const mounted = new WeakMap();

export function motionAllowed({
  ready,
  paused,
  reduced,
  hidden,
  visible,
  disposed,
}) {
  return (
    ready === true && !paused && !reduced && !hidden && visible && !disposed
  );
}

/** Deterministic geometry, deliberately independent of wall-clock/network state. */
export function kineticGeometry({
  time = 0,
  pointerX = 0,
  pointerY = 0,
  coarse = false,
  decision = "READY",
} = {}) {
  if (![time, pointerX, pointerY].every(Number.isFinite))
    throw Error("Invalid artwork geometry");
  const state = decisions.has(decision) ? decision : "READY";
  const tilt =
    0.78 + clamp(pointerY, -1, 1) * 0.09 + Math.sin(time * 0.19) * 0.035;
  const yaw = -0.24 + clamp(pointerX, -1, 1) * 0.12;
  const spin = time * 0.14,
    ribs = coarse ? 56 : 88,
    sides = coarse ? 8 : 12;
  const rotate = (x, y, z) => {
    const a = y * Math.cos(tilt) - z * Math.sin(tilt),
      b = y * Math.sin(tilt) + z * Math.cos(tilt);
    return {
      x: x * Math.cos(yaw) + b * Math.sin(yaw),
      y: a,
      z: -x * Math.sin(yaw) + b * Math.cos(yaw),
    };
  };
  const project = (p) => {
    const scale = 760 / (760 - p.z);
    return { x: 280 + p.x * scale, y: 236 + p.y * scale, z: p.z };
  };
  const point = (u, v) => {
    const major = 135,
      minor = 29 + Math.sin(u * 3 + time * 0.2) * 1.6;
    const angle = u + spin;
    return project(
      rotate(
        (major + minor * Math.cos(v)) * Math.cos(angle),
        (major + minor * Math.cos(v)) * Math.sin(angle),
        minor * Math.sin(v),
      ),
    );
  };
  const faces = [];
  for (let i = 0; i < ribs; i++)
    for (let j = 0; j < sides; j++) {
      const u = (i / ribs) * TAU,
        v = (j / sides) * TAU;
      const points = [
        point(u, v),
        point(u + TAU / ribs, v),
        point(u + TAU / ribs, v + TAU / sides),
        point(u, v + TAU / sides),
      ];
      const normal = rotate(
        Math.cos(u + spin) * Math.cos(v + 0.25),
        Math.sin(u + spin) * Math.cos(v + 0.25),
        Math.sin(v + 0.25),
      );
      const light = clamp(
        (normal.x * -0.45 + normal.y * -0.7 + normal.z * 0.6 + 1) / 2,
        0,
        1,
      );
      const glint = Math.pow(light, 8) * 38,
        wave = (Math.sin(u * 3 - time * 0.35) + 1) * 0.5;
      const rgb = [
        clamp(62 + light * 132 + glint + wave * 12, 0, 255),
        clamp(58 + light * 140 + glint, 0, 255),
        clamp(137 + light * 94 + glint, 0, 255),
      ].map(Math.round);
      faces.push({
        points,
        z: points.reduce((n, p) => n + p.z, 0) / 4,
        fill: `rgb(${rgb.join(",")})`,
        edge: j === sides - 1 && i % 2 === 0,
      });
    }
  faces.sort((a, b) => a.z - b.z);
  const paths = [];
  for (let k = 0; k < 3; k++) {
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * TAU,
        angle = k * 0.84 + 0.24,
        r = 194 + k * 10;
      const x = Math.cos(t) * r,
        y = Math.sin(t) * r * 0.68,
        z = Math.sin(t) * r * 0.44;
      points.push(
        project(
          rotate(
            x * Math.cos(angle) - y * Math.sin(angle),
            x * Math.sin(angle) + y * Math.cos(angle),
            z,
          ),
        ),
      );
    }
    paths.push(points);
  }
  return { faces, paths, core: project(rotate(0, 0, 0)), state };
}

export function drawKineticArt(
  ctx,
  { width, height, dpr, time, pointerX, pointerY, coarse, decision },
) {
  if (
    !ctx ||
    ![width, height, dpr].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    dpr <= 0
  )
    throw Error("Invalid art canvas");
  const { faces, paths, core, state } = kineticGeometry({
    time,
    pointerX,
    pointerY,
    coarse,
    decision,
  });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(width / 560, height / 470);
  const haze = ctx.createRadialGradient(280, 236, 20, 280, 236, 210);
  haze.addColorStop(0, "rgba(180,165,246,.10)");
  haze.addColorStop(0.6, "rgba(210,202,245,.06)");
  haze.addColorStop(1, "rgba(240,238,250,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(20, 10, 520, 450);
  // A quiet floor anchors the object; geometry is illustrative rather than a data feed.
  ctx.strokeStyle = "rgba(57,54,92,.075)";
  ctx.lineWidth = 0.6;
  for (let i = -7; i <= 7; i++) {
    ctx.beginPath();
    ctx.moveTo(280 + i * 25 - 175, 358 - 78);
    ctx.lineTo(280 + i * 25 + 175, 358 + 78);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(280 + i * 25 - 175, 358 + 78);
    ctx.lineTo(280 + i * 25 + 175, 358 - 78);
    ctx.stroke();
  }
  const shadow = ctx.createRadialGradient(282, 362, 5, 282, 362, 150);
  shadow.addColorStop(0, "rgba(66,44,100,.15)");
  shadow.addColorStop(1, "rgba(66,44,100,0)");
  ctx.save();
  ctx.translate(0, 220);
  ctx.scale(1, 0.4);
  ctx.fillStyle = shadow;
  ctx.fillRect(80, 150, 400, 440);
  ctx.restore();
  paths.forEach((path, k) => {
    ctx.strokeStyle = k === 1 ? "rgba(120,95,198,.34)" : "rgba(94,147,132,.32)";
    ctx.lineWidth = k === 1 ? 1.1 : 0.95;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  });
  let coreDrawn = false;
  const paintCore = () => {
    const radius = 58,
      g = ctx.createRadialGradient(
        core.x - 20,
        core.y - 27,
        2,
        core.x,
        core.y,
        radius,
      );
    const unknown = state === "UNKNOWN" || state === "UNAVAILABLE";
    g.addColorStop(0, "#fbfff8");
    g.addColorStop(0.22, "#e5f1df");
    g.addColorStop(0.62, unknown ? "#d7d9d0" : "#b9dec8");
    g.addColorStop(1, unknown ? "#859083" : "#699d89");
    ctx.beginPath();
    ctx.arc(core.x, core.y, radius, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(core.x - 3, core.y - 4, radius - 5, 3.6, 5.7);
    ctx.stroke();
    ctx.strokeStyle = "rgba(65,100,81,.2)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(core.x, core.y, 47, 18, -0.2, 0, TAU);
    ctx.stroke();
    // One stable core: decorative mark, not a progress/confirmation indicator.
    ctx.strokeStyle = "rgba(42,81,67,.48)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(core.x - 9, core.y);
    ctx.lineTo(core.x + 9, core.y);
    ctx.moveTo(core.x, core.y - 9);
    ctx.lineTo(core.x, core.y + 9);
    ctx.stroke();
  };
  for (const face of faces) {
    if (!coreDrawn && face.z >= core.z) {
      paintCore();
      coreDrawn = true;
    }
    ctx.beginPath();
    face.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    ctx.strokeStyle = face.edge
      ? "rgba(240,239,255,.6)"
      : "rgba(54,37,104,.12)";
    ctx.lineWidth = face.edge ? 0.85 : 0.35;
    ctx.stroke();
  }
  if (!coreDrawn) paintCore();
  // Three clearly decorative path anchors, never alleged agent/payment events.
  paths.forEach((path, k) => {
    const p = path[[12, 57, 84][k]];
    ctx.beginPath();
    ctx.arc(p.x, p.y, k === 1 ? 6 : 5, 0, TAU);
    ctx.fillStyle = k === 1 ? "#9186c8" : "#7ea58f";
    ctx.fill();
    ctx.strokeStyle = "rgba(252,252,248,.9)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });
  ctx.restore();
}

/** Progressive enhancement. Existing accessible SVG and caption remain the fallback. */
export function mountKineticArt(
  figure,
  { window: win = globalThis.window, document: doc = globalThis.document } = {},
) {
  if (!figure || !win || !doc || mounted.has(figure))
    return mounted.get(figure) ?? null;
  const svg = figure.querySelector(".mandate-sculpture");
  if (!svg) return null;
  const canvas = doc.createElement("canvas");
  canvas.className = "kinetic-canvas";
  canvas.setAttribute("aria-hidden", "true");
  let ctx;
  try {
    ctx = canvas.getContext("2d", { alpha: true });
  } catch {
    return null;
  }
  if (!ctx) return null;
  const stage = doc.createElement("div");
  stage.className = "kinetic-stage";
  svg.parentNode.insertBefore(stage, svg);
  stage.append(svg, canvas);
  const media = win.matchMedia("(prefers-reduced-motion: reduce)"),
    coarseMedia = win.matchMedia("(pointer: coarse)");
  let disposed = false,
    visible = true,
    frame = null,
    last = 0,
    lastDraw = -Infinity,
    elapsed = 0,
    width = 0,
    height = 0,
    pointerX = 0,
    pointerY = 0,
    targetX = 0,
    targetY = 0;
  const cleanups = [];
  const canAnimate = () =>
    motionAllowed({
      ready: figure.dataset.motionReady === "true",
      paused: figure.classList.contains("is-paused"),
      reduced: media.matches,
      hidden: doc.hidden,
      visible,
      disposed,
    });
  const stop = () => {
    if (frame !== null) {
      win.cancelAnimationFrame(frame);
      frame = null;
    }
    last = 0;
  };
  const render = () => {
    if (disposed || width <= 0 || height <= 0) return false;
    try {
      drawKineticArt(ctx, {
        width,
        height,
        dpr: Math.min(
          win.devicePixelRatio || 1,
          coarseMedia.matches ? 1.35 : 1.8,
        ),
        time: elapsed / 1000,
        pointerX,
        pointerY,
        coarse: coarseMedia.matches,
        decision: figure.dataset.decision ?? "READY",
      });
      stage.classList.add("is-rendered");
      return true;
    } catch {
      dispose();
      return false;
    }
  };
  const tick = (t) => {
    frame = null;
    if (!canAnimate()) {
      stop();
      return;
    }
    const dt = last ? Math.min(t - last, 80) : 0;
    last = t;
    elapsed += dt;
    if (t - lastDraw >= (coarseMedia.matches ? 1000 / 24 : 1000 / 30)) {
      pointerX += (targetX - pointerX) * 0.08;
      pointerY += (targetY - pointerY) * 0.08;
      if (!render()) return;
      lastDraw = t;
    }
    frame = win.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (!canAnimate()) {
      stop();
      return;
    }
    if (frame === null) frame = win.requestAnimationFrame(tick);
  };
  const resize = () => {
    if (disposed) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      stop();
      return;
    }
    width = Math.min(rect.width, 900);
    height = (width * 470) / 560;
    const dpr = Math.min(
      win.devicePixelRatio || 1,
      coarseMedia.matches ? 1.35 : 1.8,
    );
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    render();
    sync();
  };
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options);
    cleanups.push(() => target.removeEventListener(event, fn, options));
  };
  const resetPointer = () => {
    targetX = 0;
    targetY = 0;
  };
  listen(
    stage,
    "pointermove",
    (event) => {
      if (!canAnimate() || coarseMedia.matches || event.pointerType === "touch")
        return;
      const r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      targetX = clamp(((event.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      targetY = clamp(((event.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    },
    { passive: true },
  );
  listen(stage, "pointerleave", resetPointer);
  listen(media, "change", () => {
    resetPointer();
    sync();
  });
  listen(coarseMedia, "change", resize);
  listen(doc, "visibilitychange", sync);
  const mutation = win.MutationObserver
    ? new win.MutationObserver(() => {
        if (!disposed) {
          if (canAnimate()) sync();
          else {
            stop();
            if (!doc.hidden && visible) render();
          }
        }
      })
    : null;
  mutation?.observe(figure, {
    attributes: true,
    attributeFilter: ["class", "data-decision", "data-motion-ready"],
  });
  const visibility = win.IntersectionObserver
    ? new win.IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? false;
          sync();
        },
        { threshold: 0.05 },
      )
    : null;
  const rect = figure.getBoundingClientRect();
  visible = rect.bottom > 0 && rect.top < (win.innerHeight || 1000);
  visibility?.observe(figure);
  const sizing = win.ResizeObserver ? new win.ResizeObserver(resize) : null;
  sizing?.observe(stage);
  if (!sizing) listen(win, "resize", resize);
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    mutation?.disconnect();
    visibility?.disconnect();
    sizing?.disconnect();
    cleanups.forEach((fn) => fn());
    stage.classList.remove("is-rendered");
    stage.parentNode?.insertBefore(svg, stage);
    stage.remove();
    mounted.delete(figure);
  }
  listen(win, "pagehide", dispose, { once: true });
  const handle = { dispose, sync, resize };
  mounted.set(figure, handle);
  resize();
  return disposed ? null : handle;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const boot = () =>
    document
      .querySelectorAll("figure.sculpture")
      .forEach((figure) => mountKineticArt(figure));
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  // pagehide disposes; bfcache restoration creates a fresh bounded renderer.
  window.addEventListener("pageshow", boot);
}
