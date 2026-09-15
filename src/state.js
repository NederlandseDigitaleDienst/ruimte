/**
 * State, persistentie en undo.
 *
 * Bewust geen framework: de tool is één scherm met een handvol mutaties.
 * Elke mutatie gaat door `muteer()`, die de vorige staat op een undo-stapel
 * zet. Zo is elke actie omkeerbaar en hoeven we niets te bevestigen.
 *
 * De plaat staat versleuteld in localStorage. Omdat versleutelen asynchroon
 * is en `muteer()` overal synchroon wordt aangeroepen, schrijft `bewaar()`
 * niet meteen: het markeert de state als vuil en plant een schrijfbeurt. Er
 * is er altijd hoogstens één tegelijk, zodat een trage schrijfbeurt nooit een
 * nieuwere kan overschrijven.
 */

import {
  maakEnvelop,
  openEnvelop,
  hermaakEnvelop,
  WachtwoordFout,
} from './krypto.js';

const OPSLAG_SLEUTEL = 'ruimte-v1';

/**
 * De oude, onversleutelde sleutel. Een aparte naam, zodat een oude versie van
 * de app die nog in een tabblad openstaat de versleutelde plaat niet als
 * kapotte JSON inleest en overschrijft.
 */
const OUDE_SLEUTEL = 'formatietool-v1';

const UNDO_DIEPTE = 50;
const SCHRIJF_VERTRAGING = 400;

const luisteraars = new Set();
const undoStapel = [];
const redoStapel = [];

let state = null;

/** De afgeleide sleutel. Het wachtwoord zelf bewaren we nooit. */
let sleutel = null;
/** Salt, canary en iteraties: hergebruikt bij elke schrijfbeurt. */
let envelopVorm = null;

let vuil = false;
let schrijfTimer = null;
let schrijftNu = null;
let opslagfoutMelder = null;

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

/** Markeer de plaat als gewijzigd en plan een schrijfbeurt. */
function bewaar() {
  if (!sleutel) return;
  vuil = true;
  if (schrijfTimer) return;
  schrijfTimer = setTimeout(() => {
    schrijfTimer = null;
    spoel();
  }, SCHRIJF_VERTRAGING);
}

/**
 * Schrijf alles weg wat nog openstaat. Eén beurt tegelijk: een tweede
 * aanroep wacht op de lopende, die zelf opnieuw kijkt of er intussen iets is
 * gewijzigd. Zo kan een trage schrijfbeurt nooit een nieuwere overschrijven.
 */
export async function spoel() {
  if (schrijftNu) return schrijftNu;
  if (!vuil || !sleutel) return;

  schrijftNu = (async () => {
    while (vuil && sleutel) {
      vuil = false;
      // Synchroon vastpakken vóór de eerste await: anders muteert state
      // onder ons en schrijven we een mengsel van twee momenten.
      const momentopname = JSON.stringify(state);
      try {
        envelopVorm = await hermaakEnvelop(sleutel, envelopVorm, momentopname);
        localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(envelopVorm));
      } catch (fout) {
        vuil = true; // volgende beurt opnieuw proberen
        opslagfoutMelder?.(fout);
        break;
      }
    }
  })().finally(() => {
    schrijftNu = null;
  });

  return schrijftNu;
}

export function opslagBezig() {
  return vuil || schrijftNu !== null;
}

/** Melding tonen als opslaan mislukt; stil verlies is erger dan een onderbreking. */
export function bijOpslagfout(fn) {
  opslagfoutMelder = fn;
}

/** 'nieuw' als er nog niets staat, 'versleuteld' of 'plat' (oude opslag). */
export function opslagModus() {
  if (localStorage.getItem(OPSLAG_SLEUTEL)) return 'versleuteld';
  if (localStorage.getItem(OUDE_SLEUTEL)) return 'plat';
  return 'nieuw';
}

/** De oude platte plaat, zodat iemand die kan downloaden vóór de migratie. */
export function leesPlatteOpslag() {
  return localStorage.getItem(OUDE_SLEUTEL);
}

/**
 * Open de plaat met een wachtwoord. Gooit WachtwoordFout als het niet klopt.
 *
 * Belangrijk: bij een mislukte ontsleuteling schrijven we niets. De oude
 * versie viel bij onleesbare opslag terug op de voorbeelddata en schreef die
 * meteen weg; met versleuteling zou een bug in het ontsleutelen daarmee
 * andermans plaat vernietigen.
 */
export async function ontgrendel(wachtwoord, standaard) {
  const rauw = localStorage.getItem(OPSLAG_SLEUTEL);
  if (!rauw) throw new Error('Er staat geen plaat in deze browser');

  const { sleutel: afgeleid, tekst } = await openEnvelop(JSON.parse(rauw), wachtwoord);
  sleutel = afgeleid;
  envelopVorm = JSON.parse(rauw);

  const gelezen = normaliseer(JSON.parse(tekst));
  state = gelezen ?? structuredClone(standaard);
  if (!gelezen) bewaar();
  meld();
  return state;
}

/**
 * Stel een wachtwoord in: de eerste keer, of bij het overzetten van een
 * bestaande platte plaat. Ruimt de oude sleutel pas op nadat de nieuwe
 * geschreven is, anders is een mislukte schrijfbeurt dataverlies.
 */
export async function zetWachtwoord(wachtwoord, standaard) {
  const plat = localStorage.getItem(OUDE_SLEUTEL);
  let begin = structuredClone(standaard);
  if (plat) {
    try {
      begin = normaliseer(JSON.parse(plat)) ?? begin;
    } catch {
      // Onleesbare oude opslag: begin met de standaard.
    }
  }

  const { envelop, sleutel: afgeleid } = await maakEnvelop(
    wachtwoord,
    JSON.stringify(begin)
  );
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(envelop));

  sleutel = afgeleid;
  envelopVorm = envelop;
  state = begin;

  if (plat) localStorage.removeItem(OUDE_SLEUTEL);
  meld();
  return state;
}

/** Sluit de plaat: sleutel en inhoud uit het geheugen, undo-historie leeg. */
export async function vergrendel() {
  await spoel();
  sleutel = null;
  envelopVorm = null;
  state = null;
  // De undo-stapel bevat volledige platen met namen erin; die laten staan
  // maakt het vergrendelen symbolisch.
  undoStapel.length = 0;
  redoStapel.length = 0;
  meld();
}

export function isVergrendeld() {
  return sleutel === null;
}

/**
 * Vul aan wat een bestand mist, zodat een handgeschreven of ouder JSON-bestand
 * de app niet laat crashen. Geeft null terug als het echt geen plaat is.
 */
export function normaliseer(rauw) {
  if (!rauw || typeof rauw !== 'object') return null;
  if (!Array.isArray(rauw.personen) || !Array.isArray(rauw.scenarios)) return null;
  if (!rauw.scenarios.length) return null;

  const state = structuredClone(rauw);
  state.naam = state.naam ?? 'Ruimte';
  state.plekken = Array.isArray(state.plekken) ? state.plekken : [];
  state.eenheden = Array.isArray(state.eenheden) ? state.eenheden : [];
  state.normen = state.normen ?? {};

  for (const scenario of state.scenarios) {
    scenario.toewijzingen = scenario.toewijzingen ?? {};
    scenario.extraPlekken = Array.isArray(scenario.extraPlekken) ? scenario.extraPlekken : [];
    scenario.verwijderdePlekken = Array.isArray(scenario.verwijderdePlekken)
      ? scenario.verwijderdePlekken
      : [];
    scenario.extraEenheden = Array.isArray(scenario.extraEenheden) ? scenario.extraEenheden : [];
    scenario.verwijderdeEenheden = Array.isArray(scenario.verwijderdeEenheden)
      ? scenario.verwijderdeEenheden
      : [];
  }

  // Een plek zonder eenheid valt buiten elk team en is dan onzichtbaar in de
  // formatieweergave. Geef die gevallen een eigen kopje.
  const bekendeEenheden = new Set([
    ...state.eenheden.map((e) => e.id),
    ...state.scenarios.flatMap((s) => (s.extraEenheden ?? []).map((e) => e.id)),
  ]);
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
  if (!genormaliseerd) throw new Error('Geen geldige plaat');
  muteer(beschrijving, (s) => {
    for (const sleutel of Object.keys(s)) delete s[sleutel];
    Object.assign(s, genormaliseerd);
  });
}

/**
 * Een versleuteld exportbestand met een eigen wachtwoord. Bewust niet de
 * sessiesleutel: een export gaat naar iemand anders en hoort zijn eigen
 * geheim te hebben.
 */
export async function exporteerVersleuteld(wachtwoord) {
  const { envelop } = await maakEnvelop(wachtwoord, JSON.stringify(state));
  return JSON.stringify(envelop, null, 2);
}

/** De platte plaat. Alleen voor de download vóór een migratie. */
export function exporteer() {
  return JSON.stringify(state, null, 2);
}

/** Lees een geïmporteerd bestand, versleuteld of plat. */
export async function leesImport(tekst, vraagWachtwoord) {
  const gelezen = JSON.parse(tekst);
  if (gelezen?.formaat !== 'ruimte-versleuteld') {
    return { state: gelezen, wasVersleuteld: false };
  }
  const wachtwoord = await vraagWachtwoord();
  if (wachtwoord == null) return null;
  const { tekst: plat } = await openEnvelop(gelezen, wachtwoord);
  return { state: JSON.parse(plat), wasVersleuteld: true };
}

export { WachtwoordFout };

export function nieuwId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
