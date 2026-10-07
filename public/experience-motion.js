/** Progressive presentation only. No navigation, data, storage or economic state. */
export function enhanceExperience({
  document = globalThis.document,
  window = globalThis.window,
} = {}) {
  if (!document?.documentElement || !window?.matchMedia)
    return { destroy() {} };
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const active = new Set(),
    seen = new WeakSet(),
    listeners = [];
  let destroyed = false,
    manuallyPaused =
      document.querySelector("#art-pause")?.getAttribute("aria-pressed") ===
      "true";
  let readingFrame = null,
    pointerFrame = null,
    pendingPointer = null,
    litSurface = null,
    observer;
  const allowed = () =>
    !destroyed && !reduced.matches && !manuallyPaused && !document.hidden;
  const listen = (target, type, callback, options) => {
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  };
  const cancelAnimations = () => {
    for (const animation of active) animation.cancel();
    active.clear();
  };
  function play(element, { delay = 0, duration = 560, distance = 14 } = {}) {
    if (!element || !allowed() || typeof element.animate !== "function") return;
    const animation = element.animate(
      [
        { opacity: 0.72, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "none" },
    );
    active.add(animation);
    // Cancellation rejects finished; neither success nor failure changes content.
    Promise.resolve(animation.finished)
      .catch(() => {})
      .finally(() => active.delete(animation));
  }
  const progress = document.createElement("div");
  progress.className = "mew-reading-progress";
  progress.setAttribute("aria-hidden", "true");
  const line = document.createElement("span");
  progress.append(line);
  document.body.append(progress);
  function renderProgress() {
    readingFrame = null;
    if (destroyed || document.hidden) return;
    const scroll = document.scrollingElement ?? root;
    const total = Math.max(0, scroll.scrollHeight - window.innerHeight);
    const fraction =
      total > 0 ? Math.min(1, Math.max(0, scroll.scrollTop / total)) : 0;
    line.style.transform = `scaleX(${fraction})`;
    progress.hidden = total <= 0;
  }
  function queueProgress() {
    if (!destroyed && !document.hidden && readingFrame === null)
      readingFrame = window.requestAnimationFrame(renderProgress);
  }
  const surfaces =
    ".pilot-card,.proof-grid article,.evidence-grid article,.protocol-release article,.brief-panel,[data-motion-surface]";
  function clearPointer() {
    if (pointerFrame !== null) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    pendingPointer = null;
    if (litSurface) {
      litSurface.classList.remove("mew-motion-surface");
      litSurface.style.removeProperty("--mew-pointer-x");
      litSurface.style.removeProperty("--mew-pointer-y");
      litSurface = null;
    }
  }
  function renderPointer() {
    pointerFrame = null;
    const next = pendingPointer;
    pendingPointer = null;
    if (!next || !allowed() || !pointer.matches) return;
    if (litSurface !== next.element) clearPointer();
    litSurface = next.element;
    const bounds = litSurface.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      clearPointer();
      return;
    }
    litSurface.style.setProperty(
      "--mew-pointer-x",
      `${Math.min(100, Math.max(0, (100 * (next.x - bounds.left)) / bounds.width))}%`,
    );
    litSurface.style.setProperty(
      "--mew-pointer-y",
      `${Math.min(100, Math.max(0, (100 * (next.y - bounds.top)) / bounds.height))}%`,
    );
    litSurface.classList.add("mew-motion-surface");
  }
  function movePointer(event) {
    if (!allowed() || !pointer.matches || event.pointerType === "touch") return;
    const element = event.target?.closest?.(surfaces);
    if (
      !element ||
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY)
    ) {
      clearPointer();
      return;
    }
    pendingPointer = { element, x: event.clientX, y: event.clientY };
    if (pointerFrame === null)
      pointerFrame = window.requestAnimationFrame(renderPointer);
  }
  const entrances = [
    ...document.querySelectorAll(
      "main > section .section-head,main > section > h2,.proof-grid article,.evidence-grid article,.pilot-grid > a,.protocol-release article,.pilot-offer li",
    ),
  ];
  function watchEntrances() {
    observer?.disconnect();
    if (!allowed() || typeof window.IntersectionObserver !== "function") return;
    observer ??= new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || seen.has(entry.target)) continue;
          seen.add(entry.target);
          observer.unobserve(entry.target);
          const siblings = entry.target.parentElement?.children;
          const index = siblings
            ? Math.max(0, [...siblings].indexOf(entry.target))
            : 0;
          play(entry.target, {
            delay: Math.min(index * 65, 195),
            duration: 600,
            distance: 18,
          });
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -24px 0px" },
    );
    for (const element of entrances)
      if (!seen.has(element)) observer.observe(element);
  }
  function syncPreference() {
    root.classList.toggle("mew-experience-paused", !allowed());
    if (!allowed()) {
      cancelAnimations();
      clearPointer();
      observer?.disconnect();
      if (readingFrame !== null) window.cancelAnimationFrame(readingFrame);
      readingFrame = null;
      if (!document.hidden) renderProgress();
    } else {
      watchEntrances();
      queueProgress();
    }
  }
  listen(reduced, "change", syncPreference);
  listen(pointer, "change", clearPointer);
  listen(document, "visibilitychange", syncPreference);
  listen(document, "mew:motion-preference", (event) => {
    if (typeof event.detail?.paused !== "boolean") return;
    manuallyPaused = event.detail.paused;
    syncPreference();
  });
  listen(document, "pointermove", movePointer, { passive: true });
  listen(
    document,
    "pointerout",
    (event) => {
      if (litSurface && !litSurface.contains(event.relatedTarget))
        clearPointer();
    },
    { passive: true },
  );
  listen(document, "pointercancel", clearPointer, { passive: true });
  listen(window, "scroll", queueProgress, { passive: true });
  listen(window, "resize", queueProgress, { passive: true });
  listen(document, "mew:ui-update", queueProgress);
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimations();
    clearPointer();
    observer?.disconnect();
    if (readingFrame !== null) window.cancelAnimationFrame(readingFrame);
    readingFrame = null;
    for (const remove of listeners) remove();
    progress.remove();
    root.classList.remove("mew-experience-paused");
  }
  listen(window, "pagehide", destroy, { once: true });
  syncPreference();
  const hero = [
    ...document.querySelectorAll(
      ".hero-copy > .eyebrow,.hero-copy > h1,.hero-copy > .lead,.hero-copy > .actions,.protocol-heading > :not(.protocol-mode)",
    ),
  ];
  hero.forEach((element, index) =>
    play(element, { delay: Math.min(index * 70, 280), duration: 660 }),
  );
  play(document.querySelector(".hero > .sculpture"), {
    delay: 160,
    duration: 840,
    distance: 20,
  });
  return { destroy };
}

export function mountExperience(environment = {}) {
  const win = environment.window ?? globalThis.window;
  let current = enhanceExperience(environment);
  if (!win) return current;
  let removed = false;
  const restore = (event) => {
    if (!event.persisted || removed) return;
    // Idempotent even if a host emits repeated restore events.
    current.destroy();
    current = enhanceExperience(environment);
  };
  win.addEventListener("pageshow", restore);
  return {
    destroy() {
      if (removed) return;
      removed = true;
      win.removeEventListener("pageshow", restore);
      current.destroy();
    },
  };
}

if (typeof document !== "undefined" && typeof window !== "undefined")
  mountExperience();
