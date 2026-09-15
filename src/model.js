/**
 * Datamodel en afgeleide berekeningen voor de formatietool.
 *
 * Een scenario is een variant op dezelfde basis: dezelfde personen, dezelfde
 * eenheden, maar eigen plekken en eigen toewijzingen. Zo kun je twee plaatjes
 * naast elkaar leggen zonder de personenpool te dupliceren.
 */

import { schaalPastBijFunctiegroep } from './fgr.js';

/**
 * Loonkosten per mensjaar volgens de Handleiding Overheidstarieven 2026,
 * tabel 1 (bron: P-Direkt). Dit is de normbron voor de financiële paragraaf
 * van een formatierapport.
 *
 * Inbegrepen: brutosalaris, IKB, werkgeverspremies pensioen, WIA/WAO, UFO,
 * bijdrage Zvw en een raming van loongroei. Niet inbegrepen: functie-
 * afhankelijke toeslagen zoals onregelmatigheidstoeslag.
 */
export const SCHAAL_LOONKOSTEN = {
  1: 45000,
  2: 45000,
  3: 49000,
  4: 53000,
  5: 57000,
  6: 59000,
  7: 65000,
  8: 71000,
  9: 79000,
  10: 88000,
  11: 101000,
  12: 117000,
  13: 134000,
  14: 148000,
  15: 162000,
  16: 176000,
  17: 190000,
  18: 207000,
};

/**
 * Overhead per fte, HOT 2026 tabel 2. Opgebouwd uit huisvesting (8.200),
 * kantoorautomatisering (6.400), facilitair (6.000), DIV (2.000), opleiding
 * (1.500), reiskosten (1.200), HR-advies (800), P-Direkt (700), IMOC (700)
 * en thuiswerkvergoeding (300).
 *
 * Bij een overheveling van fte's tussen departementen rekent de HOT juist
 * zónder overhead, vandaar dat dit apart staat.
 */
export const OVERHEAD_PER_FTE = 28000;

export const EENHEID_SOORT = {
  core: { label: 'Kernteam', color: 'lintblauw' },
  doorbraak: { label: 'Doorbraakproject', color: 'violet' },
  staf: { label: 'Staf en ondersteuning', color: 'neutral' },
};

export function loonkosten(schaal, fte = 1) {
  return (SCHAAL_LOONKOSTEN[schaal] ?? 0) * fte;
}

/** Loonkosten plus overhead: wat een plek werkelijk kost. */
export function integraleKosten(schaal, fte = 1) {
  return loonkosten(schaal, fte) + OVERHEAD_PER_FTE * fte;
}

/** Alle plekken van een scenario: de basisplekken plus wat het scenario toevoegt. */
export function plekkenVan(state, scenarioId) {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return [];
  const verwijderd = new Set(scenario.verwijderdePlekken ?? []);
  return [
    ...state.plekken.filter((p) => !verwijderd.has(p.id)),
    ...(scenario.extraPlekken ?? []),
  ];
}

/**
 * persoonId -> plek, voor snelle lookups in de views.
 *
 * Geef `plekken` mee om toewijzingen naar plekken die in dit scenario niet
 * bestaan te negeren. Zonder die controle telt iemand als geplaatst terwijl
 * zijn plek weg is, en verdwijnt hij uit "wie heeft nog geen plek". Dat kan
 * gebeuren na een import of bij data die elders is bewerkt.
 */
export function toewijzingIndex(scenario, plekken = null) {
  const bestaat = plekken ? new Set(plekken.map((p) => p.id)) : null;
  const perPersoon = new Map();
  const perPlek = new Map();
  for (const [plekId, persoonId] of Object.entries(scenario.toewijzingen ?? {})) {
    if (!persoonId) continue;
    if (bestaat && !bestaat.has(plekId)) continue;
    perPlek.set(plekId, persoonId);
    if (!perPersoon.has(persoonId)) perPersoon.set(persoonId, []);
    perPersoon.get(persoonId).push(plekId);
  }
  return { perPersoon, perPlek };
}

/**
 * De toets. Elke check levert status + een lijst betrokken ids, zodat de UI
 * vanuit de bevinding naar de betreffende rijen kan springen.
 *
 * status: 'ok' | 'waarschuwing' | 'fout'
 */
export function toets(state, scenarioId) {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  const plekken = plekkenVan(state, scenarioId);
  const { perPersoon, perPlek } = toewijzingIndex(scenario, plekken);
  const eenheidById = new Map(state.eenheden.map((e) => [e.id, e]));
  const persoonById = new Map(state.personen.map((p) => [p.id, p]));
  const norm = { ...standaardNormen, ...(state.normen ?? {}) };

  const bevindingen = [];

  // 1. Niemand vergeten. Dit is de check waar het in het gesprek om begon.
  const zonderPlek = state.personen.filter((p) => !perPersoon.has(p.id));
  bevindingen.push({
    id: 'niemand-vergeten',
    titel: 'Iedereen een plek',
    status: zonderPlek.length === 0 ? 'ok' : 'fout',
    samenvatting:
      zonderPlek.length === 0
        ? 'Alle mensen hebben een plek'
        : `${zonderPlek.length} ${zonderPlek.length === 1 ? 'persoon heeft' : 'mensen hebben'} nog geen plek`,
    personen: zonderPlek.map((p) => p.id),
  });

  // 2. Dubbele bezetting en fte-overschrijding.
  const overbezet = [];
  for (const [persoonId, plekIds] of perPersoon) {
    const persoon = persoonById.get(persoonId);
    if (!persoon) continue;
    const som = plekIds.reduce((t, id) => t + (plekken.find((p) => p.id === id)?.fte ?? 0), 0);
    if (som > (persoon.fte ?? 1) + 0.001) {
      overbezet.push({ persoonId, som, beschikbaar: persoon.fte ?? 1 });
    }
  }
  bevindingen.push({
    id: 'overbezetting',
    titel: 'Geen overbezetting',
    status: overbezet.length === 0 ? 'ok' : 'fout',
    samenvatting:
      overbezet.length === 0
        ? 'Niemand staat op meer fte dan beschikbaar'
        : `${overbezet.length} ${overbezet.length === 1 ? 'persoon staat' : 'mensen staan'} op te veel fte`,
    personen: overbezet.map((o) => o.persoonId),
  });

  // 3. Vacatures.
  const vacant = plekken.filter((p) => !perPlek.has(p.id));
  bevindingen.push({
    id: 'vacatures',
    titel: 'Vacatures',
    status: vacant.length === 0 ? 'ok' : 'waarschuwing',
    samenvatting:
      vacant.length === 0
        ? 'Alle plekken zijn bezet'
        : `${vacant.length} van ${plekken.length} plekken nog onbezet`,
    plekken: vacant.map((p) => p.id),
  });

  // 4. Engineersratio.
  const totaalFte = plekken.reduce((t, p) => t + (p.fte ?? 0), 0);
  const engineerFte = plekken
    .filter((p) => (p.expertise ?? []).includes('engineering'))
    .reduce((t, p) => t + (p.fte ?? 0), 0);
  const ratio = totaalFte > 0 ? engineerFte / totaalFte : 0;
  bevindingen.push({
    id: 'engineersratio',
    titel: 'Aandeel engineering',
    status: ratio >= norm.minEngineerRatio - 1e-9 ? 'ok' : 'waarschuwing',
    samenvatting: `${Math.round(ratio * 100)}% van de formatie is engineering (norm: minimaal ${Math.round(
      norm.minEngineerRatio * 100
    )}%)`,
    waarde: ratio,
    plekken: plekken.filter((p) => (p.expertise ?? []).includes('engineering')).map((p) => p.id),
  });

  // 5. Core versus doorbraak.
  const ftePerSoort = {};
  for (const plek of plekken) {
    const soort = eenheidById.get(plek.eenheidId)?.soort ?? 'staf';
    ftePerSoort[soort] = (ftePerSoort[soort] ?? 0) + (plek.fte ?? 0);
  }
  const doorbraakRatio = totaalFte > 0 ? (ftePerSoort.doorbraak ?? 0) / totaalFte : 0;
  bevindingen.push({
    id: 'core-doorbraak',
    titel: 'Verhouding kern en doorbraak',
    status: doorbraakRatio >= norm.minDoorbraakRatio - 1e-9 ? 'ok' : 'waarschuwing',
    samenvatting: `${Math.round(doorbraakRatio * 100)}% zit op doorbraakprojecten, ${Math.round(
      ((ftePerSoort.core ?? 0) / (totaalFte || 1)) * 100
    )}% in het kernteam`,
    waarde: doorbraakRatio,
    verdeling: ftePerSoort,
  });

  // 6. Schaalmismatch: iemand zwaarder of lichter dan de plek.
  const mismatch = [];
  for (const [plekId, persoonId] of perPlek) {
    const plek = plekken.find((p) => p.id === plekId);
    const persoon = persoonById.get(persoonId);
    if (!plek || !persoon || persoon.schaal == null || plek.schaal == null) continue;
    const verschil = persoon.schaal - plek.schaal;
    if (verschil > 0) mismatch.push({ plekId, persoonId, verschil, soort: 'boven' });
    else if (verschil <= -2) mismatch.push({ plekId, persoonId, verschil, soort: 'onder' });
  }
  bevindingen.push({
    id: 'schaalmismatch',
    titel: 'Schaal past bij de plek',
    status: mismatch.length === 0 ? 'ok' : 'waarschuwing',
    samenvatting:
      mismatch.length === 0
        ? 'Iedereen zit op een passende schaal'
        : `${mismatch.length} ${mismatch.length === 1 ? 'plek wijkt' : 'plekken wijken'} af van de schaal van de persoon`,
    plekken: mismatch.map((m) => m.plekId),
    details: mismatch,
  });

  // 7. Span of control per leidinggevende.
  const teGroot = [];
  for (const eenheid of state.eenheden) {
    const aantal = plekken.filter((p) => p.eenheidId === eenheid.id).length;
    if (aantal > norm.maxSpanOfControl) teGroot.push({ eenheidId: eenheid.id, aantal });
  }
  bevindingen.push({
    id: 'span-of-control',
    titel: 'Omvang van de teams',
    status: teGroot.length === 0 ? 'ok' : 'waarschuwing',
    samenvatting:
      teGroot.length === 0
        ? `Geen team groter dan ${norm.maxSpanOfControl} plekken`
        : `${teGroot.length} ${teGroot.length === 1 ? 'team is' : 'teams zijn'} groter dan ${norm.maxSpanOfControl} plekken`,
    eenheden: teGroot.map((t) => t.eenheidId),
  });

  // 8. Schaal past binnen het FGR-bereik van de functiegroep.
  const buitenBereik = plekken.filter(
    (p) => p.functiegroep && !schaalPastBijFunctiegroep(p.functiegroep, p.schaal)
  );
  bevindingen.push({
    id: 'fgr-bereik',
    titel: 'Schaal binnen het functiegebouw',
    status: buitenBereik.length === 0 ? 'ok' : 'waarschuwing',
    samenvatting:
      buitenBereik.length === 0
        ? 'Alle plekken vallen binnen het schaalbereik van hun functiegroep'
        : `${buitenBereik.length} ${buitenBereik.length === 1 ? 'plek valt' : 'plekken vallen'} buiten het FGR-bereik en vraagt onderbouwing`,
    plekken: buitenBereik.map((p) => p.id),
  });

  // 9. Budget, op integrale kosten: loonkosten plus overhead per fte.
  const kostenLoon = plekken.reduce((t, p) => t + loonkosten(p.schaal, p.fte ?? 1), 0);
  const kosten = plekken.reduce((t, p) => t + integraleKosten(p.schaal, p.fte ?? 1), 0);
  const plafond = norm.budgetPlafond;
  bevindingen.push({
    id: 'budget',
    titel: 'Integrale kosten',
    status: plafond == null ? 'ok' : kosten <= plafond ? 'ok' : 'fout',
    samenvatting:
      plafond == null
        ? `${formatEuro(kosten)} per jaar`
        : `${formatEuro(kosten)} van ${formatEuro(plafond)} per jaar`,
    waarde: kosten,
    detail: `Loonkosten ${formatEuro(kostenLoon)}, overhead ${formatEuro(
      kosten - kostenLoon
    )} (${formatEuro(OVERHEAD_PER_FTE)} per fte)`,
  });

  return {
    bevindingen,
    samenvatting: {
      totaalFte,
      aantalPlekken: plekken.length,
      aantalVacant: vacant.length,
      aantalZonderPlek: zonderPlek.length,
      kosten,
      fouten: bevindingen.filter((b) => b.status === 'fout').length,
      waarschuwingen: bevindingen.filter((b) => b.status === 'waarschuwing').length,
    },
  };
}

export const standaardNormen = {
  minEngineerRatio: 0.5,
  minDoorbraakRatio: 0.3,
  maxSpanOfControl: 12,
  budgetPlafond: null,
};

export function formatEuro(bedrag) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(bedrag);
}

export function formatFte(fte) {
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(fte);
}

/** "a", "a en b", "a, b en c" */
export function formatOpsomming(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

/** De redenen als lopende tekst, elke zin met een punt erachter. */
export function formatRedenen(redenen) {
  return (redenen ?? []).map((r) => (r.endsWith('.') ? r : `${r}.`)).join(' ');
}

/**
 * Hoe goed past deze persoon op deze plek? Gebruikt om bij het slepen te laten
 * zien of een match logisch is, niet om iets te blokkeren.
 */
export function matchKwaliteit(persoon, plek) {
  if (!persoon || !plek) return null;
  const redenen = [];
  let score = 100;

  // De naam erbij, anders is "de huidige schaal" dubbelzinnig: dat kan ook
  // de schaal van de plek zijn.
  const wie = persoon.naam ?? 'Deze persoon';

  if (persoon.schaal != null && plek.schaal != null) {
    const verschil = persoon.schaal - plek.schaal;
    if (verschil > 0) {
      score -= 40;
      redenen.push(
        `${wie} zit nu in schaal ${persoon.schaal} en deze plek is schaal ${plek.schaal}, ` +
          'dus een stap terug'
      );
    } else if (verschil <= -2) {
      score -= 25;
      redenen.push(
        `${wie} zit nu in schaal ${persoon.schaal} en deze plek is schaal ${plek.schaal}, ` +
          'dus een flinke stap omhoog'
      );
    }
  }

  const vereist = plek.expertise ?? [];
  const heeft = new Set(persoon.expertise ?? []);
  const ontbreekt = vereist.filter((e) => !heeft.has(e));
  if (vereist.length > 0) {
    score -= (ontbreekt.length / vereist.length) * 35;
    if (ontbreekt.length > 0) {
      redenen.push(
        `Deze plek vraagt ${formatOpsomming(ontbreekt)}, ` +
          `en dat staat niet bij de expertise van ${wie}`
      );
    }
  }

  return { score: Math.max(0, Math.round(score)), redenen };
}
