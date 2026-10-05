// Un piccolo DOM per le anteprime e le prove (nessuna libreria): legge i tag dell'HTML che una pagina ha scritto e dà indietro elementi, gli stessi a ogni
// richiesta, a cui la pagina attacca i suoi onclick/oninput; così la prova può «toccare» davvero. Capisce i selettori semplici che le pagine usano:
// tag, .classe, #id, [attributo], [attributo="v"] (e quelli separati da virgola; di una catena con spazi conta l'ultimo pezzo).
// `Nodo` è un pezzo di pagina (la pagina intera, o un foglio che sale dal basso): si scrive con innerHTML e si interroga con querySelector(All).
// Dal 05/10 (per provare il modulo «nuovo appuntamento», nota 027) anche un elemento dentro il Nodo ha innerHTML: scriverlo riscrive quel pezzo
// della pagina; gli elementi con un id restano gli stessi oggetti dopo la riscrittura (i loro onclick restano), gli altri si rifanno, come in una pagina vera.
const VUOTI = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'path', 'circle', 'rect', 'use', 'polyline', 'line', 'source']);
function leggiTag(h) {
  const out = [], pila = [];
  for (const m of h.matchAll(/<(\/?)([a-z0-9]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>/gi)) {
    const nome = m[2].toLowerCase();
    if (m[1]) { while (pila.length) { const u = pila.pop(); if (out[u].tag === nome) { out[u].fine = m.index; break; } } continue; }
    const attr = {};
    for (const a of m[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attr[a[1]] = a[2] == null ? '' : a[2];
    out.push({ tag: nome, attr, pos: m.index, apertura: m[0].length, fine: m.index + m[0].length, padre: pila.length ? pila[pila.length - 1] : -1 });
    if (!m[4] && !VUOTI.has(nome)) pila.push(out.length - 1);
  }
  return out;
}
function corrisponde(t, comp) {
  const m = comp.match(/^([a-z0-9]*)((?:[.#][\w-]+|\[[\w-]+(?:="[^"]*")?\])*)$/i);
  if (!m) return false;
  if (m[1] && m[1].toLowerCase() !== t.tag) return false;
  for (const p of m[2].matchAll(/([.#])([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)) {
    if (p[1] === '.' && !(t.attr.class || '').split(/\s+/).includes(p[2])) return false;
    if (p[1] === '#' && t.attr.id !== p[2]) return false;
    if (p[3] && !(p[3] in t.attr)) return false;
    if (p[3] && p[4] != null && t.attr[p[3]] !== p[4]) return false;
  }
  return true;
}
class Nodo {
  constructor() { this._html = ''; this._cache = new Map(); this.style = {}; this.className = ''; this.classList = { toggle() {}, add() {}, remove() {} }; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; this._cache = new Map(); }
  // l'elemento com'è adesso nella pagina: per id se ce l'ha (anche dopo una riscrittura), altrimenti alla sua posizione
  _adesso(t) { const tag = leggiTag(this._html); return (t.attr.id ? tag.find(x => x.attr.id === t.attr.id) : tag.find(x => x.pos === t.pos)) || null; }
  elemento(t, tag) {
    const chiave = t.attr.id ? 'id:' + t.attr.id : t.pos;
    if (!this._cache.has(chiave)) {
      const dataset = {};
      for (const [k, v] of Object.entries(t.attr)) if (k.startsWith('data-')) dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = v;
      const nodo = this;
      const el = { tag: t.tag, attr: t.attr, dataset, onclick: null, oninput: null, onkeydown: null, onchange: null, onsubmit: null, disabled: false, hidden: 'hidden' in t.attr,
        value: t.attr.value || '', checked: false, style: {}, textContent: '', classList: { toggle() {}, add() {}, remove() {} },
        parentElement: t.padre >= 0 && tag ? this.elemento(tag[t.padre], tag) : null, hasAttribute: n => n in t.attr, getAttribute: n => t.attr[n], scrollIntoView() {}, focus() {}, addEventListener() {}, closest: () => null,
        // il dentro dell'elemento: leggerlo e riscriverlo (come velo.querySelector('#na-corpo').innerHTML = …)
        get innerHTML() { const a = nodo._adesso(t); return a ? nodo._html.slice(a.pos + a.apertura, a.fine) : ''; },
        set innerHTML(v) {
          const a = nodo._adesso(t);
          if (!a) return;
          const delta = v.length - (a.fine - (a.pos + a.apertura));
          nodo._html = nodo._html.slice(0, a.pos + a.apertura) + v + nodo._html.slice(a.fine);
          // come in una pagina vera: gli elementi dentro si rifanno, quelli fuori restano (quelli dopo si spostano di `delta`)
          const nuova = new Map();
          for (const [k, e] of nodo._cache) {
            if (typeof k !== 'number') nuova.set(k, e);
            else if (k > a.pos && k < a.fine) continue;
            else if (k >= a.fine) { e._t.pos += delta; nuova.set(k + delta, e); }
            else nuova.set(k, e);
          }
          nodo._cache = nuova;
        }, _t: t };
      this._cache.set(chiave, el);
      // dentro un elemento si cerca come nella pagina: solo i suoi discendenti (05/10, per provare il campo «Aggiungi…» di MB Plan)
      el.querySelectorAll = sel => this.querySelectorAll(sel).filter(e => { for (let p = e.parentElement; p; p = p.parentElement) if (p === el) return true; return false; });
      el.querySelector = sel => el.querySelectorAll(sel)[0] || null;
    }
    return this._cache.get(chiave);
  }
  querySelectorAll(sel) {
    const tag = leggiTag(this._html);
    const dentro = (i, pezzi) => {   // l'elemento i corrisponde all'ultimo pezzo e ha, più su, gli altri nell'ordine
      if (!corrisponde(tag[i], pezzi[pezzi.length - 1])) return false;
      if (pezzi.length === 1) return true;
      for (let p = tag[i].padre; p >= 0; p = tag[p].padre) if (dentro(p, pezzi.slice(0, -1))) return true;
      return false;
    };
    return sel.split(',').flatMap(x => { const pezzi = x.trim().split(/\s*>\s*|\s+/); return tag.map((t, i) => (dentro(i, pezzi) ? t : null)).filter(Boolean); })
      .sort((a, b) => a.pos - b.pos).filter((t, i, v) => !i || v[i - 1].pos !== t.pos).map(t => this.elemento(t, tag));
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getElementById(id) { return this.querySelector('#' + id); }
  appendChild() {} remove() {} addEventListener() {} insertBefore() {}
  // «tocca»: lancia l'onclick del primo (o n-esimo) elemento che corrisponde
  clic(sel, n = 0) { const e = this.querySelectorAll(sel)[n]; if (!e) throw new Error('non trovo ' + sel); if (!e.onclick) throw new Error('nessun clic su ' + sel); return e.onclick({ target: e, preventDefault() {} }); }
}
module.exports = { Nodo };
