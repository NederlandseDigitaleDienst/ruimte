/**
 * Voorbeelddata: een digitale dienst binnen EZK, met een kernteam en twee
 * doorbraakprojecten. Bedoeld om de tool meteen gevuld te openen, zodat je
 * in een gesprek niet met een leeg scherm begint.
 *
 * De namen zijn fictief. Vervang ze via import of door ze weg te gooien.
 */

export const voorbeeldState = {
  naam: 'Digitale dienst EZK',
  normen: {
    minEngineerRatio: 0.5,
    minDoorbraakRatio: 0.3,
    maxSpanOfControl: 12,
    // Integrale kosten (loonkosten + overhead), HOT 2026.
    budgetPlafond: 2_900_000,
  },

  eenheden: [
    { id: 'e-mt', naam: 'Directie', soort: 'staf', parentId: null },
    { id: 'e-platform', naam: 'Platform', soort: 'core', parentId: 'e-mt' },
    { id: 'e-data', naam: 'Data en modellen', soort: 'core', parentId: 'e-mt' },
    { id: 'e-vergunning', naam: 'Doorbraak: vergunningen', soort: 'doorbraak', parentId: 'e-mt' },
    { id: 'e-subsidie', naam: 'Doorbraak: subsidies', soort: 'doorbraak', parentId: 'e-mt' },
    { id: 'e-bedrijfsvoering', naam: 'Bedrijfsvoering', soort: 'staf', parentId: 'e-mt' },
  ],

  plekken: [
    // Directie
    { id: 'p-01', rol: 'Directeur', functiegroep: 'topmanager', schaal: 16, fte: 1, eenheidId: 'e-mt', expertise: ['leidinggeven'] },
    { id: 'p-02', rol: 'Strategisch adviseur', functiegroep: 'adviseur-bedrijfsvoering', schaal: 14, fte: 1, eenheidId: 'e-mt', expertise: ['beleid'] },

    // Platform
    { id: 'p-10', rol: 'Teamlead platform', functiegroep: 'manager', schaal: 14, fte: 1, eenheidId: 'e-platform', expertise: ['engineering', 'leidinggeven'] },
    { id: 'p-11', rol: 'Senior engineer', functiegroep: 'adviseur-ict', schaal: 13, fte: 1, eenheidId: 'e-platform', expertise: ['engineering'] },
    { id: 'p-12', rol: 'Senior engineer', functiegroep: 'adviseur-ict', schaal: 13, fte: 1, eenheidId: 'e-platform', expertise: ['engineering'] },
    { id: 'p-13', rol: 'Engineer', functiegroep: 'medewerker-ict', schaal: 11, fte: 1, eenheidId: 'e-platform', expertise: ['engineering'] },
    { id: 'p-14', rol: 'Security engineer', functiegroep: 'adviseur-ict', schaal: 13, fte: 1, eenheidId: 'e-platform', expertise: ['engineering', 'security'] },

    // Data
    { id: 'p-20', rol: 'Teamlead data', functiegroep: 'manager', schaal: 14, fte: 1, eenheidId: 'e-data', expertise: ['data', 'leidinggeven'] },
    { id: 'p-21', rol: 'Data engineer', functiegroep: 'adviseur-ict', schaal: 12, fte: 1, eenheidId: 'e-data', expertise: ['engineering', 'data'] },
    { id: 'p-22', rol: 'Data scientist', functiegroep: 'onderzoeker', schaal: 13, fte: 0.8, eenheidId: 'e-data', expertise: ['data'] },

    // Doorbraak vergunningen
    { id: 'p-30', rol: 'Productmanager', functiegroep: 'projectleider', schaal: 13, fte: 1, eenheidId: 'e-vergunning', expertise: ['product'] },
    { id: 'p-31', rol: 'Senior engineer', functiegroep: 'adviseur-ict', schaal: 13, fte: 1, eenheidId: 'e-vergunning', expertise: ['engineering'] },
    { id: 'p-32', rol: 'Engineer', functiegroep: 'medewerker-ict', schaal: 11, fte: 1, eenheidId: 'e-vergunning', expertise: ['engineering'] },
    { id: 'p-33', rol: 'Ontwerper', functiegroep: 'adviseur-communicatie', schaal: 12, fte: 0.8, eenheidId: 'e-vergunning', expertise: ['design'] },

    // Doorbraak subsidies
    { id: 'p-40', rol: 'Productmanager', functiegroep: 'projectleider', schaal: 13, fte: 1, eenheidId: 'e-subsidie', expertise: ['product'] },
    { id: 'p-41', rol: 'Senior engineer', functiegroep: 'adviseur-ict', schaal: 13, fte: 1, eenheidId: 'e-subsidie', expertise: ['engineering'] },
    { id: 'p-42', rol: 'Ontwerper', functiegroep: 'adviseur-communicatie', schaal: 12, fte: 1, eenheidId: 'e-subsidie', expertise: ['design'] },

    // Bedrijfsvoering
    { id: 'p-50', rol: 'Officemanager', functiegroep: 'medewerker-bedrijfsvoering', schaal: 9, fte: 0.8, eenheidId: 'e-bedrijfsvoering', expertise: [] },
    { id: 'p-51', rol: 'Controller', functiegroep: 'adviseur-bedrijfsvoering', schaal: 12, fte: 0.6, eenheidId: 'e-bedrijfsvoering', expertise: ['financien'] },
  ],

  personen: [
    { id: 'm-01', naam: 'A. Alfa', schaal: 15, fte: 1, expertise: ['leidinggeven', 'beleid'], herkomst: 'bestaand' },
    { id: 'm-02', naam: 'B. Bravo', schaal: 14, fte: 1, expertise: ['beleid'], herkomst: 'bestaand' },
    { id: 'm-03', naam: 'C. Charlie', schaal: 14, fte: 1, expertise: ['engineering', 'leidinggeven'], herkomst: 'bestaand' },
    { id: 'm-04', naam: 'D. Delta', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-05', naam: 'E. Echo', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-06', naam: 'F. Foxtrot', schaal: 11, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-07', naam: 'G. Golf', schaal: 13, fte: 1, expertise: ['engineering', 'security'], herkomst: 'werving' },
    { id: 'm-08', naam: 'H. Hotel', schaal: 14, fte: 1, expertise: ['data', 'leidinggeven'], herkomst: 'bestaand' },
    { id: 'm-09', naam: 'I. India', schaal: 12, fte: 1, expertise: ['engineering', 'data'], herkomst: 'bestaand' },
    { id: 'm-10', naam: 'J. Juliet', schaal: 13, fte: 0.8, expertise: ['data'], herkomst: 'bestaand' },
    { id: 'm-11', naam: 'K. Kilo', schaal: 13, fte: 1, expertise: ['product'], herkomst: 'bestaand' },
    { id: 'm-12', naam: 'L. Lima', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-13', naam: 'M. Mike', schaal: 11, fte: 1, expertise: ['engineering'], herkomst: 'werving' },
    { id: 'm-14', naam: 'N. November', schaal: 12, fte: 0.8, expertise: ['design'], herkomst: 'bestaand' },
    { id: 'm-15', naam: 'O. Oscar', schaal: 13, fte: 1, expertise: ['product'], herkomst: 'bestaand' },
    { id: 'm-16', naam: 'P. Papa', schaal: 12, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-17', naam: 'Q. Quebec', schaal: 12, fte: 1, expertise: ['design'], herkomst: 'bestaand' },
    { id: 'm-18', naam: 'R. Romeo', schaal: 9, fte: 0.8, expertise: [], herkomst: 'bestaand' },
    { id: 'm-19', naam: 'S. Sierra', schaal: 12, fte: 0.6, expertise: ['financien'], herkomst: 'bestaand' },
    { id: 'm-20', naam: 'T. Tango', schaal: 12, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
  ],

  scenarios: [
    {
      id: 's-1',
      naam: 'Basis',
      beschrijving: 'Iedereen zoveel mogelijk op zijn huidige werk',
      toewijzingen: {
        'p-01': 'm-01',
        'p-02': 'm-02',
        'p-10': 'm-03',
        'p-11': 'm-04',
        'p-12': 'm-05',
        'p-13': 'm-06',
        'p-14': 'm-07',
        'p-20': 'm-08',
        'p-21': 'm-09',
        'p-22': 'm-10',
        'p-30': 'm-11',
        'p-31': 'm-12',
        'p-32': 'm-13',
        'p-33': 'm-14',
        'p-40': 'm-15',
        'p-41': 'm-16',
        'p-42': 'm-17',
        'p-50': 'm-18',
        'p-51': 'm-19',
      },
      extraPlekken: [],
      verwijderdePlekken: [],
    },
    {
      id: 's-2',
      naam: 'Zwaarder op doorbraak',
      beschrijving: 'Meer engineering naar de doorbraakprojecten',
      toewijzingen: {
        'p-01': 'm-01',
        'p-02': 'm-02',
        'p-10': 'm-03',
        'p-11': 'm-04',
        'p-13': 'm-06',
        'p-14': 'm-07',
        'p-20': 'm-08',
        'p-21': 'm-09',
        'p-22': 'm-10',
        'p-30': 'm-11',
        'p-31': 'm-05',
        'p-32': 'm-13',
        'p-33': 'm-14',
        'p-40': 'm-15',
        'p-41': 'm-12',
        'p-42': 'm-17',
        'p-50': 'm-18',
        'p-51': 'm-19',
      },
      extraPlekken: [
        {
          id: 'p-43',
          rol: 'Engineer',
          functiegroep: 'medewerker-ict',
          schaal: 11,
          fte: 1,
          eenheidId: 'e-subsidie',
          expertise: ['engineering'],
        },
      ],
      verwijderdePlekken: ['p-12'],
    },
  ],

  actiefScenario: 's-1',
};
