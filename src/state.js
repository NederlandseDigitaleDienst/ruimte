/**
 * State, persistentie en undo.
 *
 * Bewust geen framework: de tool is één scherm met een handvol mutaties.
 * Elke mutatie gaat door `muteer()`, die de vorige staat op een undo-stapel
 * zet. Zo is elke actie omkeerbaar en hoeven we niets te bevestigen.
 */

const OPSLAG_SLEUTEL = 'formatietool-v1';
const UNDO_DIEPTE = 50;

const luisteraars = new Set();
const undoStapel = [];
const redoStapel = [];

let state = null;

export function huidigeState() {
  return state;
}

export function abonneer(fn) {
  luisteraars.add(fn);
  return () => luisteraars.delete(fn);
}

function meld() {
  for (const fn of luisteraars) fn(state);
}

/**
 * Voer een mutatie uit. `beschrijving` verschijnt in de undo-melding, dus
 * schrijf hem als wat er ongedaan gemaakt wordt: "Plek toegevoegd".
 */
export function muteer(beschrijving, fn) {
  undoStapel.push({ beschrijving, snapshot: structuredClone(state) });
  if (undoStapel.length > UNDO_DIEPTE) undoStapel.shift();
  redoStapel.length = 0;
  fn(state);
  bewaar();
  meld();
  return beschrijving;
}

export function undo() {
  const vorige = undoStapel.pop();
  if (!vorige) return null;
  redoStapel.push({ beschrijving: vorige.beschrijving, snapshot: structuredClone(state) });
  state = vorige.snapshot;
  bewaar();
  meld();
  return vorige.beschrijving;
}

export function redo() {
  const volgende = redoStapel.pop();
  if (!volgende) return null;
  undoStapel.push({ beschrijving: volgende.beschrijving, snapshot: structuredClone(state) });
  state = volgende.snapshot;
  bewaar();
  meld();
  return volgende.beschrijving;
}

export function kanUndo() {
  return undoStapel.length > 0;
}

export function kanRedo() {
  return redoStapel.length > 0;
}

function bewaar() {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(state));
  } catch {
    // Opslag kan geweigerd worden (privémodus). De tool werkt dan nog steeds,
    // alleen zonder bewaren; exporteren blijft de weg om iets vast te leggen.
  }
}

export function laad(standaard) {
  try {
    const rauw = localStorage.getItem(OPSLAG_SLEUTEL);
    if (rauw) {
      state = JSON.parse(rauw);
      if (state?.personen && state?.plekken && state?.scenarios) {
        meld();
        return state;
      }
    }
  } catch {
    // Onleesbare opslag: val terug op de standaard in plaats van leeg starten.
  }
  state = structuredClone(standaard);
  bewaar();
  meld();
  return state;
}

export function vervangState(nieuw, beschrijving = 'Import') {
  muteer(beschrijving, (s) => {
    for (const sleutel of Object.keys(s)) delete s[sleutel];
    Object.assign(s, structuredClone(nieuw));
  });
}

export function exporteer() {
  return JSON.stringify(state, null, 2);
}

export function nieuwId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
