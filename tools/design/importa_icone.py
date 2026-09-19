# -*- coding: utf-8 -*-
# Cantiere 34 · Rifà l'elenco DISEGNI di icone.js dalla tavola «Icone» di Claude Design.
# Uso, dalla cartella del progetto:  python3 tools/design/importa_icone.py
# Legge tools/design/da_design/Icone.dc.html (copia della tavola: si aggiorna leggendo la tela con lo strumento Artifact),
# prende di ogni icona il disegno grande, il nome «ic-…» scritto sotto e la voce, e riscrive SOLO il blocco tra i due segni
# «// ── DISEGNI: inizio» e «// ── DISEGNI: fine» di icone.js. Il resto del file non si tocca. Si ferma se trova nomi doppi,
# colori o spessori scritti dentro un disegno, o se un'icona già usata nell'app sparirebbe.
import io, re, sys, glob

tavola = io.open('tools/design/da_design/Icone.dc.html', encoding='utf-8').read()
gruppi = [(m.start(), re.sub('<[^>]+>', '', m.group(1)).split(u'—')[0].strip()) for m in re.finditer(r'<h2[^>]*>(.*?)</h2>', tavola)]
righe, nomi, ultimo = [], [], None
for m in re.finditer(r'<svg width="30"[^>]*>(.*?)</svg></div><div[^>]*>(.*?)</div><div[^>]*>ic-([a-z0-9-]+)</div>', tavola, re.S):
    gruppo = [t for p, t in gruppi if p < m.start()][-1]
    disegno, voce, nome = re.sub(r'\s+', ' ', m.group(1)).strip(), re.sub('<[^>]+>', '', m.group(2)).strip(), m.group(3)
    if re.search(r"'|#[0-9a-fA-F]{3,6}|style=|stroke=|stroke-width|fill=|<text|<image|<script", disegno): sys.exit(u'Disegno non pulito: ic-' + nome)
    if nome in nomi: sys.exit(u'Nome doppio: ic-' + nome)
    if gruppo != ultimo: righe.append(u'    // ' + gruppo); ultimo = gruppo
    righe.append(u"    '%s': '%s',   // %s" % (nome, disegno, voce)); nomi.append(nome)
if len(nomi) < 29: sys.exit(u'Trovate solo %d icone: la tavola è cambiata?' % len(nomi))

usate = set()
for f in ['index.html'] + glob.glob('*.js'):
    testo = io.open(f, encoding='utf-8').read()
    usate |= set(re.findall(r'#ic-([a-z0-9-]+)"', testo)) | set(re.findall(r"icona\('([a-z0-9-]+)'", testo))
mancano = sorted(usate - set(nomi))
if mancano: sys.exit(u'Usate nell\'app ma assenti dalla tavola: ' + ', '.join(mancano))

js = io.open('icone.js', encoding='utf-8').read()
a, b = u'    // ── DISEGNI: inizio', u'    // ── DISEGNI: fine'
if js.count(a) != 1 or js.count(b) != 1: sys.exit(u'In icone.js mancano i due segni del blocco DISEGNI')
i, j = js.index(a), js.index(b)
js = js[:i] + a + u' (scritto da tools/design/importa_icone.py: non modificare a mano)\n' + u'\n'.join(righe) + u'\n' + js[j:]
io.open('icone.js', 'w', encoding='utf-8').write(js)
print(u'%d icone scritte in icone.js' % len(nomi))
