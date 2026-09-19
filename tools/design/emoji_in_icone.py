# -*- coding: utf-8 -*-
# Cantiere 34 · Sostituisce le emoji con le icone a tratto dentro un file JavaScript dell'app.
# Uso:  python3 tools/design/emoji_in_icone.py <file.js> [prima_riga] [ultima_riga]
# Capisce da solo dove si trova l'emoji: dentro un testo tra accenti gravi (`…`) scrive ${ic('nome')}, dentro un testo
# tra apici ('…' o "…") chiude il testo, aggiunge + ic('nome') + e lo riapre. Commenti e codice non si toccano.
# «ic» è la scorciatoia di MB21Icone.icona definita in index.html. Le emoji senza icona restano e vengono elencate alla fine.
# ATTENZIONE: va bene solo dove il testo diventa HTML (innerHTML). Dove il testo passa da esc(), textContent o mostraToast
# l'icona uscirebbe scritta in lettere: quelle righe si sistemano a mano PRIMA di lanciare lo script (lui le segnala e si ferma).
import io, re, sys

ICONE = {
    u'👤': 'persona', u'📲': 'installa', u'👁': 'visione', u'👏': 'complimenti', u'🎉': 'complimenti', u'🗂': 'catalogare',
    u'📅': 'conferme', u'🗓': 'agenda', u'📵': 'telefonooff', u'🚀': 'avvio', u'👉': 'prossimo', u'✅': 'fatto', u'⏸': 'pausa',
    u'💡': 'propone', u'▶': 'riprendi', u'🔄': 'aggiorna', u'ℹ': 'info', u'🔁': 'riordini', u'🎟': 'biglietto', u'🎯': 'obiettivi',
    u'⚡': 'lampo', u'📊': 'segnivitali', u'📈': 'crescita', u'🟪': 'pianomarketing', u'💪': 'crescita', u'✏': 'modifica', u'🛒': 'vendite',
    u'📦': 'consegna', u'📞': 'telefonate', u'⭐': 'perche', u'🌟': 'perche', u'👥': 'squadra', u'🎧': 'audio', u'📖': 'libro',
    u'🔔': 'avvisi', u'🔕': 'avvisi-spenti', u'📱': 'app', u'🔗': 'collega', u'⚠': 'attenzione', u'🔑': 'password', u'🕑': 'orario',
    u'📷': 'foto', u'👋': 'benvenuto', u'📨': 'invito', u'📄': 'file', u'📤': 'condividi', u'🗑': 'elimina', u'✨': 'novita',
    u'⏳': 'orario', u'👍': 'conferme', u'↩': 'aggiorna',
    u'🎂': 'compleanno', u'📒': 'rubrica', u'🤝': 'squadra', u'🏠': 'casa', u'📋': 'lista', u'🗺': 'mappa',
}
EMOJI = re.compile(u'([\U0001F000-\U0001FAFF\u2300-\u23FF\u2600-\u26FF\u2700-\u2712\u2714\u2716-\u27BF\u2B00-\u2BFF\u25B6\u2139\u21A9])\uFE0F?')   # la clessidra (U+23F3) era rimasta fuori: vista da Ignazio il 19/09
PERICOLO = re.compile(r'mostraToast|textContent|\besc\(|title=|placeholder=|aria-label=|chiediConferma|alert\(')

def lavora(testo, prima, ultima):
    esce, pila, i, riga, rimaste = [], [], 0, 1, {}
    # pila: 'T' dentro `…`, 'E' dentro ${…} di un template, "'" e '"' dentro un testo, 'C' commento di riga, 'B' commento a blocco
    while i < len(testo):
        c, stato = testo[i], (pila[-1] if pila else None)
        if c == '\n':
            riga += 1
            if stato in ("'", '"'): pila.pop(); stato = pila[-1] if pila else None   # un testo tra apici non va mai a capo: se sembra di sì, lo strumento si era confuso (es. un apice dentro una /espressione/) e qui si rimette in riga
        if stato == 'C':
            if c == '\n': pila.pop()
        elif stato == 'B':
            if testo.startswith('*/', i): esce.append('*/'); i += 2; pila.pop(); continue
        elif stato in ("'", '"'):
            if c == '\\': esce.append(testo[i:i+2]); i += 2; continue
            if c == stato: pila.pop()
        elif stato == 'T':
            if c == '\\': esce.append(testo[i:i+2]); i += 2; continue
            if c == '`': pila.pop()
            elif testo.startswith('${', i): esce.append('${'); i += 2; pila.append('E'); continue
        else:   # codice (fuori da tutto, o dentro ${…})
            if testo.startswith('//', i): pila.append('C')
            elif testo.startswith('/*', i): pila.append('B')
            elif c in ("'", '"'): pila.append(c)
            elif c == '`': pila.append('T')
            elif c == '{' and stato == 'E': pila.append('{')
            elif c == '}' and stato in ('E', '{'): pila.pop()
        m = EMOJI.match(testo, i) if stato in ('T', "'", '"') and pila and pila[-1] == stato else None
        if m and prima <= riga <= ultima:
            nome = ICONE.get(m.group(1))
            if nome:
                esce.append(u"${ic('%s')}" % nome if stato == 'T' else u"%s + ic('%s') + %s" % (stato, nome, stato))
                i = m.end(); continue
            rimaste[m.group(0)] = rimaste.get(m.group(0), 0) + 1
        esce.append(c); i += 1
    nuovo = u''.join(esce)
    nuovo = re.sub(r"(['\"])\1 \+ (ic\('[a-z-]+'\)) \+ \1\1", r"\2", nuovo)      # '' + ic('x') + ''  →  ic('x')
    nuovo = re.sub(r"(['\"])\1 \+ (ic\('[a-z-]+'\))", r"\2", nuovo)                # '' + ic('x') + '…  →  ic('x') + '…
    nuovo = re.sub(r"(ic\('[a-z-]+'\)) \+ (['\"])\2(?!\2)", r"\1", nuovo)          # …' + ic('x') + ''  →  …' + ic('x')
    return nuovo, rimaste

if __name__ == '__main__':
    f = sys.argv[1]
    prima = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    ultima = int(sys.argv[3]) if len(sys.argv) > 3 else 10 ** 9
    testo = io.open(f, encoding='utf-8').read()
    def dentro_un_testo_semplice(r, pos):
        # risale le parentesi aperte prima dell'emoji: se una è di esc(, mostraToast(, chiediConferma(… l'icona uscirebbe in lettere
        aperte, k = 0, pos
        while k > 0:
            k -= 1
            if r[k] == ')': aperte += 1
            elif r[k] == '(':
                if aperte: aperte -= 1
                elif re.search(r'(\besc|mostraToast|chiediConferma|alert)$', r[:k]): return True
        return bool(re.search(r'textContent\s*=|title="[^"]*$|placeholder="[^"]*$|aria-label="[^"]*$', r[:pos]))
    sospette = [n for n, r in enumerate(testo.split('\n'), 1) if prima <= n <= ultima and not r.strip().startswith('//')
                and any(m.group(1) in ICONE and dentro_un_testo_semplice(r, m.start()) for m in EMOJI.finditer(r))]
    if sospette and '--avanti' not in sys.argv:
        sys.exit(u'Righe dove l\'icona potrebbe uscire scritta in lettere (sistemale a mano, poi rilancia con --avanti): %s' % sospette)
    nuovo, rimaste = lavora(testo, prima, ultima)
    io.open(f, 'w', encoding='utf-8').write(nuovo)
    print(u'%s: %d icone messe' % (f, nuovo.count(u"ic('") - testo.count(u"ic('")))
    if rimaste: print(u'  emoji senza icona, lasciate: ' + u'  '.join(u'%s ×%d' % kv for kv in rimaste.items()))
