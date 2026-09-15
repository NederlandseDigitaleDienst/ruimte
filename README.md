# Ruimte

Een werkinstrument voor het samenstellen van een formatie: hoeveel plekken zijn
er, wie zet je erop, en klopt het geheel nog. Bedoeld om open te hebben tijdens
een gesprek, zodat iemand kan zeggen "hier moet er eentje bij" en dat er
meteen staat.

De aanleiding is een terugkerend probleem bij organisatievorming. Het aantal
plekken, het aantal mensen en de vraag of niemand vergeten is, wordt met de
hand bijgehouden in een spreadsheet of een tekening. Bij elke wijziging telt
iemand opnieuw, en dat gaat mis.

## Wat het doet

Bovenaan staat permanent de stand: aantal plekken, fte, aantal mensen, hoeveel
mensen nog geen plek hebben, en wat het kost. Die regel herberekent bij elke
wijziging.

Links kies je een scenario en lees je de toets. Negen controles draaien continu
mee, van "heeft iedereen een plek" tot de verdeling tussen kernteam en
doorbraakprojecten. Klik op een bevinding en je springt naar de mensen of
plekken waar het om gaat.

In het midden staat de plaat zelf, in vier weergaven:

- **Formatie** is de werkweergave: teams met hun plekken, schaal, fte en wie
  erop staat. Sleep iemand van de ene plek naar de andere.
- **Organogram** toont de hark met per team een balkje voor de bezetting.
- **Mensen** zet bovenaan wie nog nergens staat. Dat is de lijst die niet leeg
  mag blijven zonder dat iemand het gezien heeft.
- **Vergelijk** legt de scenario's naast elkaar met hun cijfers en bevindingen.

Rechts staan de details van wat je aanklikt. Bij een persoon zie je ook welke
vrije plekken passen, gesorteerd op hoe goed de match is, zodat je vanuit die
lijst iemand direct kunt plaatsen.

## Scenario's

Een scenario is een variant op dezelfde basis. Wat erin zit en wat erbuiten:

| Per scenario | Gedeeld over alle scenario's |
|---|---|
| Wie op welke plek staat | De mensen: wie er zijn, hun schaal, fte en expertise |
| Plekken die je toevoegt of weghaalt | De normen: budgetplafond, engineersratio, span of control |
| De teams en de hark | |

Een plek of team bewerken in het ene scenario laat het andere ongemoeid: er
wordt dan een scenario-eigen kopie gemaakt. Zo kun je "wat als we hier een
apart doorbraakteam voor optuigen" naast de huidige opzet leggen.

De mensen blijven bewust gedeeld. Dezelfde pool over een andere organisatie
verdelen is waar het gesprek over gaat, en "vergeet ik niemand" klopt alleen
als iedereen in elk scenario meetelt.

Bij het vergelijken zie je welke teams een scenario wel of niet heeft.

## Ongedaan maken

Alles is omkeerbaar met de knop of met Ctrl+Z (Cmd+Z). Daarom vraagt de tool
nergens om bevestiging, ook niet bij het verwijderen van een plek. Je bent in
gesprek; je moet kunnen schuiven zonder dialoogvensters.

## Cijfers

De loonkosten komen uit de Handleiding Overheidstarieven 2026, tabel 1 en 2.
Schaal 13 kost € 134.000 per mensjaar aan loonkosten; met € 28.000 overhead per
fte komt dat op € 162.000 integraal. Het budget wordt getoetst op de integrale
kosten.

Functiegroepen volgen het Functiegebouw Rijk, met het schaalbereik dat bij de
functiegroep hoort. Een plek buiten dat bereik is niet verboden, maar vraagt
onderbouwing in het formatierapport, dus de toets geeft een signaal.

Let op: de HOT 2026 is opgesteld voordat de CAO Rijk 2026 met 2,7% er lag, dus
de bedragen zijn aan de conservatieve kant.

## Wachtwoord

De plaat staat versleuteld in je browser. Bij het openen kies of geef je een
wachtwoord; na een kwartier niets doen gaat hij vanzelf weer op slot.

**Er is geen herstel.** Raak je het wachtwoord kwijt, dan is de plaat niet meer
te openen, ook niet door ons. Exporteer regelmatig als je dat risico niet wilt
lopen; een exportbestand krijgt zijn eigen wachtwoord, dat je het beste via een
ander kanaal deelt dan het bestand zelf.

Wat dit wel doet: iemand die je laptop of je browseropslag inziet, leest niets.
Wat dit niet doet: het beschermt niet tegen iemand die meekijkt terwijl de
plaat open staat, en het beantwoordt geen enkele vraag over grondslag,
bewaartermijn of wie verwerkingsverantwoordelijke is. Die vragen komen zodra er
echte namen in gaan.

## Gebruik

De tool staat op https://nederlandsedigitaledienst.github.io/ruimte/. Elke
push naar `main` publiceert opnieuw, na de tests.

Lokaal:

```sh
uv run --no-project python serve.py
```

Open http://127.0.0.1:8731. Er is geen build nodig; het design system komt van
de CDN. Versleuteling vereist https of localhost, dus openen via `file://`
werkt niet.

Het werk wordt versleuteld in de browser bewaard. Met Exporteren haal je een
bestand op dat je kunt delen of in een andere browser inladen.

Tests: `node --test test/*.js`

## Eigen gegevens

Vervang de inhoud van `src/voorbeelddata.js`, of exporteer een keer, pas het
JSON-bestand aan en importeer het terug. Een persoon heeft een naam, schaal,
fte en expertise; een plek heeft een rol, functiegroep, schaal, fte en het team
waar hij bij hoort.

## Wat het niet doet

Dit is geen O&F-rapport en geen vervanging ervan. Het formatieplaatsenplan dat
hieruit komt is één bijlage van zo'n rapport. De personele paragraaf (bereik,
peildatum, sleutelfuncties, was-wordt-lijst) en het medezeggenschapstraject
zitten er niet in.

De matchscore bij een persoon is een hulpmiddel bij het schuiven, geen oordeel
over geschiktheid. Uitwisselbaarheid van functies en de plaatsingsvolgorde zijn
rechtspositionele vragen die niet in een score passen.

## Techniek

Web components uit `@nldd/design-system` 0.8.88, geen framework, geen build.

| Bestand | Wat |
|---|---|
| `model.js` | Berekeningen en de toets |
| `fgr.js` | Functiegebouw Rijk en de rollen |
| `state.js` | Opslag, undo en het slot |
| `krypto.js` | Versleuteling (AES-GCM, Web Crypto) |
| `slot.js` | Het wachtwoordscherm |
| `autolock.js` | Vanzelf op slot na een kwartier |
| `app.js` | Weergave en interactie |

De opslag is versleuteld met een sleutel uit je wachtwoord (PBKDF2, AES-GCM).
Het wachtwoord wordt na het afleiden losgelaten: het staat niet in de opslag
en niet meer in het invoerveld. Alleen de afgeleide sleutel blijft in het
geheugen, en die is niet uitleesbaar vanuit JavaScript.

`index.html` bevat een Content Security Policy en integriteitshashes voor
de bestanden van de CDN. Bij een upgrade van het design system moeten die
hashes mee; hoe staat in een commentaar in het bestand.

Let op bij GitHub Pages: `naam.github.io/ruimte/` deelt zijn oorsprong, en dus
zijn browseropslag, met elke andere Pages-site van hetzelfde account of dezelfde
organisatie. Zet de tool op een eigen domein of in een organisatie zonder
andere Pages-sites.
