/**
 * Functiegebouw Rijk: functiefamilies, functiegroepen en hun schaalbereik.
 *
 * Het FGR verving ruim 30.000 losse functiebeschrijvingen door een kleine
 * set functieprofielen. Eén profiel geldt voor meerdere schalen; de
 * functietypering bepaalt welk schaalniveau van toepassing is, gewaardeerd
 * met Fuwasys.
 *
 * Deze lijst is een werkbare selectie voor een digitale dienst, niet het
 * volledige gebouw. Vul aan waar een traject dat vraagt.
 */

export const FUNCTIEFAMILIES = {
  lijnmanagement: 'Lijnmanagement',
  advisering: 'Advisering',
  uitvoering: 'Uitvoering',
  projectmanagement: 'Project- en programmamanagement',
  kennis: 'Kennis en onderzoek',
  bedrijfsvoering: 'Bedrijfsvoering',
  beleid: 'Beleid',
  toezicht: 'Toezicht',
};

/**
 * min en max zijn het schaalbereik waarbinnen de functiegroep gewaardeerd
 * kan worden. Een plek buiten dat bereik is niet per se fout, maar vraagt
 * onderbouwing in het formatierapport, dus de tool waarschuwt erop.
 */
export const FUNCTIEGROEPEN = [
  { id: 'operationeel-manager', naam: 'Operationeel Manager', familie: 'lijnmanagement', min: 7, max: 11 },
  { id: 'manager', naam: 'Manager', familie: 'lijnmanagement', min: 12, max: 15 },
  { id: 'topmanager', naam: 'Topmanager', familie: 'lijnmanagement', min: 16, max: 18 },

  { id: 'adviseur-ict', naam: 'Adviseur ICT', familie: 'advisering', min: 10, max: 14 },
  { id: 'adviseur-bedrijfsvoering', naam: 'Adviseur Bedrijfsvoering', familie: 'advisering', min: 9, max: 14 },
  { id: 'adviseur-communicatie', naam: 'Adviseur Communicatie', familie: 'advisering', min: 9, max: 14 },

  { id: 'medewerker-ict', naam: 'Medewerker ICT', familie: 'uitvoering', min: 6, max: 11 },
  { id: 'medewerker-verwerken', naam: 'Medewerker Verwerken en Behandelen', familie: 'uitvoering', min: 3, max: 8 },
  { id: 'medewerker-bedrijfsvoering', naam: 'Medewerker Bedrijfsvoering', familie: 'bedrijfsvoering', min: 4, max: 11 },

  { id: 'projectleider', naam: 'Projectleider', familie: 'projectmanagement', min: 10, max: 14 },
  { id: 'programmamanager', naam: 'Programmamanager', familie: 'projectmanagement', min: 13, max: 16 },

  { id: 'onderzoeker', naam: 'Onderzoeker', familie: 'kennis', min: 10, max: 15 },

  { id: 'beleidsmedewerker', naam: '(Senior) Beleidsmedewerker', familie: 'beleid', min: 11, max: 13 },
  { id: 'cooerdinerend-beleidsmedewerker', naam: 'Coördinerend Beleidsmedewerker', familie: 'beleid', min: 13, max: 15 },
  { id: 'strategisch-beleidsmedewerker', naam: 'Strategisch Beleidsmedewerker', familie: 'beleid', min: 15, max: 16 },
];

/**
 * Rollen zijn iets anders dan functiegroepen. De functiegroep bepaalt waarop
 * iemand gewaardeerd en betaald wordt en komt uit het Functiegebouw Rijk; de
 * rol is wat iemand feitelijk doet in het team. Een programmamanager kan de
 * rol product owner vervullen zonder dat er rechtspositioneel iets verandert.
 *
 * Daarom is dit een startlijst en geen gesloten set: je vult hem aan met wat
 * in jouw organisatie gangbaar is.
 */
export const STANDAARD_ROLLEN = [
  'Product owner',
  'Productmanager',
  'Teamlead',
  'Tech lead',
  'Engineer',
  'Senior engineer',
  'Data engineer',
  'Data scientist',
  'Security engineer',
  'Ontwerper',
  'Onderzoeker',
  'Scrum master',
  'Architect',
  'Beleidsadviseur',
  'Controller',
  'Officemanager',
];

/** De rollen die in gebruik zijn, plus de standaardlijst, zonder dubbelingen. */
export function bekendeRollen(plekken = []) {
  const inGebruik = plekken.map((p) => p.rol).filter(Boolean);
  return [...new Set([...STANDAARD_ROLLEN, ...inGebruik])].sort((a, b) =>
    a.localeCompare(b, 'nl')
  );
}

const perId = new Map(FUNCTIEGROEPEN.map((f) => [f.id, f]));

export function functiegroep(id) {
  return perId.get(id) ?? null;
}

export function schaalPastBijFunctiegroep(functiegroepId, schaal) {
  const groep = perId.get(functiegroepId);
  if (!groep || schaal == null) return true;
  return schaal >= groep.min && schaal <= groep.max;
}

export function functiegroepenPerFamilie() {
  const gegroepeerd = new Map();
  for (const groep of FUNCTIEGROEPEN) {
    if (!gegroepeerd.has(groep.familie)) gegroepeerd.set(groep.familie, []);
    gegroepeerd.get(groep.familie).push(groep);
  }
  return gegroepeerd;
}
