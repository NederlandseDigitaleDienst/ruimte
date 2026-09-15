/**
 * Automatisch vergrendelen na een tijd niets doen.
 *
 * Op een deadline en niet puur op een timer: een tabblad dat op de achtergrond
 * staat of een laptop die dichtgaat krijgt zijn `setTimeout` niet betrouwbaar
 * gevuurd. Bij terugkomst kijken we of de deadline al voorbij is.
 *
 * Vijftien minuten, niet vijf. Deze plaat ligt open tijdens een gesprek; een
 * slot dat midden in een discussie dichtvalt leidt tot makkelijker
 * wachtwoorden of tot mensen die de tool omzeilen.
 */

const STANDAARD_TIJD = 15 * 60 * 1000;

let deadline = 0;
let timer = null;
let bijLock = null;
let tijd = STANDAARD_TIJD;
let laatsteAanraking = 0;

function plan() {
  clearTimeout(timer);
  timer = setTimeout(controleer, Math.max(0, deadline - Date.now()));
}

function controleer() {
  if (Date.now() >= deadline) {
    stopAutoLock();
    bijLock?.();
  } else {
    plan();
  }
}

/** Timer terugzetten. Hooguit één keer per seconde, anders doet typen honderden resets. */
export function raakAan() {
  if (!bijLock) return;
  const nu = Date.now();
  if (nu - laatsteAanraking < 1000) return;
  laatsteAanraking = nu;
  deadline = nu + tijd;
  plan();
}

export function startAutoLock({ timeoutMs = STANDAARD_TIJD, bij }) {
  tijd = timeoutMs;
  bijLock = bij;
  deadline = Date.now() + tijd;
  plan();

  // Capture, omdat events uit de shadow DOM van de componenten komen en een
  // component ze onderweg kan tegenhouden.
  for (const soort of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    document.addEventListener(soort, raakAan, { passive: true, capture: true });
  }
  document.addEventListener('visibilitychange', bijZichtbaarheid);
}

function bijZichtbaarheid() {
  if (document.visibilityState === 'visible') controleer();
}

export function stopAutoLock() {
  clearTimeout(timer);
  timer = null;
  bijLock = null;
  for (const soort of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    document.removeEventListener(soort, raakAan, { capture: true });
  }
  document.removeEventListener('visibilitychange', bijZichtbaarheid);
}
