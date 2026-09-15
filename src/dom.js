/** Kleine DOM-helpers, gedeeld door de app en het wachtwoordscherm. */

export const el = (id) => document.getElementById(id);

export function maak(tag, attrs = {}, kinderen = []) {
  const node = document.createElement(tag);
  for (const [sleutel, waarde] of Object.entries(attrs)) {
    if (waarde === false || waarde == null) continue;
    if (sleutel === 'on') {
      for (const [gebeurtenis, fn] of Object.entries(waarde)) {
        node.addEventListener(gebeurtenis, fn);
      }
    } else if (waarde === true) {
      node.setAttribute(sleutel, '');
    } else {
      node.setAttribute(sleutel, String(waarde));
    }
  }
  for (const kind of [].concat(kinderen)) {
    if (kind == null) continue;
    node.append(typeof kind === 'string' ? document.createTextNode(kind) : kind);
  }
  return node;
}

export function leeg(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}
