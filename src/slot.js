/**
 * Het wachtwoordscherm.
 *
 * Een ondoorzichtige laag over de app, geen modal: bij vergrendelen mag de
 * plaat niet half doorschemeren, want daar staan namen op.
 *
 * Bewust kaal. Geen uitleg over versleuteling, geen technische termen: één
 * regel waarom er een wachtwoord is, een veld en een knop.
 */

import { maak, leeg, el } from './dom.js';

const KORTSTE_WACHTWOORD = 8;

function toonLaag() {
  const laag = el('slot');
  laag.hidden = false;
  document.querySelector('nldd-app-view')?.setAttribute('inert', '');
  return leeg(laag);
}

export function verbergSlot() {
  el('slot').hidden = true;
  document.querySelector('nldd-app-view')?.removeAttribute('inert');
}

/** Focus het wachtwoordveld; het echte input zit in de shadow DOM. */
function focusVeld(veld) {
  const invoer = veld?.shadowRoot?.querySelector('input') ?? veld?.querySelector('input');
  invoer?.focus();
}

function leesVeld(veld) {
  const invoer = veld?.shadowRoot?.querySelector('input') ?? veld?.querySelector('input');
  return (invoer?.value ?? veld?.value ?? '').trim();
}

/**
 * Bouwt het scherm en wacht tot er een geldig wachtwoord is ingevuld.
 *
 * `controleer` krijgt het wachtwoord en gooit als het niet klopt; de melding
 * uit die fout komt onder het veld te staan.
 */
function vraag({ titel, uitleg, knop, bevestigen = false, waarschuwing = null, controleer }) {
  return new Promise((klaar) => {
    const houder = toonLaag();

    const wachtwoordVeld = maak('nldd-password-field', {
      name: 'wachtwoord',
      autocomplete: bevestigen ? 'new-password' : 'current-password',
      required: true,
    });
    const herhaalVeld = bevestigen
      ? maak('nldd-password-field', {
          name: 'herhaal',
          autocomplete: 'new-password',
          required: true,
        })
      : null;

    const melding = maak('nldd-form-field-help-text', {});
    // Geen type="submit": dat dient het formulier in over de shadow-grens
    // heen, buiten de submit-listener om, en dan komt het wachtwoord in de
    // URL terecht. De knop roept de verwerking rechtstreeks aan.
    const knopElement = maak('nldd-button', {
      variant: 'primary',
      text: knop,
      on: { click: (e) => verzend(e) },
    });

    const toonFout = (tekst) => {
      wachtwoordVeld.toggleAttribute('invalid', Boolean(tekst));
      melding.textContent = tekst ?? '';
    };

    const verzend = async (gebeurtenis) => {
      gebeurtenis?.preventDefault();
      const wachtwoord = leesVeld(wachtwoordVeld);

      if (wachtwoord.length < KORTSTE_WACHTWOORD) {
        toonFout(`Gebruik minstens ${KORTSTE_WACHTWOORD} tekens.`);
        return;
      }
      if (bevestigen && wachtwoord !== leesVeld(herhaalVeld)) {
        toonFout('De twee wachtwoorden zijn niet gelijk.');
        return;
      }

      toonFout(null);
      knopElement.toggleAttribute('loading', true);
      knopElement.toggleAttribute('disabled', true);
      try {
        await controleer(wachtwoord);
        verbergSlot();
        klaar(wachtwoord);
      } catch (fout) {
        toonFout(fout?.message ?? 'Dat lukte niet.');
        knopElement.removeAttribute('loading');
        knopElement.removeAttribute('disabled');
        focusVeld(wachtwoordVeld);
      }
    };

    // Een echt formulier, zodat wachtwoordmanagers meedoen en Enter werkt.
    //
    // method="post" en action="" als vangnet: als preventDefault ooit faalt,
    // mag het wachtwoord niet als queryparameter in de URL en daarmee in de
    // browsergeschiedenis belanden. Dat gebeurde bij method="get".
    const form = maak(
      'form',
      { method: 'post', action: '', on: { submit: verzend } },
      [
      maak('nldd-form', {}, [
        maak('nldd-form-field', { label: 'Wachtwoord' }, [wachtwoordVeld, melding]),
        herhaalVeld
          ? maak('nldd-form-field', { label: 'Herhaal wachtwoord' }, [herhaalVeld])
          : null,
        maak('nldd-form-actions', {}, [knopElement]),
      ]),
    ]);

    houder.append(
      maak('nldd-app-view', {}, [
        maak('nldd-page', {}, [
          maak(
            'nldd-simple-section',
            { width: '420px' },
            [
              maak('nldd-title', { size: '2' }, [maak('h1', {}, [titel])]),
              maak('nldd-spacer', { size: '8' }),
              maak('nldd-text', { color: 'secondary' }, [uitleg]),
              maak('nldd-spacer', { size: '24' }),
              waarschuwing
                ? maak('nldd-banner', {
                    variant: 'warning',
                    text: waarschuwing,
                  })
                : null,
              waarschuwing ? maak('nldd-spacer', { size: '16' }) : null,
              form,
            ].filter(Boolean)
          ),
        ]),
      ])
    );

    // Enter in een veld verzendt ook. De keydown komt uit de shadow DOM van
    // het component, vandaar capture.
    houder.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter') verzend(e);
      },
      { capture: true }
    );

    setTimeout(() => focusVeld(wachtwoordVeld), 50);
  });
}

/** Bestaande plaat openen. */
export function vraagWachtwoord(controleer) {
  return vraag({
    titel: 'Ruimte',
    uitleg: 'Je plaat staat op deze computer en is afgeschermd met een wachtwoord.',
    knop: 'Openen',
    controleer,
  });
}

/** Eerste keer, of bij het overzetten van een oude plaat. */
export function vraagNieuwWachtwoord(controleer, { migratie = false } = {}) {
  return vraag({
    titel: 'Ruimte',
    uitleg: migratie
      ? 'Er staat een plaat in deze browser zonder wachtwoord. Kies er een om hem af te schermen.'
      : 'Je plaat blijft op deze computer. Kies een wachtwoord om hem af te schermen.',
    knop: migratie ? 'Wachtwoord instellen' : 'Beginnen',
    bevestigen: true,
    waarschuwing:
      'Bewaar dit wachtwoord goed. Raak je het kwijt, dan is de plaat niet meer te openen, ook niet door ons.',
    controleer,
  });
}

/** Wachtwoord voor een exportbestand, of voor een geïmporteerd bestand. */
export function vraagBestandsWachtwoord({ nieuw }) {
  return vraag({
    titel: nieuw ? 'Bestand beveiligen' : 'Bestand openen',
    uitleg: nieuw
      ? 'Kies een wachtwoord voor dit bestand. Deel het via een ander kanaal dan het bestand zelf.'
      : 'Dit bestand is beveiligd met een wachtwoord.',
    knop: nieuw ? 'Opslaan' : 'Openen',
    bevestigen: nieuw,
    controleer: async () => {},
  });
}
