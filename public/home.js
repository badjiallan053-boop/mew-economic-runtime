// Every request below runs against a fresh, in-memory kernel. No write endpoint,
// persistent reservation, signing flow or wallet is called from this page.
const $ = (selector) => document.querySelector(selector);
const next = $("#demo-next");
const reset = $("#demo-reset");
const sculpture = $(".sculpture");
const pause = $("#art-pause");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function setArtPaused(value) {
  sculpture.classList.toggle("is-paused", value);
  pause.setAttribute("aria-pressed", String(value));
  pause.textContent = value ? "Resume motion ▶" : "Pause motion Ⅱ";
}
setArtPaused(reducedMotion.matches);
pause.addEventListener("click", () =>
  setArtPaused(!sculpture.classList.contains("is-paused")),
);
reducedMotion.addEventListener("change", (event) => {
  if (event.matches) setArtPaused(true);
});

let kernel,
  phase = 0,
  MEW;
const objectiveId = "showcase-one-report";
const semanticKey = "research-report:showcase:v1";
const firstId = "showcase-alpha-report";
const content = [
  {
    decision: "READY",
    kicker: "YOUR MANDATE, BEFORE THE FIRST REQUEST",
    title: "Start with one clear objective.",
    description:
      "Purchase one report, with maximum exposure of 3 ADA. Run the first request to see the decision.",
    button: "Reserve the first report →",
    equivalent: "Not attempted",
  },
  {
    decision: "ALLOW",
    kicker: "ALLOW → RESERVE",
    title: "The first report holds capacity.",
    description:
      "The engine reserved 1.50 ADA for Supplier Alpha. The one-report objective is held. No payment was dispatched.",
    button: "Observe the timeout →",
    equivalent: "Not attempted",
  },
  {
    decision: "UNKNOWN",
    kicker: "TIMEOUT → RETAIN",
    title: "Silence keeps the commitment held.",
    description:
      "The outcome is unknown. Exposure stays at 1.50 ADA and the one-report quantity remains held. A timeout does not prove failure.",
    button: "Try the equivalent report →",
    equivalent: "Not attempted",
  },
  {
    decision: "DEFER",
    kicker: "EQUIVALENT REQUEST → RECONCILE",
    title: "Enough budget. No spare report.",
    description:
      "1.50 + 1.40 = 2.90 ADA fits the 3 ADA ceiling. The engine still defers Beta: the one-report quantity is held by the unresolved Alpha request.",
    button: "Run the demo again ↻",
    equivalent: "Deferred · not reserved",
  },
];
function render() {
  const item = content[phase];
  const position = kernel.position(objectiveId);
  // The quantity gate and all amounts come from the actual kernel snapshot.
  const held = position.exposure / 1_000_000;
  $("#fixture-decision").textContent = item.decision;
  $("#fixture-decision").dataset.decision = item.decision;
  $("#fixture-kicker").textContent = item.kicker;
  $("#fixture-title").textContent = item.title;
  $("#fixture-description").textContent = item.description;
  $("#exposure-value").textContent = held.toFixed(2);
  $("#quantity-value").textContent = `${position.equivalents} / 1`;
  $("#budget-label").textContent = `${held.toFixed(2)} ADA held`;
  $("#budget-fill").style.width = `${(100 * position.exposure) / 3_000_000}%`;
  $("#budget-meter").setAttribute("aria-valuenow", String(held));
  $("#budget-meter").setAttribute(
    "aria-valuetext",
    `${held.toFixed(2)} of 3 ADA held`,
  );
  $("#equivalent-status").textContent = item.equivalent;
  next.textContent = item.button;
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
  $("#fixture-decision").textContent = "UNAVAILABLE";
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
