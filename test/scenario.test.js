/**
 * Tests voor de scenario-afbakening: wat is gedeeld en wat is per scenario.
 *
 * Draaien: node --test test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { voorbeeldState } from '../src/voorbeelddata.js';
import { plekkenVan, eenhedenVan, toewijzingIndex, toets } from '../src/model.js';
import { normaliseer } from '../src/state.js';

const verse = () => structuredClone(voorbeeldState);

test('scenario deelt de personenpool met de basis', () => {
  const s = verse();
  assert.ok(s.personen.length > 0);
  // Er is maar één personenlijst, op de top-level state.
  assert.ok(!('personen' in s.scenarios[0]));
});

test('een plek toevoegen raakt alleen het eigen scenario', () => {
  const s = verse();
  const voor1 = plekkenVan(s, 's-1').length;
  const voor2 = plekkenVan(s, 's-2').length;
  s.scenarios[0].extraPlekken.push({
    id: 'p-nieuw',
    rol: 'Test',
    schaal: 12,
    fte: 1,
    eenheidId: 'e-platform',
    expertise: [],
  });
  assert.equal(plekkenVan(s, 's-1').length, voor1 + 1, 'scenario 1 krijgt er een plek bij');
  assert.equal(plekkenVan(s, 's-2').length, voor2, 'scenario 2 blijft gelijk');
});

test('een basisplek bewerken maakt een scenario-eigen kopie', () => {
  const s = verse();
  const sc = s.scenarios[0];
  // Een plek die in beide scenario's bestaat.
  const basis = s.plekken.find(
    (p) => !s.scenarios.some((x) => (x.verwijderdePlekken ?? []).includes(p.id))
  );
  const oudeRol = basis.rol;

  // Wat bewaarPlek() doet.
  sc.verwijderdePlekken.push(basis.id);
  sc.extraPlekken.push({ ...basis, rol: 'Gewijzigd' });

  const hier = plekkenVan(s, 's-1').filter((p) => p.id === basis.id);
  const daar = plekkenVan(s, 's-2').filter((p) => p.id === basis.id);

  // Precies één versie zichtbaar, niet twee: de filter geldt alleen voor
  // de basisplekken, extraPlekken worden er ongefilterd achter geplakt.
  assert.equal(hier.length, 1, 'kopie vervangt het origineel, geen duplicaat');
  assert.equal(hier[0].rol, 'Gewijzigd');
  assert.equal(daar[0].rol, oudeRol, 'het andere scenario blijft ongemoeid');
});

test('de toewijzing blijft kloppen na copy-on-write', () => {
  const s = verse();
  const sc = s.scenarios[0];
  const basis = s.plekken.find((p) => sc.toewijzingen[p.id]);
  const voor = sc.toewijzingen[basis.id];

  sc.verwijderdePlekken.push(basis.id);
  sc.extraPlekken.push({ ...basis, rol: 'Gewijzigd' });

  const { perPlek } = toewijzingIndex(sc, plekkenVan(s, 's-1'));
  assert.equal(perPlek.get(basis.id), voor);
});

test('een toewijzing naar een verdwenen plek laat niemand verdwijnen', () => {
  const s = verse();
  const sc = s.scenarios[0];
  // Plek weg, toewijzing blijft staan: kan uit een import komen.
  const bezet = s.plekken.find((p) => sc.toewijzingen[p.id]);
  const wie = s.personen.find((p) => p.id === sc.toewijzingen[bezet.id]).naam;
  sc.verwijderdePlekken.push(bezet.id);

  const resultaat = toets(s, 's-1');
  const namen = resultaat.bevindingen[0].personen.map(
    (id) => s.personen.find((p) => p.id === id).naam
  );
  assert.ok(namen.includes(wie), 'wie zijn plek kwijt is, staat zonder plek');
});

test('normen gelden voor alle scenarios', () => {
  const s = verse();
  assert.ok(s.normen, 'normen staan op de top-level state');
  assert.ok(!('normen' in s.scenarios[0]), 'en niet per scenario');
});

test('een team toevoegen raakt alleen het eigen scenario', () => {
  const s = verse();
  const voor1 = eenhedenVan(s, 's-1').length;
  const voor2 = eenhedenVan(s, 's-2').length;
  s.scenarios[0].extraEenheden = [
    { id: 'e-nieuw', naam: 'Doorbraak: toezicht', soort: 'doorbraak', parentId: s.eenheden[0].id },
  ];
  assert.equal(eenhedenVan(s, 's-1').length, voor1 + 1);
  assert.equal(eenhedenVan(s, 's-2').length, voor2, 'het andere scenario ziet het team niet');
});

test('een basisteam bewerken maakt een scenario-eigen kopie', () => {
  const s = verse();
  const sc = s.scenarios[0];
  const basis = s.eenheden.find((e) => e.parentId);
  const oudeNaam = basis.naam;
  sc.verwijderdeEenheden = [basis.id];
  sc.extraEenheden = [{ ...basis, naam: 'Hernoemd team' }];

  const hier = eenhedenVan(s, 's-1').filter((e) => e.id === basis.id);
  const daar = eenhedenVan(s, 's-2').filter((e) => e.id === basis.id);
  assert.equal(hier.length, 1, 'geen duplicaat');
  assert.equal(hier[0].naam, 'Hernoemd team');
  assert.equal(daar[0].naam, oudeNaam);
});

test('de soort van een scenario-eigen team telt mee in de toets', () => {
  const s = verse();
  const sc = s.scenarios[0];
  // Maak een kernteam tot doorbraakproject, alleen in scenario 1.
  const basis = s.eenheden.find((e) => e.soort === 'core');
  sc.verwijderdeEenheden = [basis.id];
  sc.extraEenheden = [{ ...basis, soort: 'doorbraak' }];

  const hier = toets(s, 's-1').bevindingen.find((b) => b.id === 'core-doorbraak');
  const daar = toets(s, 's-2').bevindingen.find((b) => b.id === 'core-doorbraak');
  assert.notEqual(hier.waarde, daar.waarde, 'de verhouding verschilt per scenario');
});

test('normaliseer vult ontbrekende velden aan', () => {
  const kaal = {
    personen: [{ id: 'm-1', naam: 'A', schaal: 12, fte: 1 }],
    scenarios: [{ id: 's-1', naam: 'Basis' }],
  };
  const s = normaliseer(kaal);
  assert.deepEqual(s.eenheden, []);
  assert.deepEqual(s.plekken, []);
  assert.deepEqual(s.scenarios[0].toewijzingen, {});
  assert.equal(s.actiefScenario, 's-1');
  // En de toets draait zonder te crashen.
  assert.ok(toets(s, 's-1').samenvatting);
});

test('normaliseer geeft een plek zonder team een eigen kopje', () => {
  const s = normaliseer({
    personen: [],
    plekken: [{ id: 'p-1', rol: 'Zwever', schaal: 12, fte: 1, eenheidId: 'bestaat-niet' }],
    scenarios: [{ id: 's-1', naam: 'Basis' }],
  });
  const overig = s.eenheden.find((e) => e.id === 'e-overig');
  assert.ok(overig, 'er komt een kopje Overig bij');
  assert.equal(s.plekken[0].eenheidId, 'e-overig');
});

test('normaliseer weigert wat geen formatieplaat is', () => {
  assert.equal(normaliseer(null), null);
  assert.equal(normaliseer({ iets: 'anders' }), null);
  assert.equal(normaliseer({ personen: [], scenarios: [] }), null);
});
