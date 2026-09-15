/**
 * Versleuteling voor Ruimte.
 *
 * Bewust zonder DOM, zonder localStorage en zonder `window`: alles loopt via
 * `globalThis.crypto`, zodat deze laag in Node te testen is.
 *
 * AES-256-GCM met PBKDF2-SHA256. GCM geeft integriteit gratis: een fout
 * wachtwoord of gemanipuleerde data laat het ontsleutelen falen, dus er is
 * geen aparte controle nodig.
 *
 * Het wachtwoord komt nooit verder dan `maakEnvelop` en `openEnvelop`. Die
 * geven de afgeleide sleutel terug, zodat de aanroeper die kan bewaren en
 * het wachtwoord kan laten vallen. Een sleutel is `extractable: false`, dus
 * hij is niet uit te lezen vanuit JavaScript.
 */

/**
 * OWASP-richtlijn voor PBKDF2-SHA256 (2026). Gemeten op een moderne laptop:
 * ongeveer 70ms, eenmalig bij ontgrendelen.
 *
 * Dit getal staat ook in elke envelop. Bij het openen leidt de code af met de
 * waarde uit het bestand, niet met deze constante, zodat dit later omhoog kan
 * zonder bestaande platen onleesbaar te maken.
 */
export const KDF_ITERATIES = 600_000;

/**
 * Bovengrens voor wat een envelop mag vragen. Zonder grens laat een bestand
 * met twee miljard iteraties het tabblad minutenlang hangen bij importeren.
 */
export const MAX_KDF_ITERATIES = 10_000_000;

export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const FORMAAT = 'ruimte-versleuteld';
export const VERSIE = 1;

/** Vaste tekst die meeversleuteld wordt om een wachtwoord te kunnen toetsen. */
const CANARY = 'ruimte-canary';

/** Het wachtwoord klopt niet, of de data is aangepast. */
export class WachtwoordFout extends Error {
  constructor(bericht = 'Wachtwoord klopt niet') {
    super(bericht);
    this.name = 'WachtwoordFout';
  }
}

/** Versleuteling vereist https of localhost. */
export class GeenCryptoFout extends Error {
  constructor() {
    super('Versleuteling werkt alleen via https of localhost');
    this.name = 'GeenCryptoFout';
  }
}

function subtle() {
  const c = globalThis.crypto?.subtle;
  if (!c) throw new GeenCryptoFout();
  return c;
}

export function beschikbaar() {
  return Boolean(globalThis.crypto?.subtle);
}

export function nieuwSalt() {
  return globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/**
 * Een verse IV per versleuteling. Nooit hergebruiken met dezelfde sleutel:
 * bij AES-GCM verlies je daarmee zowel de vertrouwelijkheid als de
 * integriteit. Een willekeurige 96-bits IV is veilig ruim voorbij het aantal
 * schrijfacties dat deze tool ooit doet.
 */
function nieuweIv() {
  return globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
}

export async function leidSleutelAf(wachtwoord, salt, iteraties = KDF_ITERATIES) {
  const basis = await subtle().importKey(
    'raw',
    new TextEncoder().encode(wachtwoord),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: iteraties, hash: 'SHA-256' },
    basis,
    { name: 'AES-GCM', length: 256 },
    false, // niet uitleesbaar vanuit JavaScript
    ['encrypt', 'decrypt']
  );
}

export async function versleutel(sleutel, tekst) {
  const iv = nieuweIv();
  const data = await subtle().encrypt(
    { name: 'AES-GCM', iv },
    sleutel,
    new TextEncoder().encode(tekst)
  );
  return { iv: naarBase64(iv), data: naarBase64(new Uint8Array(data)) };
}

export async function ontsleutel(sleutel, pakket) {
  try {
    const plat = await subtle().decrypt(
      { name: 'AES-GCM', iv: uitBase64(pakket.iv) },
      sleutel,
      uitBase64(pakket.data)
    );
    return new TextDecoder().decode(plat);
  } catch (fout) {
    // AES-GCM gooit OperationError bij een fout wachtwoord én bij
    // gemanipuleerde data. Voor de gebruiker is dat hetzelfde geval.
    if (fout?.name === 'OperationError') throw new WachtwoordFout();
    throw fout;
  }
}

/** Een nieuwe envelop met eigen salt, canary en inhoud. */
export async function maakEnvelop(wachtwoord, tekst) {
  const salt = nieuwSalt();
  const sleutel = await leidSleutelAf(wachtwoord, salt, KDF_ITERATIES);
  return {
    envelop: {
      formaat: FORMAAT,
      versie: VERSIE,
      kdf: {
        naam: 'PBKDF2',
        hash: 'SHA-256',
        iteraties: KDF_ITERATIES,
        salt: naarBase64(salt),
      },
      canary: await versleutel(sleutel, CANARY),
      inhoud: await versleutel(sleutel, tekst),
    },
    sleutel,
  };
}

/**
 * Open een envelop. Toetst eerst de canary, zodat een fout wachtwoord ook
 * wordt herkend als de inhoud een lege plaat is. Zonder die stap zou elk
 * wachtwoord goed lijken bij een lege plaat, en merkte je een typefout pas
 * de volgende sessie, als je data onbereikbaar is.
 */
export async function openEnvelop(envelop, wachtwoord) {
  if (envelop?.formaat !== FORMAAT) {
    throw new Error('Dit is geen versleutelde plaat');
  }
  const iteraties = envelop.kdf?.iteraties ?? KDF_ITERATIES;
  if (!Number.isInteger(iteraties) || iteraties < 1 || iteraties > MAX_KDF_ITERATIES) {
    throw new Error('Dit bestand vraagt een ongeldig aantal sleutelrondes');
  }
  const salt = uitBase64(envelop.kdf.salt);
  const sleutel = await leidSleutelAf(wachtwoord, salt, iteraties);

  const canary = await ontsleutel(sleutel, envelop.canary);
  if (canary !== CANARY) throw new WachtwoordFout();

  return { sleutel, tekst: await ontsleutel(sleutel, envelop.inhoud) };
}

/**
 * Nieuwe inhoud in een bestaande envelop: zelfde salt en sleutel, verse IV.
 * Gebruikt bij elke opslag, zodat PBKDF2 maar één keer per sessie draait.
 */
export async function hermaakEnvelop(sleutel, envelop, tekst) {
  return { ...envelop, inhoud: await versleutel(sleutel, tekst) };
}

export function naarBase64(bytes) {
  let ruw = '';
  for (const b of bytes) ruw += String.fromCharCode(b);
  return btoa(ruw);
}

export function uitBase64(tekst) {
  const ruw = atob(tekst);
  const bytes = new Uint8Array(ruw.length);
  for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i);
  return bytes;
}
