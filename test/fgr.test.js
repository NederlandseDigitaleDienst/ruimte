/**
 * Tests op het Functiegebouw Rijk.
 *
 * Deze leggen vast wat op functiegebouwrijksoverheid.nl staat. Wijk hier
 * alleen van af als de bron zelf verandert, niet omdat een naam onhandig is:
 * een verzonnen functiegroep maakt het formatierapport onbruikbaar.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FUNCTIEGROEPEN,
  functiegroep,
  schaalPastBijFunctiegroep,
  suggestieVoorRol,
  STANDAARD_ROLLEN,
} from '../src/fgr.js';
import { voorbeeldState } from '../src/voorbeelddata.js';
import { plekkenVan } from '../src/model.js';

test('de familie Advisering heeft de vier officiele groepen', () => {
  const advies = FUNCTIEGROEPEN.filter((f) => f.familie === 'advisering');
  assert.deepEqual(
    advies.map((f) => [f.naam, f.min, f.max]),
    [
      ['Medewerker Advisering', 8, 11],
      ['(Senior) Adviseur', 11, 13],
      ['Coördinerend / Specialistisch Adviseur', 13, 15],
      ['Strategisch Adviseur', 15, 16],
    ]
  );
});

test('de IV-groepen uit Uitvoering bestaan met hun bereik', () => {
  assert.deepEqual(
    [functiegroep('senior-medewerker-iv').min, functiegroep('senior-medewerker-iv').max],
    [8, 11]
  );
  assert.deepEqual([functiegroep('expert-iv').min, functiegroep('expert-iv').max], [11, 13]);
});

test('project- en programmamanagement klopt met de bron', () => {
  assert.deepEqual(
    [functiegroep('projectleider').min, functiegroep('projectleider').max],
    [9, 11],
    'Projectleider is 9-11, niet 10-14'
  );
  assert.deepEqual(
    [functiegroep('programmamanager').min, functiegroep('programmamanager').max],
    [12, 15],
    'Project-/Programmamanager is 12-15, niet 13-16'
  );
});

test('functiegroepen die het FGR niet kent, bestaan hier ook niet', () => {
  // Deze namen klinken plausibel maar komen niet voor in het FGR. ICT is een
  // aandachtsgebied binnen de generieke groepen, geen eigen functiegroep.
  for (const verzonnen of [
    'adviseur-ict',
    'medewerker-ict',
    'adviseur-communicatie',
    'medewerker-bedrijfsvoering',
    'onderzoeker',
  ]) {
    assert.equal(functiegroep(verzonnen), null, `${verzonnen} hoort niet te bestaan`);
  }
});

test('elke functiegroep heeft een oplopend, geldig schaalbereik', () => {
  for (const groep of FUNCTIEGROEPEN) {
    assert.ok(groep.min >= 1 && groep.max <= 19, `${groep.naam} valt buiten schaal 1-19`);
    assert.ok(groep.min <= groep.max, `${groep.naam} heeft min boven max`);
    assert.ok(groep.naam && groep.familie, `${groep.naam} mist naam of familie`);
  }
});

test('schaal binnen en buiten het bereik wordt herkend', () => {
  assert.ok(schaalPastBijFunctiegroep('programmamanager', 14));
  assert.ok(!schaalPastBijFunctiegroep('programmamanager', 11), '11 valt onder het bereik');
  assert.ok(!schaalPastBijFunctiegroep('programmamanager', 16), '16 valt erboven');
  // Zonder functiegroep valt er niets te toetsen.
  assert.ok(schaalPastBijFunctiegroep(null, 12));
});

test('elke standaardrol verwijst naar een bestaande functiegroep', () => {
  for (const rol of STANDAARD_ROLLEN) {
    const id = suggestieVoorRol(rol);
    assert.ok(id, `${rol} heeft geen suggestie`);
    assert.ok(functiegroep(id), `${rol} verwijst naar onbekende functiegroep ${id}`);
  }
});

test('de voorbeelddata gebruikt alleen bestaande functiegroepen', () => {
  const alle = [
    ...voorbeeldState.plekken,
    ...voorbeeldState.scenarios.flatMap((s) => s.extraPlekken ?? []),
  ];
  for (const plek of alle) {
    if (!plek.functiegroep) continue;
    assert.ok(
      functiegroep(plek.functiegroep),
      `${plek.rol} verwijst naar onbekende functiegroep ${plek.functiegroep}`
    );
  }
});

test('de voorbeelddata houdt zich aan de schaalbereiken', () => {
  for (const sc of voorbeeldState.scenarios) {
    for (const plek of plekkenVan(voorbeeldState, sc.id)) {
      if (!plek.functiegroep) continue;
      const groep = functiegroep(plek.functiegroep);
      assert.ok(
        schaalPastBijFunctiegroep(plek.functiegroep, plek.schaal),
        `${plek.rol} op schaal ${plek.schaal} valt buiten ${groep.naam} (${groep.min}-${groep.max})`
      );
    }
  }
});
