import test from "node:test";
import assert from "node:assert/strict";
import {
  enhanceExperience,
  mountExperience,
} from "../public/experience-motion.js";

function target() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emit(type, event = {}) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((n, set) => n + set.size, 0);
    },
  };
}
function node() {
  const classes = new Set(),
    properties = new Map();
  return {
    children: [],
    attrs: {},
    removed: false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle(c, flag) {
        flag ? classes.add(c) : classes.delete(c);
      },
    },
    style: {
      setProperty: (k, v) => properties.set(k, v),
      removeProperty: (k) => properties.delete(k),
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k];
    },
    append(child) {
      this.children.push(child);
    },
    remove() {
      this.removed = true;
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 100, height: 200 };
    },
    contains(other) {
      return other === this;
    },
    properties,
  };
}
function page({
  reduce = false,
  fine = true,
  waapi = true,
  intersections = true,
  mounted = false,
} = {}) {
  const doc = target(),
    win = target(),
    root = node(),
    body = node(),
    card = node();
  const hero = [node(), node(), node()],
    animations = [],
    observers = [],
    frames = new Map();
  let frameId = 0;
  const reduced = Object.assign(target(), { matches: reduce }),
    pointer = Object.assign(target(), { matches: fine });
  const animate = () => {
    const animation = {
      cancelled: 0,
      finished: new Promise(() => {}),
      cancel() {
        this.cancelled++;
      },
    };
    animations.push(animation);
    return animation;
  };
  if (waapi) for (const el of [...hero, card]) el.animate = animate;
  card.closest = () => card;
  doc.documentElement = root;
  doc.body = body;
  doc.hidden = false;
  doc.scrollingElement = { scrollHeight: 1600, scrollTop: 0 };
  doc.createElement = () => node();
  doc.querySelector = () => null;
  doc.querySelectorAll = (selector) =>
    selector.includes(".hero-copy") ? hero : [card];
  win.innerHeight = 800;
  win.matchMedia = (query) => (query.includes("reduced") ? reduced : pointer);
  win.requestAnimationFrame = (fn) => {
    const id = ++frameId;
    frames.set(id, fn);
    return id;
  };
  win.cancelAnimationFrame = (id) => frames.delete(id);
  if (intersections)
    win.IntersectionObserver = class {
      constructor(fn) {
        this.fn = fn;
        this.watched = new Set();
        this.disconnected = false;
        observers.push(this);
      }
      observe(el) {
        this.watched.add(el);
        this.disconnected = false;
      }
      unobserve(el) {
        this.watched.delete(el);
      }
      disconnect() {
        this.watched.clear();
        this.disconnected = true;
      }
      intersect(el) {
        if (this.watched.has(el))
          this.fn([{ target: el, isIntersecting: true }]);
      }
    };
  const control = (mounted ? mountExperience : enhanceExperience)({
    document: doc,
    window: win,
  });
  const flush = () => {
    const jobs = [...frames.values()];
    frames.clear();
    for (const fn of jobs) fn();
  };
  return {
    doc,
    win,
    root,
    body,
    card,
    hero,
    animations,
    observers,
    reduced,
    pointer,
    control,
    frames,
    flush,
  };
}

test("reduced motion keeps visible elements and reading position without entrances", () => {
  const p = page({ reduce: true });
  assert.equal(p.animations.length, 0);
  assert.equal(p.observers.length, 0);
  assert.equal(p.root.classList.contains("mew-experience-paused"), true);
  p.doc.scrollingElement.scrollTop = 400;
  p.win.emit("scroll");
  p.flush();
  assert.equal(p.body.children[0].children[0].style.transform, "scaleX(0.5)");
  assert.equal(
    p.hero.some((el) => el.style.opacity === "0"),
    false,
  );
  p.control.destroy();
});

test("manual pause cancels effects and pending work; resume never replays hero", () => {
  const p = page();
  const starts = p.animations.length;
  assert.equal(starts, 3);
  assert.equal(p.frames.size, 1);
  p.doc.emit("mew:motion-preference", { detail: { paused: true } });
  assert.equal(
    p.animations.every((a) => a.cancelled === 1),
    true,
  );
  assert.equal(p.frames.size, 0);
  assert.equal(p.observers[0].disconnected, true);
  p.observers[0].intersect(p.card);
  assert.equal(p.animations.length, starts);
  p.doc.emit("mew:motion-preference", { detail: { paused: false } });
  p.observers[0].intersect(p.card);
  assert.equal(p.animations.length, starts + 1);
  p.observers[0].intersect(p.card);
  assert.equal(p.animations.length, starts + 1);
  p.control.destroy();
});

test("live reduced-motion changes and hidden documents cancel finite animations", () => {
  const p = page();
  p.flush();
  p.reduced.matches = true;
  p.reduced.emit("change");
  assert.equal(
    p.animations.every((a) => a.cancelled === 1),
    true,
  );
  p.reduced.matches = false;
  p.reduced.emit("change");
  p.observers[0].intersect(p.card);
  assert.equal(p.animations.length, 4);
  p.doc.hidden = true;
  p.doc.emit("visibilitychange");
  assert.equal(p.animations[3].cancelled, 1);
  assert.equal(p.frames.size, 0);
  p.win.emit("scroll");
  assert.equal(p.frames.size, 0);
  p.control.destroy();
});

test("reading updates coalesce, clamp and never enqueue a continuing frame loop", () => {
  const p = page();
  p.flush();
  p.doc.scrollingElement.scrollTop = 900;
  p.win.emit("scroll");
  p.win.emit("scroll");
  p.win.emit("resize");
  assert.equal(p.frames.size, 1);
  p.flush();
  assert.equal(p.frames.size, 0);
  assert.equal(p.body.children[0].children[0].style.transform, "scaleX(1)");
  p.doc.scrollingElement.scrollTop = -40;
  p.win.emit("scroll");
  p.flush();
  assert.equal(p.body.children[0].children[0].style.transform, "scaleX(0)");
  p.doc.scrollingElement.scrollHeight = 800;
  p.win.emit("resize");
  p.flush();
  assert.equal(p.body.children[0].hidden, true);
  p.control.destroy();
});

test("surface feedback is fine-pointer only and cancels on pause or departure", () => {
  const p = page({ fine: false });
  p.flush();
  const move = {
    target: p.card,
    pointerType: "mouse",
    clientX: 60,
    clientY: 120,
  };
  p.doc.emit("pointermove", move);
  assert.equal(p.frames.size, 0);
  p.pointer.matches = true;
  p.pointer.emit("change");
  p.doc.emit("pointermove", { ...move, pointerType: "touch" });
  assert.equal(p.frames.size, 0);
  p.doc.emit("pointermove", move);
  p.doc.emit("pointermove", { ...move, clientX: 100 });
  assert.equal(p.frames.size, 1);
  p.flush();
  assert.equal(p.card.properties.get("--mew-pointer-x"), "90%");
  assert.equal(p.frames.size, 0);
  assert.equal(p.card.classList.contains("mew-motion-surface"), true);
  p.doc.emit("pointerout", { relatedTarget: null });
  assert.equal(p.card.properties.size, 0);
  assert.equal(p.card.classList.contains("mew-motion-surface"), false);
  p.doc.emit("pointermove", move);
  p.doc.emit("mew:motion-preference", { detail: { paused: true } });
  assert.equal(p.frames.size, 0);
  assert.equal(p.card.properties.size, 0);
  p.control.destroy();
});

test("pagehide tears down observers, listeners, effects and pending frames", () => {
  const p = page();
  p.doc.emit("pointermove", {
    target: p.card,
    pointerType: "mouse",
    clientX: 60,
    clientY: 100,
  });
  p.win.emit("pagehide");
  assert.equal(p.frames.size, 0);
  assert.equal(p.doc.listenerCount(), 0);
  assert.equal(p.win.listenerCount(), 0);
  assert.equal(p.reduced.listenerCount(), 0);
  assert.equal(p.pointer.listenerCount(), 0);
  assert.equal(p.observers[0].disconnected, true);
  assert.equal(p.body.children[0].removed, true);
  assert.equal(
    p.animations.every((a) => a.cancelled === 1),
    true,
  );
  p.control.destroy();
  assert.equal(
    p.animations.every((a) => a.cancelled === 1),
    true,
  );
});

test("unsupported entrance APIs preserve native content and reading feedback", () => {
  const p = page({ waapi: false, intersections: false });
  p.flush();
  assert.equal(p.animations.length, 0);
  assert.equal(p.observers.length, 0);
  assert.equal(p.body.children[0].children[0].style.transform, "scaleX(0)");
  assert.equal(
    p.hero.every((el) => !el.removed && el.attrs.hidden === undefined),
    true,
  );
  p.control.destroy();
});

test("native BFCache restores remount exactly one layer and retains preference", () => {
  const p = page({ mounted: true });
  p.win.emit("pagehide");
  assert.equal(p.body.children.filter((el) => !el.removed).length, 0);
  p.reduced.matches = true;
  p.win.emit("pageshow", { persisted: true });
  assert.equal(p.body.children.filter((el) => !el.removed).length, 1);
  assert.equal(p.animations.length, 3); // No new entrance under reduced motion.
  p.win.emit("pageshow", { persisted: true });
  assert.equal(p.body.children.filter((el) => !el.removed).length, 1);
  assert.equal(p.reduced.listenerCount(), 1);
  p.control.destroy();
  assert.equal(p.win.listenerCount(), 0);
  assert.equal(p.body.children.filter((el) => !el.removed).length, 0);
});
