/**
 * Tests op de versleuteling.
 *
 * Node heeft dezelfde Web Crypto als de browser, dus dit draait zonder DOM.
 * Let op: de iteratiecount staat hier laag waar dat mag, anders kosten de
 * tests seconden aan sleutelafleiding zonder dat ze er iets mee toetsen.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  maakEnvelop,
  openEnvelop,
  hermaakEnvelop,
  leidSleutelAf,
  versleutel,
  ontsleutel,
  nieuwSalt,
  naarBase64,
  uitBase64,
  WachtwoordFout,
  KDF_ITERATIES,
  FORMAAT,
} from '../src/krypto.js';

/** Snelle sleutel voor tests die niets over de KDF toetsen. */
const snelleSleutel = () => leidSleutelAf('geheim', nieuwSalt(), 1000);

test('versleutelen en ontsleutelen levert dezelfde tekst', async () => {
  const sleutel = await snelleSleutel();
  const tekst = 'Q. Quebec werkt aan toegankelijkheid';
  assert.equal(await ontsleutel(sleutel, await versleutel(sleutel, tekst)), tekst);
});

test('tekens buiten ASCII overleven de rondgang', async () => {
  const sleutel = await snelleSleutel();
  const tekst = 'Coördinerend Adviseur, 0,8 fte — señor André 日本 🎯';
  assert.equal(await ontsleutel(sleutel, await versleutel(sleutel, tekst)), tekst);
});

test('elke versleuteling krijgt een eigen iv', async () => {
  const sleutel = await snelleSleutel();
  const a = await versleutel(sleutel, 'zelfde tekst');
  const b = await versleutel(sleutel, 'zelfde tekst');
  assert.notEqual(a.iv, b.iv, 'iv mag nooit hergebruikt worden bij AES-GCM');
  assert.notEqual(a.data, b.data, 'dus is ook de ciphertext anders');
});

test('een fout wachtwoord wordt herkend', async () => {
  const { envelop } = await maakEnvelop('goed wachtwoord', '{"personen":[]}');
  await assert.rejects(() => openEnvelop(envelop, 'fout wachtwoord'), WachtwoordFout);
});

test('een fout wachtwoord wordt ook herkend bij een lege plaat', async () => {
  // De bug uit nodemapper: daar is bij een lege opslag elk wachtwoord geldig,
  // waardoor een typefout bij het instellen pas de volgende sessie opvalt en
  // de data dan onbereikbaar is. De canary sluit dat gat.
  const leeg = JSON.stringify({ personen: [], plekken: [], scenarios: [] });
  const { envelop } = await maakEnvelop('bedoeld wachtwoord', leeg);
  await assert.rejects(() => openEnvelop(envelop, 'typfout'), WachtwoordFout);

  const { tekst } = await openEnvelop(envelop, 'bedoeld wachtwoord');
  assert.equal(tekst, leeg);
});

test('gemanipuleerde data wordt afgewezen', async () => {
  const { envelop } = await maakEnvelop('geheim', 'de plaat');
  const bytes = uitBase64(envelop.inhoud.data);
  bytes[0] ^= 0xff;
  const gesaboteerd = {
    ...envelop,
    inhoud: { ...envelop.inhoud, data: naarBase64(bytes) },
  };
  await assert.rejects(() => openEnvelop(gesaboteerd, 'geheim'), WachtwoordFout);
});

test('de iteratiecount komt uit de envelop, niet uit de code', async () => {
  // Zo kan het getal later omhoog zonder bestaande platen onleesbaar te maken.
  const salt = nieuwSalt();
  const sleutel = await leidSleutelAf('geheim', salt, 1000);
  const envelop = {
    formaat: FORMAAT,
    versie: 1,
    kdf: { naam: 'PBKDF2', hash: 'SHA-256', iteraties: 1000, salt: naarBase64(salt) },
    canary: await versleutel(sleutel, 'ruimte-canary'),
    inhoud: await versleutel(sleutel, 'oude plaat'),
  };
  const { tekst } = await openEnvelop(envelop, 'geheim');
  assert.equal(tekst, 'oude plaat');
});

test('een nieuwe envelop gebruikt de huidige iteratiecount', async () => {
  const { envelop } = await maakEnvelop('geheim', 'x');
  assert.equal(envelop.kdf.iteraties, KDF_ITERATIES);
  assert.ok(KDF_ITERATIES >= 600_000, 'OWASP-norm voor PBKDF2-SHA256');
  assert.equal(uitBase64(envelop.kdf.salt).length, 16);
  assert.equal(uitBase64(envelop.inhoud.iv).length, 12);
});

test('hermaken houdt de sleutel maar vernieuwt de iv', async () => {
  const { envelop, sleutel } = await maakEnvelop('geheim', 'eerste');
  const tweede = await hermaakEnvelop(sleutel, envelop, 'tweede');

  assert.equal(tweede.kdf.salt, envelop.kdf.salt, 'zelfde salt, geen nieuwe KDF nodig');
  assert.notEqual(tweede.inhoud.iv, envelop.inhoud.iv, 'wel een nieuwe iv');

  const { tekst } = await openEnvelop(tweede, 'geheim');
  assert.equal(tekst, 'tweede');
});

test('iets dat geen plaat is wordt geweigerd', async () => {
  await assert.rejects(() => openEnvelop({ zomaar: 'json' }, 'geheim'));
  await assert.rejects(() => openEnvelop(null, 'geheim'));
});

test('er staat niets leesbaars in de envelop', async () => {
  const plaat = JSON.stringify({
    personen: [{ naam: 'G. Hopper', schaal: 13 }],
    scenarios: [{ naam: 'Startopstelling' }],
  });
  const { envelop } = await maakEnvelop('geheim', plaat);
  const ruw = JSON.stringify(envelop);
  for (const woord of ['Hopper', 'Startopstelling', 'personen', 'schaal']) {
    assert.ok(!ruw.includes(woord), `"${woord}" mag niet leesbaar in de opslag staan`);
  }
});
