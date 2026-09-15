/**
 * Functiegebouw Rijk: functiefamilies, functiegroepen en hun schaalbereik.
 *
 * Alle namen en schaalbereiken zijn overgenomen van de familiepagina's op
 * functiegebouwrijksoverheid.nl. Verzin hier niets bij: een functiegroep die
 * niet bestaat maakt het formatierapport onbruikbaar.
 *
 * Het belangrijkste om te weten: het FGR kent GEEN functiegroep voor
 * software-ontwikkelaar, designer, architect of user researcher. Het is
 * bewust generiek. ICT is een *aandachtsgebied* binnen de generieke groepen,
 * geen eigen groep. Daarom heeft een plek in deze tool een vrije rol (wat
 * iemand doet) naast een functiegroep (waarop iemand gewaardeerd wordt).
 *
 * Het KWIV (Kwaliteitsraamwerk Informatievoorziening) beschrijft wél de
 * IV-rollen, maar bepaalt uitdrukkelijk niet de schaal: "een KWIV-profiel
 * heeft geen gevolgen voor de rechtspositie, schaalindeling of het salaris."
 * KWIV beschrijft de rol, FGR bepaalt de schaal.
 *
 * Laatst geverifieerd: september 2026. Let op: O&P Rijk past de functiegroepen
 * aan op FUWA-Rijk, dus schaalbereiken kunnen wijzigen.
 */

export const FUNCTIEFAMILIES = {
  advisering: 'Advisering',
  uitvoering: 'Uitvoering',
  projectmanagement: 'Project- en programmamanagement',
  lijnmanagement: 'Lijnmanagement',
  kennis: 'Kennis en onderzoek',
  bedrijfsvoering: 'Bedrijfsvoering',
  beleid: 'Beleid',
};

/**
 * min en max zijn het schaalbereik waarbinnen de functiegroep gewaardeerd kan
 * worden. Een plek daarbuiten is niet verboden, maar vraagt onderbouwing in
 * het formatierapport, dus de toets geeft een signaal.
 */
export const FUNCTIEGROEPEN = [
  // Advisering: waar de meeste inhoudelijke digitale rollen landen.
  { id: 'medewerker-advisering', naam: 'Medewerker Advisering', familie: 'advisering', min: 8, max: 11 },
  { id: 'senior-adviseur', naam: '(Senior) Adviseur', familie: 'advisering', min: 11, max: 13 },
  { id: 'cooerdinerend-adviseur', naam: 'Coördinerend / Specialistisch Adviseur', familie: 'advisering', min: 13, max: 15 },
  { id: 'strategisch-adviseur', naam: 'Strategisch Adviseur', familie: 'advisering', min: 15, max: 16 },

  // Uitvoering: de twee IV-groepen zijn de ICT-specifieke ingangen.
  { id: 'senior-medewerker-iv', naam: 'Senior Medewerker IV', familie: 'uitvoering', min: 8, max: 11 },
  { id: 'expert-iv', naam: 'Expert IV', familie: 'uitvoering', min: 11, max: 13 },
  { id: 'medewerker-verwerken', naam: 'Medewerker Verwerken en Behandelen', familie: 'uitvoering', min: 3, max: 8 },

  // Project- en programmamanagement.
  { id: 'projectleider', naam: 'Projectleider', familie: 'projectmanagement', min: 9, max: 11 },
  { id: 'programmamanager', naam: 'Project-/Programmamanager', familie: 'projectmanagement', min: 12, max: 15 },
  { id: 'programmadirecteur', naam: 'Project-/Programmadirecteur', familie: 'projectmanagement', min: 16, max: 17 },

  // Lijnmanagement.
  { id: 'operationeel-manager', naam: 'Operationeel Manager', familie: 'lijnmanagement', min: 7, max: 11 },
  { id: 'manager', naam: 'Manager', familie: 'lijnmanagement', min: 12, max: 15 },
  { id: 'topmanager', naam: 'Topmanager', familie: 'lijnmanagement', min: 16, max: 18 },
  { id: 'topmanager-generaal', naam: 'Topmanager-generaal', familie: 'lijnmanagement', min: 19, max: 19 },

  // Kennis en onderzoek: waar zwaar user research kan landen.
  { id: 'onderzoeksmedewerker', naam: 'Onderzoeksmedewerker', familie: 'kennis', min: 8, max: 11 },
  { id: 'wetenschappelijk-medewerker', naam: 'Wetenschappelijk Medewerker', familie: 'kennis', min: 10, max: 13 },
  { id: 'senior-wetenschappelijk-medewerker', naam: 'Senior Wetenschappelijk Medewerker', familie: 'kennis', min: 13, max: 15 },

  // Bedrijfsvoering: ondersteunend, niet engineering.
  { id: 'adviseur-bedrijfsvoering', naam: 'Adviseur Bedrijfsvoering', familie: 'bedrijfsvoering', min: 8, max: 11 },
  { id: 'medewerker-ict-div', naam: 'Medewerker ICT/Techniek/Informatiebeheer/DIV', familie: 'bedrijfsvoering', min: 5, max: 8 },

  // Beleid.
  { id: 'beleidsmedewerker', naam: '(Senior) Beleidsmedewerker', familie: 'beleid', min: 11, max: 13 },
  { id: 'cooerdinerend-beleidsmedewerker', naam: 'Coördinerend Beleidsmedewerker', familie: 'beleid', min: 13, max: 15 },
  { id: 'strategisch-beleidsmedewerker', naam: 'Strategisch Beleidsmedewerker', familie: 'beleid', min: 15, max: 16 },
];

/**
 * Rollen zijn iets anders dan functiegroepen. De functiegroep bepaalt waarop
 * iemand gewaardeerd en betaald wordt; de rol is wat iemand feitelijk doet.
 * Een project-/programmamanager kan de rol product manager vervullen zonder
 * dat er rechtspositioneel iets verandert.
 *
 * Deze lijst volgt het Government Digital and Data Profession Capability
 * Framework (voorheen DDaT), het raamwerk waarmee GDS werkt: 45 rollen in
 * acht families. Hieronder staan de rollen die een digitale dienst in de
 * praktijk nodig heeft, in Nederlandse termen.
 *
 * `groep` is een beredeneerd voorstel voor de FGR-functiegroep. Het FGR
 * publiceert geen mapping voor moderne digitale rollen, dus dit is geen
 * officiële indeling: de onderbouwing blijft werk voor het formatierapport.
 *
 * `spoor` legt het dubbele carrièrepad vast dat GDS hanteert voor software
 * developer en DevOps engineer: vanaf senior splitst elke trede in een
 * technische en een leidinggevende variant, op dezelfde schaal. Het
 * coalitieakkoord vraagt hetzelfde met "gelijke waardering voor specialisten
 * als voor managers", dus de tool maakt dat zichtbaar.
 */
export const ROLLEN = [
  // Product en delivery
  { naam: 'Product manager', groep: 'programmamanager', familie: 'Product en delivery' },
  { naam: 'Delivery manager', groep: 'projectleider', familie: 'Product en delivery' },
  { naam: 'Service owner', groep: 'cooerdinerend-adviseur', familie: 'Product en delivery' },
  { naam: 'Business analist', groep: 'senior-adviseur', familie: 'Product en delivery' },

  // Software: het dubbele spoor. Senior, lead en principal bestaan twee keer,
  // technisch en leidinggevend, op hetzelfde niveau.
  { naam: 'Engineer', groep: 'senior-medewerker-iv', familie: 'Software' },
  { naam: 'Senior engineer', groep: 'expert-iv', familie: 'Software', spoor: 'technisch' },
  { naam: 'Engineering manager', groep: 'operationeel-manager', familie: 'Software', spoor: 'leidinggevend' },
  { naam: 'Lead engineer', groep: 'cooerdinerend-adviseur', familie: 'Software', spoor: 'technisch' },
  { naam: 'Principal engineer', groep: 'strategisch-adviseur', familie: 'Software', spoor: 'technisch' },
  { naam: 'Frontend engineer', groep: 'expert-iv', familie: 'Software' },
  { naam: 'DevOps engineer', groep: 'expert-iv', familie: 'Software' },

  // Gebruikersgericht ontwerp: de rollen die een maakorganisatie onderscheiden
  // van een klassieke ICT-afdeling.
  { naam: 'User researcher', groep: 'wetenschappelijk-medewerker', familie: 'Gebruikersgericht ontwerp' },
  { naam: 'Interactieontwerper', groep: 'senior-adviseur', familie: 'Gebruikersgericht ontwerp' },
  { naam: 'Serviceontwerper', groep: 'senior-adviseur', familie: 'Gebruikersgericht ontwerp' },
  { naam: 'Contentontwerper', groep: 'senior-adviseur', familie: 'Gebruikersgericht ontwerp' },
  { naam: 'Toegankelijkheidsspecialist', groep: 'senior-adviseur', familie: 'Gebruikersgericht ontwerp' },

  // Data
  { naam: 'Data engineer', groep: 'expert-iv', familie: 'Data' },
  { naam: 'Data scientist', groep: 'senior-adviseur', familie: 'Data' },
  { naam: 'Performance analist', groep: 'senior-adviseur', familie: 'Data' },

  // Architectuur en techniek
  { naam: 'Technisch architect', groep: 'cooerdinerend-adviseur', familie: 'Architectuur' },
  { naam: 'Security architect', groep: 'cooerdinerend-adviseur', familie: 'Architectuur' },
  { naam: 'Security engineer', groep: 'expert-iv', familie: 'Architectuur' },

  // Beheer en operatie
  { naam: 'Infrastructure engineer', groep: 'expert-iv', familie: 'Beheer en operatie' },
  { naam: 'Servicemanager', groep: 'senior-adviseur', familie: 'Beheer en operatie' },

  // Leiding en ondersteuning
  { naam: 'Directeur', groep: 'topmanager', familie: 'Leiding' },
  { naam: 'Teamlead', groep: 'operationeel-manager', familie: 'Leiding' },
  { naam: 'Beleidsadviseur', groep: 'beleidsmedewerker', familie: 'Leiding' },
  { naam: 'Controller', groep: 'adviseur-bedrijfsvoering', familie: 'Leiding' },
  { naam: 'Officemanager', groep: 'medewerker-ict-div', familie: 'Leiding' },
];

export const ROL_SUGGESTIES = Object.fromEntries(ROLLEN.map((r) => [r.naam, r.groep]));

export const STANDAARD_ROLLEN = ROLLEN.map((r) => r.naam);

/** De rol met zijn familie en spoor, als die bekend is. */
export function rolInfo(naam) {
  return ROLLEN.find((r) => r.naam === naam) ?? null;
}

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

/** De functiegroep die bij een rol past, als die er is. */
export function suggestieVoorRol(rol) {
  return ROL_SUGGESTIES[rol] ?? null;
}
