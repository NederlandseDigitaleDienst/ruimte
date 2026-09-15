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
      const gelezen = normaliseer(JSON.parse(rauw));
      if (gelezen) {
        state = gelezen;
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

/**
 * Vul aan wat een bestand mist, zodat een handgeschreven of ouder JSON-bestand
 * de app niet laat crashen. Geeft null terug als het echt geen formatieplaat is.
 */
export function normaliseer(rauw) {
  if (!rauw || typeof rauw !== 'object') return null;
  if (!Array.isArray(rauw.personen) || !Array.isArray(rauw.scenarios)) return null;
  if (!rauw.scenarios.length) return null;

  const state = structuredClone(rauw);
  state.naam = state.naam ?? 'Formatieplaat';
  state.plekken = Array.isArray(state.plekken) ? state.plekken : [];
  state.eenheden = Array.isArray(state.eenheden) ? state.eenheden : [];
  state.normen = state.normen ?? {};

  for (const scenario of state.scenarios) {
    scenario.toewijzingen = scenario.toewijzingen ?? {};
    scenario.extraPlekken = Array.isArray(scenario.extraPlekken) ? scenario.extraPlekken : [];
    scenario.verwijderdePlekken = Array.isArray(scenario.verwijderdePlekken)
      ? scenario.verwijderdePlekken
      : [];
  }

  // Een plek zonder eenheid valt buiten elk team en is dan onzichtbaar in de
  // formatieweergave. Geef die gevallen een eigen kopje.
  const bekendeEenheden = new Set(state.eenheden.map((e) => e.id));
  const alle = [...state.plekken, ...state.scenarios.flatMap((s) => s.extraPlekken)];
  const wees = alle.filter((p) => !bekendeEenheden.has(p.eenheidId));
  if (wees.length) {
    state.eenheden.push({ id: 'e-overig', naam: 'Overig', soort: 'staf', parentId: null });
    for (const plek of wees) plek.eenheidId = 'e-overig';
  }

  if (!state.scenarios.some((s) => s.id === state.actiefScenario)) {
    state.actiefScenario = state.scenarios[0].id;
  }

  return state;
}

export function vervangState(nieuw, beschrijving = 'Import') {
  const genormaliseerd = normaliseer(nieuw);
  if (!genormaliseerd) throw new Error('Geen geldige formatieplaat');
  muteer(beschrijving, (s) => {
    for (const sleutel of Object.keys(s)) delete s[sleutel];
    Object.assign(s, genormaliseerd);
  });
}

export function exporteer() {
  return JSON.stringify(state, null, 2);
}

export function nieuwId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
