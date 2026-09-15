/**
 * Tests op de versleutelde opslag: migratie, debounce en vergrendelen.
 *
 * localStorage wordt hier vervangen door een stub, zodat we ook kunnen
 * toetsen wat er gebeurt als schrijven mislukt.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/** Minimale localStorage, met de mogelijkheid om te laten falen. */
class OpslagStub {
  constructor() {
    this.kaart = new Map();
    this.faalt = false;
    this.schrijfAantal = 0;
  }
  getItem(k) {
    return this.kaart.has(k) ? this.kaart.get(k) : null;
  }
  setItem(k, v) {
    this.schrijfAantal++;
    if (this.faalt) throw new Error('QuotaExceededError');
    this.kaart.set(k, String(v));
  }
  removeItem(k) {
    this.kaart.delete(k);
  }
}

/** Verse state-module per test, want die houdt module-state vast. */
async function verseModule() {
  const stub = new OpslagStub();
  globalThis.localStorage = stub;
  const mod = await import(`../src/state.js?t=${Math.random()}`);
  return { mod, stub };
}

const plaatje = {
  naam: 'Testplaat',
  personen: [{ id: 'm-1', naam: 'G. Hopper', schaal: 13, fte: 1, expertise: [] }],
  plekken: [],
  eenheden: [],
  scenarios: [{ id: 's-1', naam: 'Basis', toewijzingen: {} }],
  actiefScenario: 's-1',
};

test('een wachtwoord instellen schrijft versleuteld weg', async () => {
  const { mod, stub } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);

  const ruw = stub.getItem('ruimte-v1');
  assert.ok(ruw, 'er staat iets onder de nieuwe sleutel');
  assert.ok(!ruw.includes('Hopper'), 'de naam is niet leesbaar');
  assert.ok(!ruw.includes('Testplaat'));
  assert.equal(mod.isVergrendeld(), false);
});

test('ontgrendelen met het juiste wachtwoord geeft de plaat terug', async () => {
  const { mod } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);
  await mod.spoel();
  await mod.vergrendel();

  const terug = await mod.ontgrendel('geheim', plaatje);
  assert.equal(terug.personen[0].naam, 'G. Hopper');
});

test('ontgrendelen met een fout wachtwoord gooit en laat de opslag intact', async () => {
  const { mod, stub } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);
  const voor = stub.getItem('ruimte-v1');
  await mod.vergrendel();

  await assert.rejects(() => mod.ontgrendel('fout', plaatje), mod.WachtwoordFout);
  assert.equal(stub.getItem('ruimte-v1'), voor, 'niets overschreven');
});

test('een oude platte plaat wordt overgezet en daarna opgeruimd', async () => {
  const { mod, stub } = await verseModule();
  const oud = { ...plaatje, naam: 'Oude plaat' };
  stub.setItem('formatietool-v1', JSON.stringify(oud));

  assert.equal(mod.opslagModus(), 'plat');
  const na = await mod.zetWachtwoord('geheim', plaatje);

  assert.equal(na.naam, 'Oude plaat', 'de oude inhoud is behouden');
  assert.equal(stub.getItem('formatietool-v1'), null, 'de platte kopie is weg');
  assert.ok(stub.getItem('ruimte-v1'));
});

test('bij een mislukte schrijf blijft de platte plaat staan', async () => {
  // Anders is een vol quotum of een privémodus gelijk aan dataverlies.
  const { mod, stub } = await verseModule();
  stub.setItem('formatietool-v1', JSON.stringify(plaatje));
  stub.faalt = true;

  await assert.rejects(() => mod.zetWachtwoord('geheim', plaatje));
  assert.ok(stub.getItem('formatietool-v1'), 'de oude plaat is niet weggegooid');
});

test('snel achter elkaar muteren levert één schrijfbeurt met de laatste stand', async () => {
  const { mod, stub } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);
  const naSetup = stub.schrijfAantal;

  mod.muteer('een', (s) => { s.naam = 'Een'; });
  mod.muteer('twee', (s) => { s.naam = 'Twee'; });
  mod.muteer('drie', (s) => { s.naam = 'Drie'; });
  await new Promise((r) => setTimeout(r, 500));
  await mod.spoel();

  assert.ok(
    stub.schrijfAantal - naSetup <= 2,
    `verwacht hooguit 2 schrijfbeurten, kreeg ${stub.schrijfAantal - naSetup}`
  );
  await mod.vergrendel();
  const terug = await mod.ontgrendel('geheim', plaatje);
  assert.equal(terug.naam, 'Drie', 'de laatste stand staat op schijf');
});

test('vergrendelen wist de plaat en de undo-historie uit het geheugen', async () => {
  const { mod } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);
  mod.muteer('iets', (s) => { s.naam = 'Gewijzigd'; });
  assert.equal(mod.kanUndo(), true);

  await mod.vergrendel();
  assert.equal(mod.huidigeState(), null);
  assert.equal(mod.kanUndo(), false, 'de undo-stapel bevat hele platen met namen');
  assert.equal(mod.isVergrendeld(), true);
});

test('een versleutelde export is niet leesbaar en heeft een eigen wachtwoord', async () => {
  const { mod } = await verseModule();
  await mod.zetWachtwoord('sessie', plaatje);

  const bestand = await mod.exporteerVersleuteld('bestandswachtwoord');
  assert.ok(!bestand.includes('Hopper'));

  const gelezen = await mod.leesImport(bestand, async () => 'bestandswachtwoord');
  assert.equal(gelezen.wasVersleuteld, true);
  assert.equal(gelezen.state.personen[0].naam, 'G. Hopper');

  await assert.rejects(
    () => mod.leesImport(bestand, async () => 'fout'),
    mod.WachtwoordFout
  );
});

test('een oud, plat exportbestand kan nog steeds geïmporteerd worden', async () => {
  const { mod } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);

  const gelezen = await mod.leesImport(JSON.stringify(plaatje), async () => {
    throw new Error('zou niet om een wachtwoord moeten vragen');
  });
  assert.equal(gelezen.wasVersleuteld, false);
  assert.equal(gelezen.state.personen[0].naam, 'G. Hopper');
});

test('een envelop met minder rondes gaat bij het ontgrendelen over op de huidige', async () => {
  const { mod, stub } = await verseModule();
  const krypto = await import('../src/krypto.js');
  const oud = await krypto.maakEnvelop('geheim', JSON.stringify(plaatje));
  oud.envelop.kdf.iteraties = 1000; // alsof de envelop van een oudere versie is
  // Opnieuw versleutelen met die lagere waarde, anders klopt de sleutel niet.
  const zwak = await krypto.leidSleutelAf('geheim', krypto.uitBase64(oud.envelop.kdf.salt), 1000);
  oud.envelop.canary = await krypto.versleutel(zwak, 'ruimte-canary');
  oud.envelop.inhoud = await krypto.versleutel(zwak, JSON.stringify(plaatje));
  stub.setItem('ruimte-v1', JSON.stringify(oud.envelop));

  const terug = await mod.ontgrendel('geheim', plaatje);
  assert.equal(terug.personen[0].naam, 'G. Hopper');
  const na = JSON.parse(stub.getItem('ruimte-v1'));
  assert.equal(na.kdf.iteraties, krypto.KDF_ITERATIES, 'de opslag staat nu op de huidige sterkte');
  assert.notEqual(na.kdf.salt, oud.envelop.kdf.salt, 'met vers salt');
});

test('een __proto__-sleutel in een bestand haalt het prototype van de state niet om', async () => {
  const { mod } = await verseModule();
  await mod.zetWachtwoord('geheim', plaatje);
  const bestand = JSON.parse(
    '{"personen":[],"scenarios":[{"id":"s"}],"__proto__":{"vervuild":true}}'
  );
  mod.vervangState(bestand);
  const state = mod.huidigeState();
  assert.equal(state.vervuild, undefined);
  assert.equal(Object.getPrototypeOf(state), Object.prototype);
});
