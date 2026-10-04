#!/usr/bin/env python3
"""Esporta TUTTI i dati di un partner dal database MB21 in un file .xlsx (Fondamenta 025 parte 2, 04/10/2026).

Serve in due casi: (1) il partner chiede i propri dati (portabilità); (2) prima di cancellarlo davvero
(funzione `cancella_utente_davvero`, migrazione 20261003140000) se ne tiene una copia.

Uso (dalla cartella mb21, con il collegamento a Supabase già fatto):
    python3 scripts/esporta_partner.py <email o id dell'utente> [--dest <cartella>]

Legge soltanto (supabase db query --linked, nessun segreto nel file). Un foglio per ogni tabella che ha
righe di quel partner (tutte quelle con una chiave verso `utenti`, trovate dal database, più la sua riga di `utenti`).
Il file va, nell'ordine: nella cartella indicata con --dest · sul disco LaCie in «MB21 Backup/Partner esportati» ·
altrimenti in ~/mb21-import/esportazioni. Mai su internet.
Il .xlsx è scritto senza librerie esterne (è uno zip di XML): si apre con Excel, Numbers e Fogli Google.
"""
import json, os, re, subprocess, sys, zipfile
from datetime import datetime
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def query(sql):
    """Una domanda al database vero, solo in lettura. Restituisce la lista delle righe (dizionari)."""
    r = subprocess.run(['supabase', 'db', 'query', '--linked', sql], cwd=REPO, capture_output=True, text=True)
    out = r.stdout
    if '"rows"' not in out:
        sys.exit(f"Il database non ha risposto:\n{r.stderr or out}")
    j = json.loads(out[out.index('{'):out.rindex('}') + 1])
    return j['rows']

def cella(v):
    if v is None: return ''
    if isinstance(v, (dict, list)): return json.dumps(v, ensure_ascii=False)
    return str(v)

def foglio_xml(righe, colonne):
    """Un foglio: intestazione + righe, tutto come testo «inline» (niente tabella condivisa delle stringhe)."""
    def riga(n, valori):
        celle = ''.join(f'<c t="inlineStr"><is><t xml:space="preserve">{escape(cella(v))}</t></is></c>' for v in valori)
        return f'<row r="{n}">{celle}</row>'
    corpo = riga(1, colonne) + ''.join(riga(i + 2, [r.get(c) for c in colonne]) for i, r in enumerate(righe))
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<sheetData>{corpo}</sheetData></worksheet>')

def scrivi_xlsx(percorso, fogli):
    """fogli = [(nome, righe, colonne)]. Nome foglio: massimo 31 caratteri, senza caratteri vietati."""
    nomi, usati = [], set()
    for nome, _, _ in fogli:
        n = re.sub(r'[\[\]\*\?/\\:]', '_', nome)[:31] or 'foglio'
        base, k = n, 2
        while n in usati: n = f'{base[:28]}_{k}'; k += 1
        usati.add(n); nomi.append(n)
    with zipfile.ZipFile(percorso, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            + ''.join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(len(fogli)))
            + '</Types>')
        z.writestr('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + ''.join(f'<sheet name="{escape(n)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, n in enumerate(nomi))
            + '</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>' for i in range(len(fogli)))
            + '</Relationships>')
        for i, (_, righe, colonne) in enumerate(fogli):
            z.writestr(f'xl/worksheets/sheet{i + 1}.xml', foglio_xml(righe, colonne))

def cartella_destinazione(dest):
    if dest: return dest
    lacie = '/Volumes/Disk Esterno LaCie/MB21 Backup/Partner esportati'
    if os.path.isdir('/Volumes/Disk Esterno LaCie'): return lacie
    return os.path.expanduser('~/mb21-import/esportazioni')

def main():
    args = sys.argv[1:]
    dest = None
    if '--dest' in args:
        i = args.index('--dest'); dest = args[i + 1]; del args[i:i + 2]
    if len(args) != 1:
        sys.exit(__doc__)
    chi = args[0].strip().replace("'", "''")
    cond = f"id = '{chi}'" if re.fullmatch(r'[0-9a-f-]{36}', chi) else f"lower(email) = lower('{chi}')"
    utenti = query(f"select * from public.utenti where {cond}")
    if len(utenti) != 1:
        sys.exit(f"Trovati {len(utenti)} utenti per «{args[0]}»: serve l'email esatta o l'id.")
    u = utenti[0]
    # Le tabelle con una chiave verso utenti, lette dal database: così una tabella nuova entra da sola
    tabelle = query("select conrelid::regclass::text t, a.attname col from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.contype = 'f' and c.confrelid = 'public.utenti'::regclass order by 1, 2")
    fogli = [('utente', [u], list(u.keys()))]
    conti = {}
    for r in tabelle:
        righe = query(f"select * from {r['t']} where {r['col']} = '{u['id']}' order by 1")
        if not righe: continue
        nome = r['t'].replace('public.', '') + ('' if r['col'] in ('user_id', 'utente_id') else f"·{r['col']}")
        fogli.append((nome, righe, list(righe[0].keys())))
        conti[nome] = len(righe)
    cart = cartella_destinazione(dest)
    os.makedirs(cart, exist_ok=True)
    nome_file = re.sub(r'[^A-Za-z0-9_-]+', '_', (u.get('nome_cognome') or u.get('email') or u['id'])).strip('_')
    ora = datetime.now(ZoneInfo('Europe/Rome')).strftime('%Y-%m-%d_%H%M')
    percorso = os.path.join(cart, f"{nome_file}_{ora}.xlsx")
    scrivi_xlsx(percorso, fogli)
    print(f"✅ Esportato: {percorso}")
    print("   Fogli: utente" + ''.join(f" · {k} ({v})" for k, v in conti.items()))

if __name__ == '__main__':
    main()
