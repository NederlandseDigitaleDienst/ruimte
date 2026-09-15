/**
 * Formatieplaat: de plaat die je op tafel legt en waarin je tijdens het
 * gesprek kunt schuiven.
 *
 * Opzet: geen framework. Bij elke mutatie wordt de betreffende view opnieuw
 * opgebouwd. Dat is voor deze omvang (tientallen plekken) ruim snel genoeg
 * en houdt de code leesbaar.
 */

import { voorbeeldState } from './voorbeelddata.js';
import {
  laad,
  huidigeState,
  abonneer,
  muteer,
  undo,
  kanUndo,
  exporteer,
  vervangState,
  nieuwId,
} from './state.js';
import {
  toets,
  plekkenVan,
  toewijzingIndex,
  integraleKosten,
  matchKwaliteit,
  formatEuro,
  formatFte,
  formatRedenen,
  formatOpsomming,
  EENHEID_SOORT,
} from './model.js';
import { FUNCTIEGROEPEN, functiegroep, functiegroepenPerFamilie, FUNCTIEFAMILIES } from './fgr.js';

const el = (id) => document.getElementById(id);

/** Wat de inspector rechts laat zien. */
let selectie = null; // { soort: 'plek'|'persoon'|'bevinding', id }
let actieveView = 'formatie';

// ---------------------------------------------------------------- helpers

function scenario(state = huidigeState()) {
  return state.scenarios.find((s) => s.id === state.actiefScenario) ?? state.scenarios[0];
}

function maak(tag, attrs = {}, kinderen = []) {
  const node = document.createElement(tag);
  for (const [sleutel, waarde] of Object.entries(attrs)) {
    if (waarde === false || waarde == null) continue;
    if (sleutel === 'on') {
      for (const [gebeurtenis, fn] of Object.entries(waarde)) node.addEventListener(gebeurtenis, fn);
    } else if (waarde === true) {
      node.setAttribute(sleutel, '');
    } else {
      node.setAttribute(sleutel, String(waarde));
    }
  }
  for (const kind of [].concat(kinderen)) {
    if (kind == null) continue;
    node.append(typeof kind === 'string' ? document.createTextNode(kind) : kind);
  }
  return node;
}

function leeg(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

const STATUS_KLEUR = { ok: 'groen', waarschuwing: 'donkergeel', fout: 'rood' };
const STATUS_ICOON = { ok: 'check', waarschuwing: 'warning', fout: 'warning' };

// ---------------------------------------------------------------- linkerkolom

const VIEWS = [
  { id: 'formatie', naam: 'Formatie', uitleg: 'Teams, plekken en wie erop staat' },
  { id: 'organogram', naam: 'Organogram', uitleg: 'De hark met de bezetting' },
  { id: 'mensen', naam: 'Mensen', uitleg: 'Wie er zijn en wie nog nergens staat' },
  { id: 'vergelijk', naam: 'Vergelijk', uitleg: "Scenario's naast elkaar" },
];

function toonViews() {
  const lijst = leeg(el('view-lijst'));
  const state = huidigeState();
  const resultaat = toets(state, state.actiefScenario);

  for (const view of VIEWS) {
    const signaal = signaalVoor(view.id, state, resultaat);
    const item = maak(
      'nldd-list-item',
      {
        size: 'md',
        button: true,
        current: view.id === actieveView,
        selected: view.id === actieveView,
        on: {
          click: () => {
            if (view.id === actieveView) return;
            actieveView = view.id;
            toonViews();
            toonView();
          },
        },
      },
      [
        maak('nldd-title-cell', {
          text: view.naam,
          // Als er iets aandacht vraagt, zegt de regel wát dat is. Een kaal
          // cijfer laat je raden of het om vacatures of om mensen gaat.
          'supporting-text': signaal?.uitleg ?? view.uitleg,
          color: signaal?.ernstig ? 'critical' : 'content',
          size: 6,
        }),
        signaalCel(signaal),
      ]
    );
    lijst.append(item);
  }
}

function signaalCel(signaal) {
  if (!signaal) return null;
  return maak('nldd-cell', { width: 'fit-content' }, [
    maak('nldd-tag', {
      color: signaal.ernstig ? 'rood' : 'donkergeel',
      size: 'sm',
      text: String(signaal.aantal),
      'accessible-label': signaal.uitleg,
    }),
  ]);
}

/**
 * Wat er in deze weergave aandacht vraagt. Elke weergave telt wat je dáár
 * kunt oplossen, zodat een teller ook zegt waar je heen moet.
 */

function signaalVoor(viewId, state, resultaat) {
  const sc = scenario(state);
  const plekken = plekkenVan(state, sc.id);
  const { perPlek } = toewijzingIndex(sc, plekken);
  const persoonById = new Map(state.personen.map((p) => [p.id, p]));

  if (viewId === 'mensen') {
    // Alles wat in deze lijst een markering krijgt, telt mee. Anders staat er
    // een 1 naast twee zichtbare waarschuwingen.
    const zonderPlek = resultaat.samenvatting.aantalZonderPlek;
    const twijfel = state.personen.filter((persoon) => {
      const plekId = toewijzingIndex(sc, plekken).perPersoon.get(persoon.id)?.[0];
      const plek = plekken.find((p) => p.id === plekId);
      if (!plek) return false;
      return (matchKwaliteit(persoon, plek)?.score ?? 100) < 70;
    }).length;
    const aantal = zonderPlek + twijfel;
    if (!aantal) return null;

    const delen = [];
    if (zonderPlek) {
      delen.push(
        `${zonderPlek} ${zonderPlek === 1 ? 'persoon heeft' : 'mensen hebben'} nog geen plek`
      );
    }
    if (twijfel) {
      delen.push(
        `${twijfel} ${twijfel === 1 ? 'plaatsing vraagt' : 'plaatsingen vragen'} aandacht`
      );
    }
    return { aantal, ernstig: zonderPlek > 0, uitleg: formatOpsomming(delen) };
  }

  if (viewId === 'formatie') {
    // Vacatures en plaatsingen die aandacht vragen: allebei op te lossen
    // in deze weergave.
    const vacant = plekken.filter((p) => !perPlek.has(p.id)).length;
    const twijfel = plekken.filter((plek) => {
      const persoon = persoonById.get(perPlek.get(plek.id));
      if (!persoon) return false;
      return (matchKwaliteit(persoon, plek)?.score ?? 100) < 70;
    }).length;
    const aantal = vacant + twijfel;
    if (!aantal) return null;

    const delen = [];
    if (vacant) delen.push(`${vacant} ${vacant === 1 ? 'plek is' : 'plekken zijn'} vacant`);
    if (twijfel) {
      delen.push(
        `${twijfel} ${twijfel === 1 ? 'plaatsing vraagt' : 'plaatsingen vragen'} aandacht`
      );
    }
    return { aantal, ernstig: false, uitleg: formatOpsomming(delen) };
  }

  if (viewId === 'organogram') {
    const teGroot = resultaat.bevindingen.find((b) => b.id === 'span-of-control');
    if (teGroot?.status === 'ok') return null;
    const aantal = teGroot?.eenheden?.length ?? 0;
    if (!aantal) return null;
    return { aantal, ernstig: false, uitleg: teGroot.samenvatting };
  }

  if (viewId === 'vergelijk') {
    // Alleen melden als een ánder scenario er beter voor staat: dat is de
    // reden om te gaan vergelijken.
    const hier = resultaat.samenvatting.fouten;
    const beter = state.scenarios.filter(
      (s) => s.id !== sc.id && toets(state, s.id).samenvatting.fouten < hier
    ).length;
    if (!beter) return null;
    return {
      aantal: beter,
      ernstig: false,
      uitleg: `${beter} ${beter === 1 ? 'scenario heeft' : "scenario's hebben"} minder fouten dan dit`,
    };
  }

  return null;
}

function toonScenarios() {
  const state = huidigeState();
  const lijst = leeg(el('scenario-lijst'));

  for (const sc of state.scenarios) {
    const resultaat = toets(state, sc.id);
    const { fouten, waarschuwingen } = resultaat.samenvatting;

    const item = maak(
      'nldd-list-item',
      {
        size: 'md',
        button: true,
        selected: sc.id === state.actiefScenario,
        on: {
          click: () => {
            if (sc.id === state.actiefScenario) return;
            muteer(`Scenario ${sc.naam} gekozen`, (s) => {
              s.actiefScenario = sc.id;
            });
          },
        },
      },
      [
        maak('nldd-title-cell', {
          text: sc.naam,
          'supporting-text': sc.beschrijving || `${resultaat.samenvatting.aantalPlekken} plekken`,
          size: 6,
        }),
        maak('nldd-cell', { width: 'fit-content' }, [
          fouten > 0
            ? maak('nldd-tag', { color: 'rood', size: 'sm', text: String(fouten) })
            : waarschuwingen > 0
              ? maak('nldd-tag', { color: 'donkergeel', size: 'sm', text: String(waarschuwingen) })
              : maak('nldd-tag', { color: 'groen', size: 'sm', icon: 'check', variant: 'icon',
                                   'accessible-label': 'Geen bevindingen' }),
        ]),
        maak('nldd-cell', { width: 'fit-content' }, [
          maak('nldd-icon-button', {
            icon: 'pencil',
            size: 'sm',
            variant: 'neutral-transparent',
            'accessible-label': `Scenario ${sc.naam} bewerken`,
            on: {
              click: (e) => {
                e.stopPropagation();
                openScenarioSheet(sc.id);
              },
            },
          }),
        ]),
      ]
    );
    lijst.append(item);
  }
}

function toonToets() {
  const state = huidigeState();
  const resultaat = toets(state, state.actiefScenario);
  const lijst = leeg(el('toets-lijst'));

  for (const bevinding of resultaat.bevindingen) {
    const item = maak(
      'nldd-list-item',
      {
        size: 'md',
        button: true,
        selected: selectie?.soort === 'bevinding' && selectie.id === bevinding.id,
        on: {
          click: () => {
            selectie = { soort: 'bevinding', id: bevinding.id };
            toonInspector();
            toonToets();
          },
        },
      },
      [
        maak('nldd-icon-cell', {
          icon: STATUS_ICOON[bevinding.status],
          color:
            bevinding.status === 'ok'
              ? 'success'
              : bevinding.status === 'waarschuwing'
                ? 'warning'
                : 'critical',
        }),
        maak('nldd-title-cell', {
          text: bevinding.titel,
          'supporting-text': bevinding.samenvatting,
          size: 6,
        }),
      ]
    );
    lijst.append(item);
  }
}

// ---------------------------------------------------------------- formatieweergave

function toonFormatie() {
  const state = huidigeState();
  const sc = scenario(state);
  const plekken = plekkenVan(state, sc.id);
  const { perPlek } = toewijzingIndex(sc, plekken);
  const persoonById = new Map(state.personen.map((p) => [p.id, p]));
  const houder = leeg(el('view'));

  const container = maak('nldd-container', { padding: '24', 'sm-padding': '16', layout: 'stack', gap: '0' });

  for (const eenheid of state.eenheden) {
    const eigen = plekken.filter((p) => p.eenheidId === eenheid.id);
    const soort = EENHEID_SOORT[eenheid.soort] ?? EENHEID_SOORT.staf;
    const fte = eigen.reduce((t, p) => t + (p.fte ?? 0), 0);
    const kosten = eigen.reduce((t, p) => t + integraleKosten(p.schaal, p.fte ?? 1), 0);
    const bezet = eigen.filter((p) => perPlek.has(p.id)).length;

    const blok = maak('div', { class: 'team' });

    const kop = maak('div', { class: 'team__kop' }, [
      maak('nldd-title', { size: '4' }, [maak('h2', {}, [eenheid.naam])]),
      maak('nldd-tag', { color: soort.color, size: 'sm', text: soort.label }),
      maak('div', { class: 'team__cijfers' }, [
        maak('nldd-text', { size: 'sm', color: 'secondary' }, [`${formatFte(fte)} fte`]),
        maak('nldd-text', { size: 'sm', color: 'secondary' }, [
          `${bezet} van ${eigen.length} bezet`,
        ]),
        maak('nldd-text', { size: 'sm', color: 'secondary' }, [formatEuro(kosten)]),
      ]),
    ]);
    blok.append(kop);

    // Rol en Wie blijven altijd staan: daar gaat het gesprek over. Bij minder
    // ruimte vallen eerst de functiegroep, dan de schaal en de fte weg.
    const tabel = maak('nldd-table', {
      'accessible-label': `Formatie ${eenheid.naam}`,
      columns: 'minmax(180px,1.3fr) 150px 80px 60px minmax(170px,1fr) 44px',
      'md-columns': 'minmax(150px,1.2fr) 80px 60px minmax(150px,1fr) 44px',
      'sm-columns': 'minmax(110px,1fr) minmax(110px,1fr) 44px',
    });

    const kopRij = maak('nldd-table-row', { slot: 'header' }, [
      maak('nldd-text-cell', { text: 'Rol' }),
      maak('nldd-text-cell', { text: 'Functiegroep', 'hide-below': 'lg' }),
      maak('nldd-text-cell', { text: 'Schaal', 'hide-below': 'md' }),
      maak('nldd-text-cell', { text: 'Fte', 'hide-below': 'md' }),
      maak('nldd-text-cell', { text: 'Wie' }),
      maak('nldd-text-cell', { text: '' }),
    ]);
    tabel.append(kopRij);

    for (const plek of eigen) {
      tabel.append(plekRij(plek, perPlek, persoonById));
    }

    // Lege staat: een team zonder plekken is een reëel tussenmoment.
    tabel.append(
      maak('nldd-inline-dialog', {
        slot: 'empty',
        icon: 'users',
        text: 'Nog geen plekken',
        'supporting-text': 'Voeg hieronder een plek toe.',
      })
    );

    blok.append(tabel);

    // Eén klik, geen formulier: precies wat in een gesprek nodig is.
    blok.append(maak('nldd-spacer', { size: '12' }));
    blok.append(
      maak('nldd-button', {
        variant: 'secondary',
        size: 'sm',
        'start-icon': 'plus',
        text: 'Plek erbij',
        on: { click: () => plekToevoegen(eenheid.id) },
      })
    );

    container.append(blok);
  }

  houder.append(container);
}

function plekRij(plek, perPlek, persoonById) {
  const persoonId = perPlek.get(plek.id);
  const persoon = persoonId ? persoonById.get(persoonId) : null;
  const groep = functiegroep(plek.functiegroep);
  const match = persoon ? matchKwaliteit(persoon, plek) : null;

  const rij = maak('nldd-table-row', {
    selected: selectie?.soort === 'plek' && selectie.id === plek.id,
  });

  rij.append(
    maak('nldd-title-cell', {
      text: plek.rol,
      'supporting-text': (plek.expertise ?? []).join(', ') || null,
      size: 6,
      on: { click: () => kiesPlek(plek.id) },
    })
  );
  rij.append(
    maak('nldd-text-cell', { text: groep?.naam ?? '—', 'hide-below': 'lg', color: 'secondary' })
  );
  rij.append(maak('nldd-text-cell', { text: String(plek.schaal ?? '—'), 'hide-below': 'md' }));
  rij.append(maak('nldd-text-cell', { text: formatFte(plek.fte ?? 0), 'hide-below': 'md' }));

  // De cel waar je iemand naartoe sleept. De cel is zelf het sleepbare
  // element: een nldd-text eromheen heeft geen eigen afmeting, dus daar
  // valt niets te pakken.
  const wieCel = maak('nldd-cell', { width: 'full' });
  if (persoon) {
    wieCel.append(maak('nldd-text', { size: 'sm' }, [persoon.naam]));
    maakSleepbaar(wieCel, persoon);
    if (match && match.score < 70) {
      wieCel.append(letOpTag(match));
    }
  } else {
    // Een vacature is een uitnodiging, geen mededeling: hier kies je iemand.
    wieCel.append(vacatureKnop(plek));
  }
  maakOntvanger(wieCel, plek.id);
  rij.append(wieCel);

  rij.append(
    maak('nldd-cell', { width: 'fit-content' }, [
      maak('nldd-icon-button', {
        icon: 'pencil',
        size: 'sm',
        variant: 'neutral-transparent',
        'accessible-label': `Plek ${plek.rol} bewerken`,
        on: { click: () => openPlekSheet(plek.id) },
      }),
    ])
  );

  return rij;
}

/**
 * De knop op een vacante plek, met een popover die de mensen toont die nog
 * nergens staan, op matchkwaliteit gesorteerd. Zo hoef je niet van weergave
 * te wisselen om iemand neer te zetten.
 */
function vacatureKnop(plek) {
  const state = huidigeState();
  const sc = scenario(state);
  const { perPersoon } = toewijzingIndex(sc, plekkenVan(state, sc.id));

  const triggerId = `vacature-${plek.id}`;
  const popoverId = `kies-${plek.id}`;

  // popovertarget komt niet door de shadow-grens van nldd-button heen, dus
  // de popover wordt hier expliciet geopend.
  const knop = maak('nldd-button', {
    id: triggerId,
    variant: 'neutral-transparent',
    size: 'sm',
    text: 'vacant',
    'start-icon': 'plus',
    'popup-type': 'dialog',
    on: {
      click: (e) => {
        e.stopPropagation();
        popover.show?.();
      },
    },
  });

  const popover = maak('nldd-popover', {
    id: popoverId,
    anchor: triggerId,
    width: '320px',
    'accessible-label': `Kies iemand voor ${plek.rol}`,
  });

  // Vrije mensen eerst, daarna de rest: iemand weghalen bij een ander team
  // is een legitieme zet in dit gesprek, maar niet de eerste suggestie.
  const vrij = state.personen.filter((p) => !perPersoon.has(p.id));
  const bezet = state.personen.filter((p) => perPersoon.has(p.id));
  const rangschik = (mensen) =>
    mensen
      .map((persoon) => ({ persoon, match: matchKwaliteit(persoon, plek) }))
      .sort((a, b) => b.match.score - a.match.score);

  const inhoud = maak('nldd-container', { padding: '8', layout: 'stack', gap: '8' });

  if (vrij.length === 0 && bezet.length === 0) {
    inhoud.append(
      maak('nldd-inline-dialog', {
        text: 'Geen mensen beschikbaar',
        'supporting-text': 'Voeg eerst mensen toe aan de lijst.',
      })
    );
  } else {
    const lijst = maak('nldd-list', {
      variant: 'box',
      type: 'listbox',
      'accessible-label': 'Beschikbare mensen',
    });

    for (const { persoon, match } of rangschik(vrij)) {
      lijst.append(kandidaatItem(persoon, match, plek, popover, null));
    }
    for (const { persoon, match } of rangschik(bezet)) {
      const huidigePlekId = perPersoon.get(persoon.id)[0];
      const huidige = plekkenVan(state, sc.id).find((p) => p.id === huidigePlekId);
      lijst.append(kandidaatItem(persoon, match, plek, popover, huidige));
    }
    inhoud.append(lijst);
  }

  popover.append(inhoud);
  const fragment = document.createDocumentFragment();
  fragment.append(knop, popover);
  return fragment;
}

function kandidaatItem(persoon, match, plek, popover, huidigePlek) {
  return maak(
    'nldd-list-item',
    {
      size: 'sm',
      button: true,
      on: {
        click: () => {
          popover.hide?.();
          wijsToe(plek.id, persoon.id);
        },
      },
    },
    [
      maak('nldd-title-cell', {
        text: persoon.naam,
        overline: huidigePlek ? `nu op ${huidigePlek.rol}` : null,
        'supporting-text': `schaal ${persoon.schaal}, ${formatFte(persoon.fte ?? 1)} fte`,
        size: 6,
      }),
      maak('nldd-cell', { width: 'fit-content' }, [
        maak('nldd-tag', {
          color: match.score >= 85 ? 'groen' : match.score >= 70 ? 'donkergeel' : 'neutral',
          size: 'sm',
          text: String(match.score),
          'accessible-label':
            `Match ${match.score} van 100` +
            (match.redenen.length ? ` ${formatRedenen(match.redenen)}` : ''),
        }),
      ]),
    ]
  );
}

/**
 * Slepen op pointer events in plaats van HTML5 drag-and-drop.
 *
 * HTML5-drag werkt hier slecht: het start niet op elementen zonder eigen
 * afmeting, laat zich niet aansturen vanuit een web component met shadow DOM,
 * en doet niets op touch. Pointer events werken overal hetzelfde.
 */
let sleep = null; // { persoon, beeld, doelen }

function maakSleepbaar(node, persoon) {
  node.classList.add('sleepbaar');
  node.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let begonnen = false;

    const beweeg = (ev) => {
      // Pas na een paar pixels: anders wordt elke klik een sleep.
      if (!begonnen) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        begonnen = true;
        startSleep(persoon, ev);
      }
      verplaatsSleep(ev);
    };

    const los = (ev) => {
      document.removeEventListener('pointermove', beweeg);
      document.removeEventListener('pointerup', los);
      if (begonnen) {
        eindigSleep(ev);
        // Voorkom dat de klik na het slepen ook nog de rij selecteert.
        ev.preventDefault();
        ev.stopPropagation();
      }
    };

    document.addEventListener('pointermove', beweeg);
    document.addEventListener('pointerup', los, { once: false });
  });
}

function startSleep(persoon, ev) {
  const beeld = maak('div', { class: 'sleepbeeld' }, [persoon.naam]);
  document.body.append(beeld);
  sleep = { persoon, beeld };
  document.body.classList.add('sleept');
  verplaatsSleep(ev);
}

function verplaatsSleep(ev) {
  if (!sleep) return;
  sleep.beeld.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 12}px)`;

  const onder = document.elementFromPoint(ev.clientX, ev.clientY);
  const doel = onder?.closest?.('[data-plek]');
  for (const n of document.querySelectorAll('.ontvangt')) n.classList.remove('ontvangt');
  if (doel) doel.classList.add('ontvangt');
}

function eindigSleep(ev) {
  if (!sleep) return;
  const onder = document.elementFromPoint(ev.clientX, ev.clientY);
  const doel = onder?.closest?.('[data-plek]');
  const plekId = doel?.getAttribute('data-plek');

  sleep.beeld.remove();
  document.body.classList.remove('sleept');
  for (const n of document.querySelectorAll('.ontvangt')) n.classList.remove('ontvangt');
  const persoon = sleep.persoon;
  sleep = null;

  if (plekId) wijsToe(plekId, persoon.id);
}

/** Maak een element een dropdoel voor een persoon. */
function maakOntvanger(node, plekId) {
  node.setAttribute('data-plek', plekId);
}

function wijsToe(plekId, persoonId) {
  const state = huidigeState();
  const persoon = state.personen.find((p) => p.id === persoonId);
  const sc = scenario(state);
  const plekken = plekkenVan(state, sc.id);
  const plek = plekken.find((p) => p.id === plekId);
  if (!persoon || !plek) return;

  muteer(`${persoon.naam} op ${plek.rol}`, (s) => {
    const doel = s.scenarios.find((x) => x.id === s.actiefScenario);
    // Iemand staat op één plek tegelijk: haal de vorige weg.
    for (const [id, pid] of Object.entries(doel.toewijzingen)) {
      if (pid === persoonId) delete doel.toewijzingen[id];
    }
    doel.toewijzingen[plekId] = persoonId;
  });
}

function haalVanPlek(plekId) {
  muteer('Plek vrijgemaakt', (s) => {
    const doel = s.scenarios.find((x) => x.id === s.actiefScenario);
    delete doel.toewijzingen[plekId];
  });
}

function plekToevoegen(eenheidId) {
  const id = nieuwId('p');
  muteer('Plek toegevoegd', (s) => {
    const doel = s.scenarios.find((x) => x.id === s.actiefScenario);
    doel.extraPlekken = doel.extraPlekken ?? [];
    doel.extraPlekken.push({
      id,
      rol: 'Nieuwe plek',
      functiegroep: 'adviseur-ict',
      schaal: 12,
      fte: 1,
      eenheidId,
      expertise: [],
    });
  });
  // Meteen openen: je voegt een plek toe om hem in te vullen.
  openPlekSheet(id);
}

function kiesPlek(plekId) {
  selectie = { soort: 'plek', id: plekId };
  toonInspector();
  toonView();
}

// ---------------------------------------------------------------- organogram

function toonOrganogram() {
  const state = huidigeState();
  const sc = scenario(state);
  const plekken = plekkenVan(state, sc.id);
  const { perPlek } = toewijzingIndex(sc, plekken);
  const houder = leeg(el('view'));

  const container = maak('nldd-container', { padding: '24', 'sm-padding': '16', layout: 'stack', gap: '16' });
  const organogram = maak('div', { class: 'organogram' });

  // Lagen op basis van parentId, zodat de hark klopt zonder recursie-gedoe.
  const wortels = state.eenheden.filter((e) => !e.parentId);
  const lagen = [wortels];
  let vorige = wortels;
  while (vorige.length) {
    const ids = new Set(vorige.map((e) => e.id));
    const volgende = state.eenheden.filter((e) => ids.has(e.parentId));
    if (!volgende.length) break;
    lagen.push(volgende);
    vorige = volgende;
  }

  for (const laag of lagen) {
    const rij = maak('div', { class: 'organogram__laag' });
    for (const eenheid of laag) {
      const eigen = plekken.filter((p) => p.eenheidId === eenheid.id);
      const soort = EENHEID_SOORT[eenheid.soort] ?? EENHEID_SOORT.staf;
      const fte = eigen.reduce((t, p) => t + (p.fte ?? 0), 0);
      const bezet = eigen.filter((p) => perPlek.has(p.id)).length;

      const balk = maak('div', { class: 'bezetting' });
      for (const plek of eigen) {
        balk.append(
          maak('div', {
            class: 'bezetting__blok',
            'data-bezet': perPlek.has(plek.id) ? 'true' : 'false',
            title: `${plek.rol}${perPlek.has(plek.id) ? '' : ' (vacant)'}`,
          })
        );
      }

      const kaart = maak('nldd-card', { class: 'organogram__kaart' }, [
        maak('nldd-container', { padding: '16', layout: 'stack', gap: '8' }, [
          maak('div', { class: 'kaartkop' }, [
            maak('nldd-title', { size: '5' }, [maak('h3', {}, [eenheid.naam])]),
            maak('nldd-icon-button', {
              icon: 'pencil',
              size: 'sm',
              variant: 'neutral-transparent',
              'accessible-label': `${eenheid.naam} bewerken`,
              on: { click: () => openEenheidSheet(eenheid.id) },
            }),
          ]),
          maak('nldd-tag', { color: soort.color, size: 'sm', text: soort.label }),
          maak('nldd-text', { size: 'sm', color: 'secondary' }, [
            `${formatFte(fte)} fte, ${bezet} van ${eigen.length} bezet`,
          ]),
          eigen.length ? balk : null,
        ]),
      ]);
      rij.append(kaart);
    }
    organogram.append(rij);
  }

  container.append(organogram);

  // Teams horen bij de basis, niet bij één scenario: een team dat je hier
  // toevoegt bestaat in elk scenario.
  container.append(
    maak('nldd-button', {
      variant: 'secondary',
      size: 'sm',
      'start-icon': 'plus',
      text: 'Team erbij',
      on: { click: () => eenheidToevoegen() },
    })
  );

  houder.append(container);
}

// ---------------------------------------------------------------- mensen

function toonMensen() {
  const state = huidigeState();
  const sc = scenario(state);
  const plekken = plekkenVan(state, sc.id);
  const { perPersoon } = toewijzingIndex(sc, plekken);
  const plekById = new Map(plekken.map((p) => [p.id, p]));
  const eenheidById = new Map(state.eenheden.map((e) => [e.id, e]));
  const houder = leeg(el('view'));

  const zonder = state.personen.filter((p) => !perPersoon.has(p.id));
  const met = state.personen.filter((p) => perPersoon.has(p.id));

  const container = maak('nldd-container', { padding: '24', 'sm-padding': '16', layout: 'stack', gap: '24' });

  // Wie nog nergens staat, komt bovenaan. Dit is de vraag waar het mee begon.
  const zonderBlok = maak('div', {});
  zonderBlok.append(
    maak('nldd-title', { size: '4' }, [
      maak('h2', {}, [`Nog geen plek (${zonder.length})`]),
    ])
  );
  zonderBlok.append(maak('nldd-spacer', { size: '12' }));

  if (zonder.length === 0) {
    zonderBlok.append(
      maak('nldd-inline-dialog', {
        variant: 'success',
        text: 'Iedereen heeft een plek',
        'supporting-text': 'In dit scenario is niemand vergeten.',
      })
    );
  } else {
    const lijst = maak('nldd-list', {
      variant: 'box',
      type: 'list',
      'accessible-label': 'Mensen zonder plek',
    });
    for (const persoon of zonder) lijst.append(persoonItem(persoon, null, null));
    zonderBlok.append(lijst);
  }
  container.append(zonderBlok);

  // En de rest, met waar ze staan.
  const metBlok = maak('div', {});
  metBlok.append(
    maak('nldd-title', { size: '4' }, [maak('h2', {}, [`Geplaatst (${met.length})`])])
  );
  metBlok.append(maak('nldd-spacer', { size: '12' }));
  const metLijst = maak('nldd-list', {
    variant: 'box',
    type: 'list',
    'accessible-label': 'Geplaatste mensen',
  });
  for (const persoon of met) {
    const plekId = perPersoon.get(persoon.id)[0];
    const plek = plekById.get(plekId);
    metLijst.append(persoonItem(persoon, plek, eenheidById.get(plek?.eenheidId)));
  }
  metBlok.append(metLijst);
  container.append(metBlok);

  // Mensen erbij hoort hier: dit is de lijst waar je "wie hebben we" leest.
  container.append(
    maak('nldd-button', {
      variant: 'secondary',
      size: 'sm',
      'start-icon': 'plus',
      text: 'Persoon erbij',
      on: { click: () => persoonToevoegen() },
    })
  );

  houder.append(container);
}

function persoonItem(persoon, plek, eenheid) {
  const match = plek ? matchKwaliteit(persoon, plek) : null;

  const item = maak('nldd-list-item', {
    size: 'md',
    button: true,
    selected: selectie?.soort === 'persoon' && selectie.id === persoon.id,
    on: {
      click: () => {
        selectie = { soort: 'persoon', id: persoon.id };
        toonInspector();
        toonView();
      },
    },
  });

  const titel = maak('nldd-title-cell', {
    text: persoon.naam,
    overline: `Schaal ${persoon.schaal}, ${formatFte(persoon.fte ?? 1)} fte`,
    'supporting-text': plek ? `${plek.rol}, ${eenheid?.naam ?? ''}` : 'Nog niet geplaatst',
    size: 6,
  });
  // Sleepbaar, zodat je vanuit deze lijst iemand op een plek kunt zetten.
  maakSleepbaar(titel, persoon);
  item.append(titel);

  // Alle markeringen in één cel, met ruimte ertussen: los per cel plakken
  // ze tegen elkaar aan.
  const herkomst = herkomstVan(persoon);
  const merken = [
    herkomst.tag
      ? maak('nldd-tooltip', { text: herkomst.kort ?? herkomst.label, placement: 'top' }, [
          maak('nldd-tag', { color: herkomst.color, size: 'sm', text: herkomst.tag }),
        ])
      : null,
    match && match.score < 70 ? letOpTag(match) : null,
  ].filter(Boolean);

  if (merken.length) {
    item.append(maak('nldd-cell', { width: 'fit-content' }, [
      maak('div', { class: 'tagrij' }, merken),
    ]));
  }

  item.append(
    maak('nldd-cell', { width: 'fit-content' }, [
      maak('nldd-icon-button', {
        icon: 'pencil',
        size: 'sm',
        variant: 'neutral-transparent',
        'accessible-label': `${persoon.naam || 'Persoon'} bewerken`,
        on: {
          click: (e) => {
            e.stopPropagation();
            openPersoonSheet(persoon.id);
          },
        },
      }),
    ])
  );

  return item;
}

/**
 * De "let op"-tag met de reden in een tooltip, zodat je bij hoveren al ziet
 * waar het om gaat zonder de rij aan te klikken.
 */
function letOpTag(match) {
  const reden = formatRedenen(match.redenen);
  return maak('nldd-tooltip', { text: reden, placement: 'top' }, [
    maak('nldd-tag', {
      color: 'donkergeel',
      size: 'sm',
      text: 'let op',
      'accessible-label': reden,
    }),
  ]);
}

/**
 * Waar iemand vandaan komt. Het onderscheid tussen binnen en buiten het Rijk
 * is er een van geld: externe inhuur telt mee voor het inhuurplafond,
 * personeel van een andere rijksorganisatie niet.
 *
 * `tag` is null voor wie gewoon in dienst is: dat is de regel en verdient
 * geen markering.
 */
const HERKOMSTEN = [
  { id: 'bestaand', label: 'In dienst', tag: null },
  { id: 'werving', label: 'Nog te werven', tag: 'te werven', color: 'hemelblauw' },
  {
    id: 'intern',
    label: 'Intern ingehuurd of gedetacheerd',
    kort: 'binnen het Rijk, bijvoorbeeld ODI of een ander departement',
    tag: 'intern',
    color: 'paars',
  },
  {
    id: 'extern',
    label: 'Externe inhuur',
    kort: 'telt mee voor het inhuurplafond',
    tag: 'extern',
    color: 'oranje',
  },
];

const HERKOMST_PER_ID = new Map(HERKOMSTEN.map((h) => [h.id, h]));

/**
 * Oude waarden uit eerder opgeslagen of geïmporteerde data blijven werken.
 * "inhuur" was niet gesplitst; die lezen we als externe inhuur, want dat is
 * wat er in de praktijk mee bedoeld werd.
 */
const HERKOMST_ALIAS = { detachering: 'intern', inhuur: 'extern' };

function herkomstVan(persoon) {
  const id = HERKOMST_ALIAS[persoon?.herkomst] ?? persoon?.herkomst ?? 'bestaand';
  return HERKOMST_PER_ID.get(id) ?? HERKOMST_PER_ID.get('bestaand');
}

// ---------------------------------------------------------------- vergelijken

function toonVergelijk() {
  const state = huidigeState();
  const houder = leeg(el('view'));
  const container = maak('nldd-container', { padding: '24', 'sm-padding': '16', layout: 'stack', gap: '16' });

  container.append(
    maak('nldd-title', { size: '4' }, [maak('h2', {}, ['Scenario’s naast elkaar'])])
  );

  const raster = maak('div', { class: 'vergelijk' });

  for (const sc of state.scenarios) {
    const resultaat = toets(state, sc.id);
    const s = resultaat.samenvatting;
    const isActief = sc.id === state.actiefScenario;

    const regels = [
      ['Plekken', String(s.aantalPlekken)],
      ['Fte', formatFte(s.totaalFte)],
      ['Vacant', String(s.aantalVacant)],
      ['Zonder plek', String(s.aantalZonderPlek)],
      ['Kosten', formatEuro(s.kosten)],
    ];

    const kaart = maak('nldd-card', {}, [
      maak('nldd-container', { padding: '16', layout: 'stack', gap: '8' }, [
        maak('nldd-title', { size: '5' }, [maak('h3', {}, [sc.naam])]),
        isActief ? maak('nldd-tag', { color: 'lintblauw', size: 'sm', text: 'in beeld' }) : null,
        maak(
          'div',
          {},
          regels.map(([label, waarde]) =>
            maak('div', { class: 'verschil' }, [
              maak('nldd-text', { size: 'sm', color: 'secondary' }, [label]),
              maak('nldd-text', { size: 'sm' }, [waarde]),
            ])
          )
        ),
        maak('nldd-divider', {}),
        maak(
          'div',
          {},
          resultaat.bevindingen
            .filter((b) => b.status !== 'ok')
            .map((b) =>
              maak('div', { class: 'verschil' }, [
                maak('nldd-tag', {
                  color: STATUS_KLEUR[b.status],
                  size: 'sm',
                  text: b.status === 'fout' ? 'fout' : 'let op',
                }),
                maak('nldd-text', { size: 'sm' }, [b.samenvatting]),
              ])
            )
        ),
        isActief
          ? null
          : maak('nldd-button', {
              variant: 'secondary',
              size: 'sm',
              text: 'Deze in beeld',
              on: {
                click: () =>
                  muteer(`Scenario ${sc.naam} gekozen`, (st) => {
                    st.actiefScenario = sc.id;
                  }),
              },
            }),
      ]),
    ]);
    raster.append(kaart);
  }

  container.append(raster);
  houder.append(container);
}

// ---------------------------------------------------------------- inspector

function toonInspector() {
  const houder = leeg(el('inspector'));
  const state = huidigeState();

  if (!selectie) {
    houder.append(
      maak('div', { class: 'inspector-leeg' }, [
        maak('nldd-inline-dialog', {
          icon: 'info',
          text: 'Niets geselecteerd',
          'supporting-text': 'Klik op een plek, een persoon of een toetsregel.',
        }),
      ])
    );
    return;
  }

  const container = maak('nldd-container', { padding: '16', layout: 'stack', gap: '12' });

  if (selectie.soort === 'plek') {
    const sc = scenario(state);
    const plekken = plekkenVan(state, sc.id);
    const plek = plekken.find((p) => p.id === selectie.id);
    if (!plek) return;
    const { perPlek } = toewijzingIndex(sc, plekken);
    const persoon = state.personen.find((p) => p.id === perPlek.get(plek.id));
    const groep = functiegroep(plek.functiegroep);
    const eenheid = state.eenheden.find((e) => e.id === plek.eenheidId);

    container.append(maak('nldd-title', { size: '5' }, [maak('h2', {}, [plek.rol])]));
    container.append(kenmerk('Team', eenheid?.naam ?? '—'));
    container.append(kenmerk('Functiegroep', groep?.naam ?? '—'));
    container.append(
      kenmerk('Schaalbereik FGR', groep ? `${groep.min} tot en met ${groep.max}` : '—')
    );
    container.append(kenmerk('Schaal', String(plek.schaal ?? '—')));
    container.append(kenmerk('Fte', formatFte(plek.fte ?? 0)));
    container.append(kenmerk('Integrale kosten', formatEuro(integraleKosten(plek.schaal, plek.fte ?? 1))));
    container.append(kenmerk('Wie', persoon?.naam ?? 'vacant'));

    if (persoon) {
      const match = matchKwaliteit(persoon, plek);
      if (match.redenen.length) {
        container.append(
          maak('nldd-inline-dialog', {
            variant: 'alert',
            size: 'md',
            text: 'Let op bij deze match',
            'supporting-text': formatRedenen(match.redenen),
          })
        );
      }
      container.append(
        maak('nldd-button', {
          variant: 'secondary',
          size: 'sm',
          text: 'Plek vrijmaken',
          on: { click: () => haalVanPlek(plek.id) },
        })
      );
    }

    container.append(
      maak('nldd-button', {
        variant: 'primary',
        size: 'sm',
        text: 'Plek bewerken',
        on: { click: () => openPlekSheet(plek.id) },
      })
    );
  }

  if (selectie.soort === 'persoon') {
    const persoon = state.personen.find((p) => p.id === selectie.id);
    if (!persoon) return;
    const sc = scenario(state);
    const plekken = plekkenVan(state, sc.id);
    const { perPersoon } = toewijzingIndex(sc, plekken);
    const plekId = perPersoon.get(persoon.id)?.[0];
    const plek = plekken.find((p) => p.id === plekId);

    container.append(maak('nldd-title', { size: '5' }, [maak('h2', {}, [persoon.naam])]));
    container.append(kenmerk('Huidige schaal', String(persoon.schaal ?? '—')));
    container.append(kenmerk('Beschikbaar', `${formatFte(persoon.fte ?? 1)} fte`));
    container.append(kenmerk('Herkomst', herkomstVan(persoon).label));
    container.append(kenmerk('Staat op', plek ? plek.rol : 'nog geen plek'));

    // Waarom er "let op" bij deze persoon staat. Zonder dit is die tag een
    // waarschuwing zonder uitleg.
    const eigenMatch = plek ? matchKwaliteit(persoon, plek) : null;
    if (eigenMatch?.redenen.length) {
      container.append(
        maak('nldd-inline-dialog', {
          variant: 'alert',
          size: 'md',
          text: 'Let op bij deze plaatsing',
          'supporting-text': formatRedenen(eigenMatch.redenen),
        })
      );
    }

    container.append(
      maak('nldd-button', {
        variant: 'secondary',
        size: 'sm',
        text: 'Persoon bewerken',
        on: { click: () => openPersoonSheet(persoon.id) },
      })
    );

    if ((persoon.expertise ?? []).length) {
      container.append(
        maak('div', { class: 'tagrij' }, persoon.expertise.map((e) =>
          maak('nldd-tag', { color: 'neutral', size: 'sm', text: e })
        ))
      );
    }

    // Waar zou deze persoon nog meer kunnen? Helpt bij het schuiven.
    const vrij = plekken.filter((p) => !toewijzingIndex(sc, plekken).perPlek.has(p.id));
    if (vrij.length) {
      const gerangschikt = vrij
        .map((p) => ({ plek: p, match: matchKwaliteit(persoon, p) }))
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 5);

      container.append(maak('nldd-divider', {}));
      container.append(
        maak('nldd-text', { size: 'sm', color: 'secondary' }, ['Vrije plekken die passen'])
      );
      const lijst = maak('nldd-list', {
        variant: 'box',
        type: 'list',
        'accessible-label': 'Passende vrije plekken',
      });
      for (const { plek: vrijePlek, match } of gerangschikt) {
        lijst.append(
          maak(
            'nldd-list-item',
            {
              size: 'sm',
              button: true,
              on: { click: () => wijsToe(vrijePlek.id, persoon.id) },
            },
            [
              maak('nldd-title-cell', {
                text: vrijePlek.rol,
                'supporting-text': `schaal ${vrijePlek.schaal}`,
                size: 6,
              }),
              maak('nldd-cell', { width: 'fit-content' }, [
                maak('nldd-tag', {
                  color: match.score >= 85 ? 'groen' : match.score >= 70 ? 'donkergeel' : 'neutral',
                  size: 'sm',
                  text: `${match.score}`,
                  'accessible-label': `Match ${match.score} van 100. ${formatRedenen(match.redenen)}`,
                }),
              ]),
            ]
          )
        );
      }
      container.append(lijst);
    }
  }

  if (selectie.soort === 'bevinding') {
    const resultaat = toets(state, state.actiefScenario);
    const bevinding = resultaat.bevindingen.find((b) => b.id === selectie.id);
    if (!bevinding) return;

    container.append(maak('nldd-title', { size: '5' }, [maak('h2', {}, [bevinding.titel])]));
    container.append(
      maak('nldd-inline-dialog', {
        variant: bevinding.status === 'ok' ? 'success' : 'alert',
        text: bevinding.samenvatting,
        'supporting-text': bevinding.detail ?? null,
      })
    );

    const sc = scenario(state);
    const plekken = plekkenVan(state, sc.id);

    if (bevinding.personen?.length) {
      container.append(maak('nldd-text', { size: 'sm', color: 'secondary' }, ['Het gaat om']));
      const lijst = maak('nldd-list', { variant: 'box', type: 'list', 'accessible-label': 'Betrokken mensen' });
      for (const persoonId of bevinding.personen) {
        const persoon = state.personen.find((p) => p.id === persoonId);
        if (!persoon) continue;
        lijst.append(
          maak('nldd-list-item', {
            size: 'sm',
            button: true,
            on: {
              click: () => {
                selectie = { soort: 'persoon', id: persoon.id };
                actieveView = 'mensen';
                toonAlles();
              },
            },
          }, [
            maak('nldd-title-cell', {
              text: persoon.naam,
              'supporting-text': `schaal ${persoon.schaal}`,
              size: 6,
            }),
          ])
        );
      }
      container.append(lijst);
    }

    if (bevinding.plekken?.length) {
      container.append(maak('nldd-text', { size: 'sm', color: 'secondary' }, ['Het gaat om']));
      const lijst = maak('nldd-list', { variant: 'box', type: 'list', 'accessible-label': 'Betrokken plekken' });
      for (const plekId of bevinding.plekken.slice(0, 20)) {
        const plek = plekken.find((p) => p.id === plekId);
        if (!plek) continue;
        lijst.append(
          maak('nldd-list-item', {
            size: 'sm',
            button: true,
            on: { click: () => kiesPlek(plek.id) },
          }, [
            maak('nldd-title-cell', {
              text: plek.rol,
              'supporting-text': `schaal ${plek.schaal}`,
              size: 6,
            }),
          ])
        );
      }
      container.append(lijst);
    }
  }

  houder.append(container);
}

function kenmerk(label, waarde) {
  return maak('div', { class: 'kenmerk' }, [
    maak('nldd-text', { size: 'sm', color: 'secondary' }, [label]),
    maak('nldd-text', { size: 'sm' }, [waarde]),
  ]);
}

// ---------------------------------------------------------------- plek bewerken

let sheetPlekId = null;

function openPlekSheet(plekId) {
  sheetPlekId = plekId;
  const state = huidigeState();
  const sc = scenario(state);
  const plek = plekkenVan(state, sc.id).find((p) => p.id === plekId);
  if (!plek) return;

  const houder = leeg(el('plek-sheet-inhoud'));
  const container = maak('nldd-container', { padding: '24', layout: 'stack', gap: '16' });

  container.append(maak('nldd-title', { size: '4' }, [maak('h2', {}, ['Plek bewerken'])]));

  const form = maak('nldd-form', { id: 'plek-form' });

  form.append(
    maak('nldd-form-field', { label: 'Rol' }, [
      maak('nldd-text-field', { name: 'rol', value: plek.rol ?? '' }),
    ])
  );

  // Functiegroep bepaalt het schaalbereik, dus die staat vóór de schaal.
  const select = maak('select', { name: 'functiegroep' });
  for (const [familieId, groepen] of functiegroepenPerFamilie()) {
    const groep = maak('optgroup', { label: FUNCTIEFAMILIES[familieId] ?? familieId });
    for (const fg of groepen) {
      const optie = maak('option', { value: fg.id }, [`${fg.naam} (schaal ${fg.min}-${fg.max})`]);
      if (fg.id === plek.functiegroep) optie.setAttribute('selected', '');
      groep.append(optie);
    }
    select.append(groep);
  }
  form.append(
    maak('nldd-form-field', { label: 'Functiegroep' }, [maak('nldd-dropdown', {}, [select])])
  );

  form.append(
    maak('nldd-form-field', { label: 'Schaal' }, [
      maak('nldd-number-field', { name: 'schaal', value: String(plek.schaal ?? 12), min: '1', max: '18' }),
    ])
  );

  form.append(
    maak('nldd-form-field', { label: 'Fte' }, [
      maak('nldd-number-field', {
        name: 'fte',
        value: String(plek.fte ?? 1),
        min: '0',
        max: '1',
        step: '0.1',
      }),
    ])
  );

  const eenheidSelect = maak('select', { name: 'eenheid' });
  for (const eenheid of state.eenheden) {
    const optie = maak('option', { value: eenheid.id }, [eenheid.naam]);
    if (eenheid.id === plek.eenheidId) optie.setAttribute('selected', '');
    eenheidSelect.append(optie);
  }
  form.append(
    maak('nldd-form-field', { label: 'Team' }, [maak('nldd-dropdown', {}, [eenheidSelect])])
  );

  form.append(
    maak('nldd-form-field', { label: 'Expertise', optional: true }, [
      maak('nldd-text-field', {
        name: 'expertise',
        value: (plek.expertise ?? []).join(', '),
      }),
    ])
  );

  container.append(form);

  container.append(
    maak('nldd-button', {
      variant: 'primary',
      text: 'Opslaan',
      on: { click: () => bewaarPlek() },
    })
  );

  // Verwijderen krijgt afstand van opslaan, zodat niemand zich vergist.
  container.append(maak('nldd-spacer', { size: '24' }));
  container.append(maak('nldd-divider', {}));
  container.append(
    maak('nldd-button', {
      variant: 'destructive',
      size: 'sm',
      text: 'Plek verwijderen',
      on: { click: () => verwijderPlek(plekId) },
    })
  );

  houder.append(container);
  el('plek-sheet').show();
}

function bewaarPlek() {
  const form = el('plek-form');
  const lees = (naam) => form.querySelector(`[name="${naam}"]`)?.value ?? '';
  const rol = lees('rol').trim() || 'Naamloze plek';
  const fg = lees('functiegroep');
  const schaal = Number(lees('schaal')) || null;
  const fte = Number(lees('fte')) || 0;
  const eenheidId = lees('eenheid');
  const expertise = lees('expertise')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  muteer(`Plek ${rol} gewijzigd`, (s) => {
    const sc = s.scenarios.find((x) => x.id === s.actiefScenario);
    const patch = { rol, functiegroep: fg, schaal, fte, eenheidId, expertise };

    const extra = (sc.extraPlekken ?? []).find((p) => p.id === sheetPlekId);
    if (extra) {
      Object.assign(extra, patch);
      return;
    }
    // Een basisplek wijzigen binnen een scenario: maak er een scenario-eigen
    // versie van, zodat het andere scenario ongemoeid blijft. De kopie houdt
    // hetzelfde id, dus de toewijzing blijft vanzelf kloppen; plekkenVan()
    // filtert verwijderdePlekken alleen over de basis, niet over extraPlekken.
    const basis = s.plekken.find((p) => p.id === sheetPlekId);
    if (basis) {
      sc.verwijderdePlekken = sc.verwijderdePlekken ?? [];
      if (!sc.verwijderdePlekken.includes(sheetPlekId)) sc.verwijderdePlekken.push(sheetPlekId);
      sc.extraPlekken = sc.extraPlekken ?? [];
      sc.extraPlekken.push({ ...basis, ...patch });
    }
  });

  el('plek-sheet').hide();
}

function verwijderPlek(plekId) {
  muteer('Plek verwijderd', (s) => {
    const sc = s.scenarios.find((x) => x.id === s.actiefScenario);
    sc.extraPlekken = (sc.extraPlekken ?? []).filter((p) => p.id !== plekId);
    if (s.plekken.some((p) => p.id === plekId)) {
      sc.verwijderdePlekken = sc.verwijderdePlekken ?? [];
      if (!sc.verwijderdePlekken.includes(plekId)) sc.verwijderdePlekken.push(plekId);
    }
    delete sc.toewijzingen[plekId];
  });
  if (selectie?.soort === 'plek' && selectie.id === plekId) selectie = null;
  el('plek-sheet').hide();
}

// ---------------------------------------------------------------- teams beheren

let sheetEenheidId = null;

function eenheidToevoegen() {
  const id = nieuwId('e');
  const state = huidigeState();
  muteer('Team toegevoegd', (s) => {
    s.eenheden.push({
      id,
      naam: '',
      soort: 'core',
      // Onder de bovenste eenheid hangen, zodat het team in de hark past.
      parentId: state.eenheden.find((e) => !e.parentId)?.id ?? null,
    });
  });
  openEenheidSheet(id);
}

/**
 * Teams staan op de gedeelde basis, dus een wijziging geldt in elk scenario.
 * Dat is bewust: twee scenario's vergelijken heeft alleen zin als ze dezelfde
 * organisatie beschrijven.
 */
function openEenheidSheet(eenheidId) {
  sheetEenheidId = eenheidId;
  const state = huidigeState();
  const eenheid = state.eenheden.find((e) => e.id === eenheidId);
  if (!eenheid) return;

  const houder = leeg(el('eenheid-sheet-inhoud'));
  const container = maak('nldd-container', { padding: '24', layout: 'stack', gap: '16' });

  container.append(
    maak('nldd-title', { size: '4' }, [
      maak('h2', {}, [eenheid.naam ? 'Team bewerken' : 'Nieuw team']),
    ])
  );

  const form = maak('nldd-form', { id: 'eenheid-form' });

  form.append(
    maak('nldd-form-field', { label: 'Naam' }, [
      maak('nldd-text-field', { name: 'naam', value: eenheid.naam ?? '' }),
    ])
  );

  const soort = maak('select', { name: 'soort' });
  for (const [id, info] of Object.entries(EENHEID_SOORT)) {
    const optie = maak('option', { value: id }, [info.label]);
    if (id === eenheid.soort) optie.setAttribute('selected', '');
    soort.append(optie);
  }
  form.append(
    maak('nldd-form-field', {
      label: 'Soort',
      'supporting-label': 'Bepaalt de verhouding kern tegenover doorbraak in de toets',
    }, [maak('nldd-dropdown', {}, [soort])])
  );

  // Een team kan niet onder zichzelf hangen, en ook niet onder zijn eigen
  // nakomelingen: dat maakt een lus in de hark.
  const verboden = nakomelingen(state.eenheden, eenheid.id);
  const ouder = maak('select', { name: 'parent' });
  ouder.append(maak('option', { value: '' }, ['(bovenaan)']));
  for (const kandidaat of state.eenheden) {
    if (kandidaat.id === eenheid.id || verboden.has(kandidaat.id)) continue;
    const optie = maak('option', { value: kandidaat.id }, [kandidaat.naam || '(naamloos)']);
    if (kandidaat.id === eenheid.parentId) optie.setAttribute('selected', '');
    ouder.append(optie);
  }
  form.append(
    maak('nldd-form-field', { label: 'Valt onder' }, [maak('nldd-dropdown', {}, [ouder])])
  );

  container.append(form);
  container.append(
    maak('nldd-button', {
      variant: 'primary',
      text: 'Opslaan',
      on: { click: () => bewaarEenheid() },
    })
  );

  container.append(maak('nldd-spacer', { size: '24' }));
  container.append(maak('nldd-divider', {}));

  // Zeggen wat verwijderen kost voordat iemand erop drukt.
  const sc = scenario(state);
  const raakt = plekkenVan(state, sc.id).filter((p) => p.eenheidId === eenheid.id).length;
  const kinderen = state.eenheden.filter((e) => e.parentId === eenheid.id).length;
  if (raakt || kinderen) {
    const delen = [];
    if (raakt) delen.push(`${raakt} ${raakt === 1 ? 'plek verdwijnt' : 'plekken verdwijnen'} mee`);
    if (kinderen) {
      delen.push(
        `${kinderen} ${kinderen === 1 ? 'onderliggend team schuift' : 'onderliggende teams schuiven'} omhoog`
      );
    }
    container.append(
      maak('nldd-text', { size: 'sm', color: 'secondary' }, [`${formatOpsomming(delen)}.`])
    );
  }
  container.append(
    maak('nldd-button', {
      variant: 'destructive',
      size: 'sm',
      text: 'Team verwijderen',
      on: { click: () => verwijderEenheid(eenheid.id) },
    })
  );

  houder.append(container);
  el('eenheid-sheet').show();
}

/** Alle eenheden onder deze, zodat je een team niet onder zijn eigen kind hangt. */
function nakomelingen(eenheden, id) {
  const gevonden = new Set();
  let laag = [id];
  while (laag.length) {
    const kinderen = eenheden.filter((e) => laag.includes(e.parentId)).map((e) => e.id);
    for (const kind of kinderen) gevonden.add(kind);
    laag = kinderen;
  }
  return gevonden;
}

function bewaarEenheid() {
  const form = el('eenheid-form');
  const lees = (naam) => form.querySelector(`[name="${naam}"]`)?.value ?? '';
  const naam = lees('naam').trim() || 'Naamloos team';
  const soort = lees('soort');
  const parentId = lees('parent') || null;

  muteer(`Team ${naam} gewijzigd`, (s) => {
    const eenheid = s.eenheden.find((e) => e.id === sheetEenheidId);
    if (eenheid) Object.assign(eenheid, { naam, soort, parentId });
  });

  el('eenheid-sheet').hide();
}

function verwijderEenheid(eenheidId) {
  muteer('Team verwijderd', (s) => {
    const eenheid = s.eenheden.find((e) => e.id === eenheidId);
    const nieuweOuder = eenheid?.parentId ?? null;

    s.eenheden = s.eenheden.filter((e) => e.id !== eenheidId);
    // Onderliggende teams schuiven een laag omhoog in plaats van te verdwijnen.
    for (const kind of s.eenheden) {
      if (kind.parentId === eenheidId) kind.parentId = nieuweOuder;
    }

    // Plekken van dit team verdwijnen uit elk scenario, inclusief hun
    // toewijzingen, anders blijven mensen aan een spookplek hangen.
    const weg = new Set(s.plekken.filter((p) => p.eenheidId === eenheidId).map((p) => p.id));
    s.plekken = s.plekken.filter((p) => p.eenheidId !== eenheidId);
    for (const sc of s.scenarios) {
      for (const plek of sc.extraPlekken ?? []) {
        if (plek.eenheidId === eenheidId) weg.add(plek.id);
      }
      sc.extraPlekken = (sc.extraPlekken ?? []).filter((p) => p.eenheidId !== eenheidId);
      for (const plekId of weg) delete sc.toewijzingen[plekId];
    }
  });
  el('eenheid-sheet').hide();
}

// ---------------------------------------------------------------- mensen beheren

let sheetPersoonId = null;

function persoonToevoegen() {
  const id = nieuwId('m');
  muteer('Persoon toegevoegd', (s) => {
    s.personen.push({
      id,
      naam: '',
      schaal: 12,
      fte: 1,
      expertise: [],
      herkomst: 'bestaand',
    });
  });
  openPersoonSheet(id);
}

/**
 * Mensen horen bij de hele plaat, niet bij één scenario: een persoon die je
 * toevoegt telt in elk scenario mee. Anders klopt "vergeet ik niemand" niet.
 */
function openPersoonSheet(persoonId) {
  sheetPersoonId = persoonId;
  const state = huidigeState();
  const persoon = state.personen.find((p) => p.id === persoonId);
  if (!persoon) return;

  const houder = leeg(el('persoon-sheet-inhoud'));
  const container = maak('nldd-container', { padding: '24', layout: 'stack', gap: '16' });

  container.append(
    maak('nldd-title', { size: '4' }, [
      maak('h2', {}, [persoon.naam ? 'Persoon bewerken' : 'Nieuwe persoon']),
    ])
  );

  const form = maak('nldd-form', { id: 'persoon-form' });

  form.append(
    maak('nldd-form-field', { label: 'Naam' }, [
      maak('nldd-text-field', { name: 'naam', value: persoon.naam ?? '' }),
    ])
  );

  form.append(
    maak('nldd-form-field', { label: 'Huidige schaal' }, [
      maak('nldd-number-field', {
        name: 'schaal',
        value: String(persoon.schaal ?? 12),
        min: '1',
        max: '18',
      }),
    ])
  );

  form.append(
    maak('nldd-form-field', { label: 'Beschikbare fte' }, [
      maak('nldd-number-field', {
        name: 'fte',
        value: String(persoon.fte ?? 1),
        min: '0',
        max: '1',
        step: '0.1',
      }),
    ])
  );

  const herkomst = maak('select', { name: 'herkomst' });
  const huidigeHerkomst = herkomstVan(persoon).id;
  for (const soort of HERKOMSTEN) {
    const optie = maak('option', { value: soort.id }, [
      soort.kort ? `${soort.label} (${soort.kort})` : soort.label,
    ]);
    if (soort.id === huidigeHerkomst) optie.setAttribute('selected', '');
    herkomst.append(optie);
  }
  form.append(
    maak('nldd-form-field', { label: 'Herkomst' }, [maak('nldd-dropdown', {}, [herkomst])])
  );

  form.append(
    maak('nldd-form-field', {
      label: 'Expertise',
      optional: true,
      'supporting-label': 'Gescheiden door komma’s, bijvoorbeeld: engineering, data',
    }, [
      maak('nldd-text-field', {
        name: 'expertise',
        value: (persoon.expertise ?? []).join(', '),
      }),
    ])
  );

  container.append(form);
  container.append(
    maak('nldd-button', {
      variant: 'primary',
      text: 'Opslaan',
      on: { click: () => bewaarPersoon() },
    })
  );

  // Verwijderen op afstand van opslaan, zodat een misklik niet iemand wist.
  container.append(maak('nldd-spacer', { size: '24' }));
  container.append(maak('nldd-divider', {}));

  const sc = scenario(state);
  const { perPersoon } = toewijzingIndex(sc, plekkenVan(state, sc.id));
  const staatErgens = perPersoon.has(persoon.id);
  if (staatErgens) {
    container.append(
      maak('nldd-text', { size: 'sm', color: 'secondary' }, [
        'Deze persoon staat op een plek. Verwijderen haalt hem daar ook af.',
      ])
    );
  }
  container.append(
    maak('nldd-button', {
      variant: 'destructive',
      size: 'sm',
      text: 'Persoon verwijderen',
      on: { click: () => verwijderPersoon(persoon.id) },
    })
  );

  houder.append(container);
  el('persoon-sheet').show();
}

function bewaarPersoon() {
  const form = el('persoon-form');
  const lees = (naam) => form.querySelector(`[name="${naam}"]`)?.value ?? '';
  const naam = lees('naam').trim() || 'Naamloos';
  const schaal = Number(lees('schaal')) || null;
  const fte = Number(lees('fte')) || 0;
  const herkomst = lees('herkomst');
  const expertise = lees('expertise')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  muteer(`${naam} gewijzigd`, (s) => {
    const persoon = s.personen.find((p) => p.id === sheetPersoonId);
    if (persoon) Object.assign(persoon, { naam, schaal, fte, herkomst, expertise });
  });

  el('persoon-sheet').hide();
}

function verwijderPersoon(persoonId) {
  muteer('Persoon verwijderd', (s) => {
    s.personen = s.personen.filter((p) => p.id !== persoonId);
    // Ook uit elk scenario halen, anders blijft er een toewijzing hangen
    // naar iemand die niet meer bestaat.
    for (const sc of s.scenarios) {
      for (const [plekId, pid] of Object.entries(sc.toewijzingen)) {
        if (pid === persoonId) delete sc.toewijzingen[plekId];
      }
    }
  });
  if (selectie?.soort === 'persoon' && selectie.id === persoonId) selectie = null;
  el('persoon-sheet').hide();
}

// ---------------------------------------------------------------- scenario's

function scenarioToevoegen() {
  const state = huidigeState();
  const bron = scenario(state);
  const id = nieuwId('s');
  // "(kopie)" niet stapelen bij een kopie van een kopie.
  const stam = bron.naam.replace(/\s*\(kopie(?:\s\d+)?\)\s*$/, '');
  const bestaand = state.scenarios.filter((s) => s.naam.startsWith(`${stam} (kopie`)).length;
  const naam = bestaand ? `${stam} (kopie ${bestaand + 1})` : `${stam} (kopie)`;

  muteer(`Scenario gekopieerd van ${bron.naam}`, (s) => {
    s.scenarios.push({
      id,
      naam,
      beschrijving: `Gekopieerd van ${bron.naam}`,
      gekopieerdVan: bron.naam,
      toewijzingen: { ...bron.toewijzingen },
      extraPlekken: structuredClone(bron.extraPlekken ?? []),
      verwijderdePlekken: [...(bron.verwijderdePlekken ?? [])],
    });
    s.actiefScenario = id;
  });
  // Meteen openen: je kopieert een scenario om het een eigen naam en richting
  // te geven, niet om "(kopie)" te laten staan.
  openScenarioSheet(id);
}

let sheetScenarioId = null;

function openScenarioSheet(scenarioId) {
  sheetScenarioId = scenarioId;
  const state = huidigeState();
  const sc = state.scenarios.find((x) => x.id === scenarioId);
  if (!sc) return;

  const houder = leeg(el('scenario-sheet-inhoud'));
  const container = maak('nldd-container', { padding: '24', layout: 'stack', gap: '16' });

  container.append(maak('nldd-title', { size: '4' }, [maak('h2', {}, ['Scenario'])]));

  if (sc.gekopieerdVan) {
    container.append(
      maak('nldd-inline-dialog', {
        icon: 'copy',
        text: `Kopie van ${sc.gekopieerdVan}`,
        'supporting-text':
          'De plekken en toewijzingen zijn overgenomen. Mensen en teams zijn gedeeld, ' +
          'dus die blijven hetzelfde in elk scenario.',
      })
    );
  }

  const form = maak('nldd-form', { id: 'scenario-form' });
  form.append(
    maak('nldd-form-field', { label: 'Naam' }, [
      maak('nldd-text-field', { name: 'naam', value: sc.naam ?? '' }),
    ])
  );
  form.append(
    maak('nldd-form-field', {
      label: 'Waar gaat deze variant over',
      optional: true,
      'supporting-label': 'Staat in de lijst en bij het vergelijken',
    }, [
      maak('nldd-multi-line-text-field', {
        name: 'beschrijving',
        rows: '3',
        value: sc.beschrijving ?? '',
      }),
    ])
  );

  container.append(form);
  container.append(
    maak('nldd-button', {
      variant: 'primary',
      text: 'Opslaan',
      on: { click: () => bewaarScenario() },
    })
  );

  // Het laatste scenario weggooien laat niets over om naar te kijken.
  if (state.scenarios.length > 1) {
    container.append(maak('nldd-spacer', { size: '24' }));
    container.append(maak('nldd-divider', {}));
    container.append(
      maak('nldd-button', {
        variant: 'destructive',
        size: 'sm',
        text: 'Scenario verwijderen',
        on: { click: () => verwijderScenario(sc.id) },
      })
    );
  }

  houder.append(container);
  el('scenario-sheet').show();
}

function bewaarScenario() {
  const form = el('scenario-form');
  const lees = (naam) => form.querySelector(`[name="${naam}"]`)?.value ?? '';
  const naam = lees('naam').trim() || 'Naamloos scenario';
  const beschrijving = lees('beschrijving').trim();

  muteer(`Scenario ${naam} gewijzigd`, (s) => {
    const sc = s.scenarios.find((x) => x.id === sheetScenarioId);
    if (sc) Object.assign(sc, { naam, beschrijving });
  });

  el('scenario-sheet').hide();
}

function verwijderScenario(scenarioId) {
  muteer('Scenario verwijderd', (s) => {
    s.scenarios = s.scenarios.filter((x) => x.id !== scenarioId);
    if (s.actiefScenario === scenarioId) s.actiefScenario = s.scenarios[0].id;
  });
  el('scenario-sheet').hide();
}

// ---------------------------------------------------------------- import/export

function exporteerBestand() {
  const blob = new Blob([exporteer()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'formatieplaat.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importeerBestand(bestand) {
  const lezer = new FileReader();
  lezer.onload = () => {
    try {
      // vervangState normaliseert en gooit als het geen formatieplaat is.
      vervangState(JSON.parse(String(lezer.result)), 'Bestand geïmporteerd');
    } catch {
      meldFout('Dit bestand kon niet worden gelezen. Verwacht is een eerder geëxporteerde formatieplaat.');
    }
  };
  lezer.readAsText(bestand);
}

function meldFout(tekst) {
  const melding = maak('nldd-notification', { variant: 'alert', text: tekst });
  document.body.append(melding);
  setTimeout(() => melding.remove(), 6000);
}

// ---------------------------------------------------------------- tekenen

function toonView() {
  if (actieveView === 'formatie') toonFormatie();
  else if (actieveView === 'organogram') toonOrganogram();
  else if (actieveView === 'mensen') toonMensen();
  else if (actieveView === 'vergelijk') toonVergelijk();
}

function toonTitel() {
  const state = huidigeState();
  const sc = scenario(state);
  const resultaat = toets(state, sc.id);
  const s = resultaat.samenvatting;

  const balk = el('titelbalk');
  balk.setAttribute('text', `${state.naam} — ${sc.naam}`);
  // De teller die de aanleiding was: hoeveel plekken, hoeveel mensen,
  // en vergeet ik niemand. Permanent in beeld, niet weggestopt.
  balk.setAttribute(
    'supporting-text',
    `${s.aantalPlekken} plekken, ${formatFte(s.totaalFte)} fte, ` +
      `${state.personen.length} mensen, ${s.aantalZonderPlek} zonder plek, ` +
      `${formatEuro(s.kosten)}`
  );
}

function toonAlles() {
  toonTitel();
  toonViews();
  toonScenarios();
  toonToets();
  toonView();
  toonInspector();
}

// ---------------------------------------------------------------- opstarten

laad(voorbeeldState);
abonneer(() => toonAlles());

el('scenario-toevoegen').addEventListener('click', scenarioToevoegen);

el('undo').addEventListener('click', () => {
  const beschrijving = undo();
  if (beschrijving) meldOngedaan(beschrijving);
});

el('exporteer').addEventListener('click', exporteerBestand);
el('importeer').addEventListener('click', () => el('import-bestand').click());
el('import-bestand').addEventListener('change', (e) => {
  const bestand = e.target.files?.[0];
  if (bestand) importeerBestand(bestand);
  e.target.value = '';
});

function meldOngedaan(beschrijving) {
  const melding = maak('nldd-notification', {
    variant: 'success',
    text: `Ongedaan gemaakt: ${beschrijving}`,
  });
  document.body.append(melding);
  setTimeout(() => melding.remove(), 4000);
}

// Ctrl/Cmd+Z, want dit is een werkinstrument.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    const beschrijving = undo();
    if (beschrijving) meldOngedaan(beschrijving);
  }
});

toonAlles();
