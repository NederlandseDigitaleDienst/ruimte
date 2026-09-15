/**
 * Voorbeelddata: een Nederlandse Digitale Dienst zoals die eruit zou kunnen
 * zien. Bedoeld om de tool gevuld te openen, zodat je in een gesprek niet met
 * een leeg scherm begint.
 *
 * De opzet volgt drie dingen uit het beleid en uit hoe GDS werkt:
 *
 * 1. De NDD start langs drie lijnen: een doorbraakfunctie voor vastgelopen
 *    IT-projecten, standaarden vaststellen en afdwingen, en moderne
 *    ontwikkelrichtlijnen. Die drie zie je terug in de teams.
 * 2. Multidisciplinaire teams met een eigen user researcher, conform de
 *    GDS Service Manual: elk team dat aan een dienst werkt heeft product,
 *    delivery, onderzoek, ontwerp en engineering bij elkaar.
 * 3. Klein en plat. GDS is met circa 1.000 mensen 3% van het Britse digitale
 *    personeel; de hefboom zit in standaarden en vakmanschap, niet in omvang.
 *    Twee lagen: directie en teams, geen tussenlaag.
 *
 * De personen heten naar het NAVO-spelalfabet: onmiskenbaar verzonnen, zodat
 * niemand ze voor een echte collega aanziet. De rollen, functiegroepen en
 * schalen zijn wel realistisch, want daar gaat het gesprek over.
 */

export const voorbeeldState = {
  naam: 'Nederlandse Digitale Dienst (voorbeeld)',
  normen: {
    minEngineerRatio: 0.4,
    minDoorbraakRatio: 0.35,
    // GDS publiceert bewust geen teamgroottes. Wat wél gepubliceerd is:
    // GOV.UK had 168 mensen in 24 teams, dus ongeveer 7 per team, later
    // 8 tot 11. Tien is een werkbare bovengrens om op te sturen.
    maxSpanOfControl: 10,
    // Integrale kosten (loonkosten + overhead), HOT 2026.
    budgetPlafond: 4_500_000,
  },

  eenheden: [
    { id: 'e-directie', naam: 'Directie', soort: 'staf', parentId: null },
    { id: 'e-doorbraak-1', naam: 'Doorbraak: uitkeringen', soort: 'doorbraak', parentId: 'e-directie' },
    { id: 'e-doorbraak-2', naam: 'Doorbraak: vergunningen', soort: 'doorbraak', parentId: 'e-directie' },
    { id: 'e-standaarden', naam: 'Standaarden en richtlijnen', soort: 'core', parentId: 'e-directie' },
    { id: 'e-platform', naam: 'Platform en bouwstenen', soort: 'core', parentId: 'e-directie' },
    { id: 'e-bedrijfsvoering', naam: 'Bedrijfsvoering', soort: 'staf', parentId: 'e-directie' },
  ],

  plekken: [
    // Directie: zo klein mogelijk.
    { id: 'p-01', rol: 'Directeur', functiegroep: 'topmanager', schaal: 16, fte: 1, eenheidId: 'e-directie', expertise: ['leidinggeven'] },
    { id: 'p-02', rol: 'Principal engineer', functiegroep: 'strategisch-adviseur', schaal: 15, fte: 1, eenheidId: 'e-directie', expertise: ['engineering', 'architectuur'] },
    { id: 'p-03', rol: 'Beleidsadviseur', functiegroep: 'beleidsmedewerker', schaal: 12, fte: 1, eenheidId: 'e-directie', expertise: ['beleid'] },

    // Doorbraakteam 1: compleet multidisciplinair team volgens de Service Manual.
    { id: 'p-10', rol: 'Product manager', functiegroep: 'programmamanager', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['product'] },
    { id: 'p-11', rol: 'Delivery manager', functiegroep: 'projectleider', schaal: 11, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['delivery'] },
    { id: 'p-12', rol: 'User researcher', functiegroep: 'wetenschappelijk-medewerker', schaal: 12, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['onderzoek'] },
    { id: 'p-13', rol: 'Interactieontwerper', functiegroep: 'senior-adviseur', schaal: 12, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['design'] },
    { id: 'p-14', rol: 'Senior engineer', functiegroep: 'expert-iv', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['engineering'] },
    { id: 'p-15', rol: 'Engineer', functiegroep: 'senior-medewerker-iv', schaal: 11, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['engineering'] },
    { id: 'p-16', rol: 'Engineer', functiegroep: 'senior-medewerker-iv', schaal: 10, fte: 1, eenheidId: 'e-doorbraak-1', expertise: ['engineering'] },

    // Doorbraakteam 2.
    { id: 'p-20', rol: 'Product manager', functiegroep: 'programmamanager', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-2', expertise: ['product'] },
    { id: 'p-21', rol: 'Delivery manager', functiegroep: 'projectleider', schaal: 11, fte: 0.8, eenheidId: 'e-doorbraak-2', expertise: ['delivery'] },
    { id: 'p-22', rol: 'User researcher', functiegroep: 'wetenschappelijk-medewerker', schaal: 12, fte: 1, eenheidId: 'e-doorbraak-2', expertise: ['onderzoek'] },
    { id: 'p-23', rol: 'Contentontwerper', functiegroep: 'senior-adviseur', schaal: 11, fte: 1, eenheidId: 'e-doorbraak-2', expertise: ['design', 'content'] },
    { id: 'p-24', rol: 'Senior engineer', functiegroep: 'expert-iv', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-2', expertise: ['engineering'] },
    { id: 'p-25', rol: 'Engineer', functiegroep: 'senior-medewerker-iv', schaal: 11, fte: 1, eenheidId: 'e-doorbraak-2', expertise: ['engineering'] },

    // Standaarden: de hefboom voor een kleine organisatie.
    { id: 'p-30', rol: 'Lead engineer', functiegroep: 'cooerdinerend-adviseur', schaal: 14, fte: 1, eenheidId: 'e-standaarden', expertise: ['engineering', 'architectuur'] },
    { id: 'p-31', rol: 'Technisch architect', functiegroep: 'cooerdinerend-adviseur', schaal: 13, fte: 1, eenheidId: 'e-standaarden', expertise: ['architectuur'] },
    { id: 'p-32', rol: 'Security architect', functiegroep: 'cooerdinerend-adviseur', schaal: 13, fte: 1, eenheidId: 'e-standaarden', expertise: ['security', 'architectuur'] },
    { id: 'p-33', rol: 'Toegankelijkheidsspecialist', functiegroep: 'senior-adviseur', schaal: 12, fte: 0.8, eenheidId: 'e-standaarden', expertise: ['design', 'toegankelijkheid'] },

    // Platform: gedeelde bouwstenen, waaronder het design system.
    { id: 'p-40', rol: 'Teamlead', functiegroep: 'operationeel-manager', schaal: 11, fte: 1, eenheidId: 'e-platform', expertise: ['engineering', 'leidinggeven'] },
    { id: 'p-41', rol: 'Senior engineer', functiegroep: 'expert-iv', schaal: 13, fte: 1, eenheidId: 'e-platform', expertise: ['engineering'] },
    { id: 'p-42', rol: 'Frontend engineer', functiegroep: 'expert-iv', schaal: 12, fte: 1, eenheidId: 'e-platform', expertise: ['engineering', 'design'] },
    { id: 'p-43', rol: 'DevOps engineer', functiegroep: 'expert-iv', schaal: 12, fte: 1, eenheidId: 'e-platform', expertise: ['engineering', 'infrastructuur'] },
    { id: 'p-44', rol: 'Serviceontwerper', functiegroep: 'senior-adviseur', schaal: 12, fte: 1, eenheidId: 'e-platform', expertise: ['design'] },

    // Bedrijfsvoering: minimaal.
    { id: 'p-50', rol: 'Controller', functiegroep: 'adviseur-bedrijfsvoering', schaal: 11, fte: 0.6, eenheidId: 'e-bedrijfsvoering', expertise: ['financien'] },
    { id: 'p-51', rol: 'Officemanager', functiegroep: 'medewerker-ict-div', schaal: 8, fte: 0.8, eenheidId: 'e-bedrijfsvoering', expertise: [] },
  ],

  personen: [
    { id: 'm-01', naam: 'A. Alfa', schaal: 16, fte: 1, expertise: ['leidinggeven', 'beleid'], herkomst: 'bestaand' },
    { id: 'm-02', naam: 'B. Bravo', schaal: 15, fte: 1, expertise: ['engineering', 'architectuur'], herkomst: 'werving' },
    { id: 'm-03', naam: 'C. Charlie', schaal: 12, fte: 1, expertise: ['beleid'], herkomst: 'bestaand' },
    { id: 'm-04', naam: 'D. Delta', schaal: 13, fte: 1, expertise: ['product'], herkomst: 'bestaand' },
    { id: 'm-05', naam: 'E. Echo', schaal: 11, fte: 1, expertise: ['delivery'], herkomst: 'bestaand' },
    { id: 'm-06', naam: 'F. Foxtrot', schaal: 12, fte: 1, expertise: ['onderzoek'], herkomst: 'werving' },
    { id: 'm-07', naam: 'G. Golf', schaal: 12, fte: 1, expertise: ['design'], herkomst: 'bestaand' },
    { id: 'm-08', naam: 'H. Hotel', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'intern' },
    { id: 'm-09', naam: 'I. India', schaal: 11, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-10', naam: 'J. Juliet', schaal: 10, fte: 1, expertise: ['engineering'], herkomst: 'werving' },
    { id: 'm-11', naam: 'K. Kilo', schaal: 13, fte: 1, expertise: ['product'], herkomst: 'bestaand' },
    { id: 'm-12', naam: 'L. Lima', schaal: 11, fte: 0.8, expertise: ['delivery'], herkomst: 'bestaand' },
    { id: 'm-13', naam: 'M. Mike', schaal: 12, fte: 1, expertise: ['onderzoek'], herkomst: 'werving' },
    { id: 'm-14', naam: 'N. November', schaal: 11, fte: 1, expertise: ['design', 'content'], herkomst: 'bestaand' },
    { id: 'm-15', naam: 'O. Oscar', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'intern' },
    { id: 'm-16', naam: 'P. Papa', schaal: 11, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-17', naam: 'Q. Quebec', schaal: 14, fte: 1, expertise: ['engineering', 'architectuur'], herkomst: 'bestaand' },
    { id: 'm-18', naam: 'R. Romeo', schaal: 13, fte: 1, expertise: ['architectuur'], herkomst: 'bestaand' },
    { id: 'm-19', naam: 'S. Sierra', schaal: 13, fte: 1, expertise: ['security', 'architectuur'], herkomst: 'werving' },
    { id: 'm-20', naam: 'T. Tango', schaal: 12, fte: 0.8, expertise: ['design', 'toegankelijkheid'], herkomst: 'bestaand' },
    { id: 'm-21', naam: 'U. Uniform', schaal: 11, fte: 1, expertise: ['engineering', 'leidinggeven'], herkomst: 'bestaand' },
    { id: 'm-22', naam: 'V. Victor', schaal: 13, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
    { id: 'm-23', naam: 'W. Whiskey', schaal: 12, fte: 1, expertise: ['engineering', 'design'], herkomst: 'bestaand' },
    { id: 'm-24', naam: 'X. Xray', schaal: 12, fte: 1, expertise: ['engineering', 'infrastructuur'], herkomst: 'intern' },
    { id: 'm-25', naam: 'Y. Yankee', schaal: 12, fte: 1, expertise: ['design'], herkomst: 'bestaand' },
    { id: 'm-26', naam: 'Z. Zulu', schaal: 11, fte: 0.6, expertise: ['financien'], herkomst: 'bestaand' },
    { id: 'm-27', naam: 'A. Anton', schaal: 8, fte: 0.8, expertise: [], herkomst: 'bestaand' },
    // Nog niet geplaatst: laat de teller meteen zien waar het om gaat.
    { id: 'm-28', naam: 'B. Bernard', schaal: 12, fte: 1, expertise: ['engineering'], herkomst: 'bestaand' },
  ],

  scenarios: [
    {
      id: 's-1',
      naam: 'Startopstelling',
      beschrijving: 'Twee doorbraakteams, standaarden en platform. Zoals de dienst in de zomer begint.',
      toewijzingen: {
        'p-01': 'm-01',
        'p-02': 'm-02',
        'p-03': 'm-03',
        'p-10': 'm-04',
        'p-11': 'm-05',
        'p-12': 'm-06',
        'p-13': 'm-07',
        'p-14': 'm-08',
        'p-15': 'm-09',
        'p-16': 'm-10',
        'p-20': 'm-11',
        'p-21': 'm-12',
        'p-22': 'm-13',
        'p-23': 'm-14',
        'p-24': 'm-15',
        'p-25': 'm-16',
        'p-30': 'm-17',
        'p-31': 'm-18',
        'p-32': 'm-19',
        'p-33': 'm-20',
        'p-40': 'm-21',
        'p-41': 'm-22',
        'p-42': 'm-23',
        'p-43': 'm-24',
        'p-44': 'm-25',
        'p-50': 'm-26',
        'p-51': 'm-27',
      },
      extraPlekken: [],
      verwijderdePlekken: [],
      extraEenheden: [],
      verwijderdeEenheden: [],
    },
    {
      id: 's-2',
      naam: 'Derde doorbraak erbij',
      beschrijving:
        'Een derde vastgelopen traject oppakken door het platformteam te verkleinen. Laat zien wat dat kost aan gedeelde bouwstenen.',
      toewijzingen: {
        'p-01': 'm-01',
        'p-02': 'm-02',
        'p-03': 'm-03',
        'p-10': 'm-04',
        'p-11': 'm-05',
        'p-12': 'm-06',
        'p-13': 'm-07',
        'p-14': 'm-08',
        'p-15': 'm-09',
        'p-16': 'm-10',
        'p-20': 'm-11',
        'p-21': 'm-12',
        'p-22': 'm-13',
        'p-23': 'm-14',
        'p-24': 'm-15',
        'p-25': 'm-16',
        'p-30': 'm-17',
        'p-31': 'm-18',
        'p-32': 'm-19',
        'p-33': 'm-20',
        'p-40': 'm-21',
        'p-41': 'm-22',
        'p-50': 'm-26',
        'p-51': 'm-27',
        // Het derde team, bemenst vanuit platform.
        'p-60': 'm-23',
        'p-61': 'm-24',
        'p-62': 'm-25',
        'p-63': 'm-28',
      },
      extraEenheden: [
        { id: 'e-doorbraak-3', naam: 'Doorbraak: toeslagen', soort: 'doorbraak', parentId: 'e-directie' },
      ],
      verwijderdeEenheden: [],
      extraPlekken: [
        { id: 'p-60', rol: 'Product manager', functiegroep: 'programmamanager', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-3', expertise: ['product'] },
        { id: 'p-61', rol: 'User researcher', functiegroep: 'wetenschappelijk-medewerker', schaal: 12, fte: 1, eenheidId: 'e-doorbraak-3', expertise: ['onderzoek'] },
        { id: 'p-62', rol: 'Senior engineer', functiegroep: 'expert-iv', schaal: 13, fte: 1, eenheidId: 'e-doorbraak-3', expertise: ['engineering'] },
        { id: 'p-63', rol: 'Engineer', functiegroep: 'senior-medewerker-iv', schaal: 11, fte: 1, eenheidId: 'e-doorbraak-3', expertise: ['engineering'] },
      ],
      // Platform levert drie plekken in voor het derde doorbraakteam.
      verwijderdePlekken: ['p-42', 'p-43', 'p-44'],
    },
  ],

  actiefScenario: 's-1',
};
