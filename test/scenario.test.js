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
  assert.equal(s.personen.length, 20);
  // Er is maar één personenlijst, op de top-level state.
  assert.ok(!('personen' in s.scenarios[0]));
});

test('een plek toevoegen raakt alleen het eigen scenario', () => {
  const s = verse();
  s.scenarios[0].extraPlekken.push({
    id: 'p-nieuw',
    rol: 'Test',
    schaal: 12,
    fte: 1,
    eenheidId: 'e-platform',
    expertise: [],
  });
  assert.equal(plekkenVan(s, 's-1').length, 20);
  assert.equal(plekkenVan(s, 's-2').length, 19);
});

test('een basisplek bewerken maakt een scenario-eigen kopie', () => {
  const s = verse();
  const sc = s.scenarios[0];
  const basis = s.plekken.find((p) => p.id === 'p-13');

  // Wat bewaarPlek() doet.
  sc.verwijderdePlekken.push('p-13');
  sc.extraPlekken.push({ ...basis, rol: 'Gewijzigd' });

  const hier = plekkenVan(s, 's-1').filter((p) => p.id === 'p-13');
  const daar = plekkenVan(s, 's-2').filter((p) => p.id === 'p-13');

  // Precies één versie zichtbaar, niet twee: de filter geldt alleen voor
  // de basisplekken, extraPlekken worden er ongefilterd achter geplakt.
  assert.equal(hier.length, 1, 'kopie vervangt het origineel, geen duplicaat');
  assert.equal(hier[0].rol, 'Gewijzigd');
  assert.equal(daar[0].rol, 'Engineer', 'het andere scenario blijft ongemoeid');
});

test('de toewijzing blijft kloppen na copy-on-write', () => {
  const s = verse();
  const sc = s.scenarios[0];
  const basis = s.plekken.find((p) => p.id === 'p-13');
  const voor = sc.toewijzingen['p-13'];

  sc.verwijderdePlekken.push('p-13');
  sc.extraPlekken.push({ ...basis, rol: 'Gewijzigd' });

  const { perPlek } = toewijzingIndex(sc, plekkenVan(s, 's-1'));
  assert.equal(perPlek.get('p-13'), voor);
});

test('een toewijzing naar een verdwenen plek laat niemand verdwijnen', () => {
  const s = verse();
  // Plek weg, toewijzing blijft staan: kan uit een import komen.
  s.scenarios[0].verwijderdePlekken.push('p-13');

  const resultaat = toets(s, 's-1');
  const namen = resultaat.bevindingen[0].personen.map(
    (id) => s.personen.find((p) => p.id === id).naam
  );
  assert.ok(namen.includes('F. Foxtrot'), 'wie zijn plek kwijt is, staat zonder plek');
});

test('normen gelden voor alle scenarios', () => {
  const s = verse();
  assert.ok(s.normen, 'normen staan op de top-level state');
  assert.ok(!('normen' in s.scenarios[0]), 'en niet per scenario');
});

test('een team toevoegen raakt alleen het eigen scenario', () => {
  const s = verse();
  s.scenarios[0].extraEenheden = [
    { id: 'e-nieuw', naam: 'Doorbraak: toezicht', soort: 'doorbraak', parentId: 'e-mt' },
  ];
  assert.equal(eenhedenVan(s, 's-1').length, 7);
  assert.equal(eenhedenVan(s, 's-2').length, 6, 'het andere scenario ziet het team niet');
});

test('een basisteam bewerken maakt een scenario-eigen kopie', () => {
  const s = verse();
  const sc = s.scenarios[0];
  const basis = s.eenheden.find((e) => e.id === 'e-platform');
  sc.verwijderdeEenheden = ['e-platform'];
  sc.extraEenheden = [{ ...basis, naam: 'Platform en infra' }];

  const hier = eenhedenVan(s, 's-1').filter((e) => e.id === 'e-platform');
  const daar = eenhedenVan(s, 's-2').filter((e) => e.id === 'e-platform');
  assert.equal(hier.length, 1, 'geen duplicaat');
  assert.equal(hier[0].naam, 'Platform en infra');
  assert.equal(daar[0].naam, 'Platform');
});

test('de soort van een scenario-eigen team telt mee in de toets', () => {
  const s = verse();
  const sc = s.scenarios[0];
  // Maak Platform een doorbraakproject, alleen in scenario 1.
  const basis = s.eenheden.find((e) => e.id === 'e-platform');
  sc.verwijderdeEenheden = ['e-platform'];
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
