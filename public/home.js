// Every request below runs against a fresh, in-memory kernel. No write endpoint,
// persistent reservation, signing flow or wallet is called from this page.
const $ = (selector) => document.querySelector(selector);
// Supplier-map labels are optional presentation details; they must not block
// the shared decision engine on the simpler one-report homepage.
const setOptionalText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = value;
};
const next = $("#demo-next");
const reset = $("#demo-reset");
const sculpture = $(".sculpture");
const pause = $("#art-pause");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// Motion is decoration; it never advances a request or implies live activity.
let manuallyPaused = false;
let artInView = true;
let resultAnimation;
function syncMotion() {
  const preferencePaused = reducedMotion.matches;
  const effectivePaused =
    manuallyPaused || preferencePaused || document.hidden || !artInView;
  sculpture.classList.toggle("is-paused", effectivePaused);
  pause.disabled = preferencePaused;
  pause.setAttribute(
    "aria-pressed",
    String(manuallyPaused || preferencePaused),
  );
  pause.textContent = preferencePaused
    ? "Reduced motion on"
    : manuallyPaused
      ? "Resume motion ▶"
      : "Pause motion Ⅱ";
  $("#demo").dataset.motionPaused = String(manuallyPaused || preferencePaused || document.hidden);
  if (effectivePaused) resultAnimation?.cancel();
  document.dispatchEvent(
    new CustomEvent("mew:motion-preference", {
      detail: { paused: manuallyPaused || preferencePaused || document.hidden },
    }),
  );
}
pause.addEventListener("click", () => {
  manuallyPaused = !manuallyPaused;
  syncMotion();
});
reducedMotion.addEventListener("change", syncMotion);
document.addEventListener("visibilitychange", syncMotion);
if ("IntersectionObserver" in window) {
  const artVisibility = new IntersectionObserver(
    (entries) => {
      artInView = entries[0].isIntersecting;
      syncMotion();
    },
    { threshold: 0.05 },
  );
  artVisibility.observe(sculpture);
}
sculpture.dataset.motionReady = "true";
syncMotion();
function animateDecision() {
  resultAnimation?.cancel();
  if (
    reducedMotion.matches ||
    manuallyPaused ||
    document.hidden ||
    !$(".fixture-result").animate
  )
    return;
  const bounds = $(".fixture-result").getBoundingClientRect();
  if (bounds.bottom < 0 || bounds.top > innerHeight) return;
  resultAnimation = $(".fixture-result").animate(
    [
      { transform: "translateY(5px)", opacity: 0.72 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
}

let kernel,
  phase = 0,
  MEW;
const objectiveId = "showcase-one-report";
const semanticKey = "research-report:showcase:v1";
const firstId = "showcase-alpha-report";
const content = [
  {
    decision: "READY", label: "Ready to try",
    kicker: "BEFORE YOU START", title: "One report. A 3 ADA limit.",
    description: "Let’s ask Alpha first. Watch what changes when the answer never comes.",
    button: "Ask Alpha for the report →", equivalent: "Not tried",
    alpha: "Not started", beta: "Not started", guard: "Checks the rule",
    caption: "One report. Two possible suppliers. MEW checks every request.",
  },
  {
    decision: "ALLOW", label: "First request OK",
    kicker: "01 / ASK ALPHA", title: "The first request is OK.",
    description: "MEW sets aside 1.50 ADA for Alpha and keeps one report request open. No real money moves.",
    button: "What if Alpha goes quiet? →", equivalent: "Not tried",
    alpha: "Request held", beta: "Not started", guard: "First request OK",
    caption: "Alpha has the only report slot. Beta has not been asked.",
  },
  {
    decision: "UNKNOWN", label: "Still waiting",
    kicker: "02 / NO ANSWER", title: "No answer doesn’t mean it failed.",
    description: "Alpha might still be working. MEW keeps the 1.50 ADA set aside until there’s evidence of what happened.",
    button: "Try the same report from Beta →", equivalent: "Not tried",
    alpha: "Still waiting", beta: "Not started", guard: "Keeps the slot",
    caption: "Alpha’s outcome is unknown. Its request stays open.",
  },
  {
    decision: "DEFER", label: "Second request paused",
    kicker: "03 / TRY BETA", title: "Same report? Pause the second request.",
    description: "You have enough budget for both, but asked for only one report. MEW pauses Beta. Check what happened with Alpha first.",
    button: "Try the story again ↻", equivalent: "Paused · no money set aside",
    alpha: "Still waiting", beta: "Paused by MEW", guard: "Stops a duplicate",
    caption: "Alpha is still open. MEW pauses Beta, so no second request is approved.",
  },
];
function render() {
  const item = content[phase];
  const position = kernel.position(objectiveId);
  // The quantity gate and all amounts come from the actual kernel snapshot.
  const held = position.exposure / 1_000_000;
  $("#fixture-decision").textContent = item.label;
  setOptionalText("#engine-decision", item.decision);
  $("#demo").dataset.phase = String(phase);
  setOptionalText("#alpha-state", item.alpha);
  setOptionalText("#beta-state", item.beta);
  setOptionalText("#map-guard-label", item.guard);
  setOptionalText("#map-caption", item.caption);
  $("#fixture-decision").dataset.decision = item.decision;
  $("#fixture-kicker").textContent = item.kicker;
  $("#fixture-title").textContent = item.title;
  $("#fixture-description").textContent = item.description;
  $("#exposure-value").textContent = held.toFixed(2);
  $("#quantity-value").textContent = `${position.equivalents} / 1`;
  $("#budget-label").textContent = `${held.toFixed(2)} ADA set aside`;
  $("#budget-fill").style.width = `${(100 * position.exposure) / 3_000_000}%`;
  $("#budget-meter").setAttribute("aria-valuenow", String(held));
  $("#budget-meter").setAttribute(
    "aria-valuetext",
    `${held.toFixed(2)} of 3 ADA set aside in this demo`,
  );
  $("#equivalent-status").textContent = item.equivalent;
  next.textContent = item.button;
  $(".decision-console").dataset.decision = item.decision;
  sculpture.dataset.decision = item.decision;
  $("#art-caption-state").textContent =
    phase === 0
      ? "Concept illustration · no live activity"
      : `Concept illustration · local demo: ${position.equivalents}/1 report held · ${item.decision}`;
  animateDecision();
  document.querySelectorAll("[data-step]").forEach((element) => {
    const step = Number(element.dataset.step);
    element.classList.toggle("active", step === phase);
    element.classList.toggle("complete", step < phase);
    if (step === phase) element.setAttribute("aria-current", "step");
    else element.removeAttribute("aria-current");
  });
}
function restart() {
  kernel = new MEW();
  kernel.createObjective({
    id: objectiveId,
    principal: "local-demo-principal",
    semanticKey,
    description: "One research report",
    quantity: 1,
    maxExposure: 3_000_000,
  });
  phase = 0;
  render();
}
function showFailure() {
  next.disabled = true;
  reset.disabled = true;
  resultAnimation?.cancel();
  $(".decision-console").dataset.decision = "UNAVAILABLE";
  sculpture.dataset.decision = "UNAVAILABLE";
  $("#art-caption-state").textContent =
    "Concept illustration · decision engine unavailable";
  $("#demo").dataset.phase = "unavailable";
  setOptionalText("#alpha-state", "Demo unavailable");
  setOptionalText("#beta-state", "Demo unavailable");
  setOptionalText("#map-guard-label", "Demo unavailable");
  setOptionalText("#map-caption", "The demo could not run. No decision is claimed.");
  setOptionalText("#engine-decision", "UNAVAILABLE");
  $("#fixture-decision").textContent = "Demo unavailable";
  $("#fixture-decision").dataset.decision = "UNAVAILABLE";
  $("#fixture-kicker").textContent = "DEMO PAUSED";
  $("#fixture-title").textContent = "The decision engine could not run.";
  $("#fixture-description").textContent =
    "No decision is claimed. Inspect the protocol evidence or reload this page from the project server.";
  next.textContent = "Decision engine unavailable";
}
next.addEventListener("click", () => {
  try {
    if (phase === 3) {
      restart();
      return;
    }
    if (phase === 0) {
      const result = kernel.evaluate({
        objectiveId,
        proposedEffect: {
          id: firstId,
          semanticKey,
          provider: "Supplier Alpha",
          agent: "local-demo-alpha",
          type: "payment",
          amount: 1_500_000,
        },
      });
      if (result.decision !== "ALLOW")
        throw new Error("Unexpected reservation result");
    } else if (phase === 1) {
      kernel.observe({
        claimId: "showcase-timeout",
        effectId: firstId,
        source: "local-simulation",
        type: "unknown",
      });
    } else {
      const result = kernel.evaluate({
        objectiveId,
        proposedEffect: {
          id: "showcase-beta-report",
          semanticKey,
          provider: "Supplier Beta",
          agent: "local-demo-beta",
          type: "payment",
          amount: 1_400_000,
        },
      });
      if (result.decision !== "DEFER" || kernel.snapshot().effects.length !== 1)
        throw new Error("Unexpected quantity result");
    }
    phase += 1;
    render();
  } catch {
    showFailure();
  }
});
reset.addEventListener("click", () => {
  try {
    restart();
  } catch {
    showFailure();
  }
});
try {
  ({ MEW } = await import("/core/mew.mjs"));
  restart();
  next.disabled = false;
  reset.disabled = false;
} catch {
  showFailure();
}
