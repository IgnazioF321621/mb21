"""Riempie la biblioteca N21 (`materiali`) — cantiere 40, lavoro 2 (22/09/2026).

Fonti:
  - il rilievo `docs/MB21_N21_Materiali_come_e.md` (sito network21.it: pack, argomenti, «condivisibile», libri con autore),
    riportato qui sotto come dati;
  - il PDF «Media Sharing V2» sul Mac di Ignazio (fuori dal repo): oratore, durata, riassunto, punti chiave,
    «per chi è indicata» delle 40 tracce delle 4 fasi. Si legge con Ghostscript (`gs`), già installato;
  - l'elenco dei libri del Check (`MB21Dashboard.LIBRI` in dashboard.js): i titoli restano identici,
    perché `check_giorno.libro` li salva come testo.
I testi di Network 21 finiscono solo nel database: il repo è pubblico.

Le righe scritte hanno `da_import = true`: rilanciando lo script si cancellano e si ricaricano solo quelle,
quello che l'Admin aggiunge dall'app non si tocca. Scrive un file SQL (una transazione) fuori dal repo.

Uso:
  python3 scripts/import_materiali.py /percorso/fuori/dal/repo/materiali.sql          → si applica (commit)
  python3 scripts/import_materiali.py /percorso/fuori/dal/repo/materiali.sql prova    → si prova e si annulla (rollback)
  supabase db query --linked -f /percorso/fuori/dal/repo/materiali.sql
"""
import re
import subprocess
import sys
import tempfile
import unicodedata

PDF = '/Users/ignaziofiorito/Downloads/Amway & Network Marketing/Formazione/Media Sharing V2.pdf'
STRANIERI = {'Peter Matz', 'Bob Andrews', 'Mitch Sala', 'Jim Dornan', 'Skip Ross', 'Sean Henderson'}

# ── Media Sharing: i pack condivisibili e le tracce che contengono (rilievo del 22/09, dentro i pack) ──
# (titolo del pack, autore del pack, per chi, [tracce])  — le tracce senza autore lo prendono dal PDF
PACK = [
    ('Dare Seguito 1', None, 'ospite', ["L'impresa ideale", 'Siamo nel mondo reale', 'Il principio del percorso']),
    ('Dare Seguito 2', None, 'ospite', ['Sviluppate una vostra solida opinione', "L'attività si rivelerà a strati", "La rivoluzione dell'attività Amway"]),
    ('Le storie dei Diamanti Italiani', None, 'ospite', [('La storia', 'Natalia Gurini'), ('La storia', 'Alessio e Maria Grazia Nocentini'),
                                                         ('La storia', 'Aurelio Castelli'), ('La storia', 'Federica Martelli'), ('La storia', 'Massimo Bini')]),
    ('Perché investire il tuo tempo in questa attività', 'Alain Mazzari', 'ospite', ['Perché investire il tuo tempo in questa attività', 'Come avere successo in questa attività']),
    ('Il potere dei numeri', 'Enzo Capecchi', 'utente', ['Il potere dei numeri', ('Come superare i «no»', 'Enzo Capecchi'), 'Il gelato al mandarino', ('Non mollare mai', 'Enzo Capecchi')]),
    ("L'atteggiamento è tutto", 'Bob Andrews', 'utente', [("L'atteggiamento è tutto", 'Bob Andrews'), ('La mente del diamante', 'Bob Andrews'), ("L'ingrediente più importante del successo", 'Bob Andrews')]),
    ('La linea sottile', 'Massimo Bini', 'utente', ["L'atteggiamento mentale della persona di successo", ('Atteggiamento II', 'Massimo Bini'), 'La linea sottile']),
    ('Massimo risultato con il minimo sforzo', 'Enzo Capecchi', 'utente', ['Massimo risultato con il minimo sforzo', "L'atteggiamento fa la differenza", ('Rimuovete la più grande zavorra', 'Enzo Capecchi')]),
    ('Pensare da vincente', 'Massimo Bini', 'utente', ['Come sarà la vostra vita tra 10 anni', 'Prendere il controllo assegnando le priorità', 'Come superare le vostre paure', 'Pensare da vincente']),
    ('Sviluppare una mentalità di successo', 'Massimo Bini', 'utente', ['Sviluppare una mentalità imprenditoriale', 'Superare la paura del giudizio degli altri', "I tre fondamentali per costruire l'attività", 'Stesse Decisioni = Stessi Risultati']),
    ("Sviluppate l'abitudine di ascoltare i CD", 'Mitch Sala', 'utente', [("Sviluppate l'abitudine di ascoltare i CD", 'Mitch Sala')]),   # traccia unica in due parti (Ignazio 22/09)
    ('Valore e significatività', 'Alain Mazzari', 'utente', ['Valore e significatività', 'Il valore del CEP', 'La vostra attività inizia al Weekend Seminar']),
]
# Tracce condivisibili fuori da un pack (sul sito si comprano da sole)
SINGOLE = [
    ('Risposte per prendere la migliore decisione', 'ospite'),   # etichetta «Pack» sul sito solo per la versione inglese in omaggio
    ('Tempo e denaro', 'ospite'), ('Un equilibrio non comune', 'ospite'),
    ('Come organizzare un Piano in casa', 'utente', 'Massimo Bini'), ('Crescita personale', 'utente'),
    ('I primi passi per iniziare la vostra attività', 'utente'), ('Il potere del Sistema', 'utente'), ('Il ritmo del Sistema', 'utente'),
    ("L'opportunità sei tu", 'utente'), ('La risposta', 'utente'), ('Questa è la «tua» attività', 'utente'),
]
# Argomenti del sito per i materiali condivisibili (dal giro degli argomenti)
ARGOMENTI = {
    'Dare Seguito 1': ['Avvio', 'Dare Seguito'], 'Dare Seguito 2': ['Avvio', 'Dare Seguito'],
    'Le storie dei Diamanti Italiani': ['Ispirazione'], 'Perché investire il tuo tempo in questa attività': ['Dare Seguito'],
    'Risposte per prendere la migliore decisione': ['Dare Seguito'], 'Un equilibrio non comune': ['Dare Seguito'],
    'Tempo e denaro': ['Lista e Contatti'], 'La risposta': ['Dare Seguito'],
    'Come organizzare un Piano in casa': ['Avvio'], 'I primi passi per iniziare la vostra attività': ['Avvio'],
    "L'opportunità sei tu": ['Avvio'], 'Sviluppare una mentalità di successo': ['Avvio'], 'Valore e significatività': ['Avvio'],
    'Il potere dei numeri': ['Azione'], 'Massimo risultato con il minimo sforzo': ['Azione'], 'Questa è la «tua» attività': ['Azione'],
    'Crescita personale': ['Crescita personale'], "L'atteggiamento è tutto": ['Crescita personale'],
    'La linea sottile': ['Crescita personale'], 'Pensare da vincente': ['Crescita personale'],
    'Il potere del Sistema': ['Sistema'], 'Il ritmo del Sistema': ['Sistema'], "Sviluppate l'abitudine di ascoltare i CD": ['Sistema'],
}
# ── I materiali non condivisibili, interi (tipo, titolo, autore, per_chi, argomenti) — le tracce dentro i pack si aggiungono più avanti ──
STUDIO = [
    ('manuale', 'Manuale di Avvio', None, 'studio', ['Avvio']),
    ('pack', 'Starter Pack', None, 'studio', ['Avvio']), ('pack', 'Starter Pack Digitale', None, 'studio', ['Avvio']),
    ('altro', 'Piano Marketing Digitale', None, 'studio', ['Avvio', 'Piano Marketing']), ('altro', 'Piano Marketing Flipchart', None, 'studio', ['Avvio', 'Piano Marketing']),
    ('traccia', '12 punti per la sponsorizzazione efficace', 'Peter Matz', 'studio', ['Azione', 'Piano Marketing']),
    ('traccia', '8 passi per avere successo', 'Massimo Bini', 'studio', ['Azione']),
    ('pack', 'Fissare obiettivi', 'Sean Henderson', 'studio', ['Azione']),
    ('pack', 'Gettate le basi della vostra libertà', 'Mitch Sala', 'studio', ['Azione']),
    ('traccia', 'I nemici del successo', 'Massimo Bini', 'studio', ['Azione']),
    ('traccia', "L'abilità di costruire la profondità", 'Mitch Sala', 'studio', ['Azione']),
    ('pack', 'Peter Matz Collection', 'Peter Matz', 'studio', ['Azione']),
    ('pack', 'Postura', 'Jim Dornan', 'studio', ['Azione']),
    ('traccia', 'Creare volume affari', 'Aurelio Castelli', 'studio', ['Creare volume']),
    ('pack', '6 decisioni per attrarre il successo', 'Massimo Bini', 'studio', ['Crescita personale']),
    ('traccia', 'Brillare di luce propria', 'Massimo Bini', 'studio', ['Crescita personale']),
    ('pack', 'Dynamic Living', 'Skip Ross', 'studio', ['Crescita personale']),
    ('pack', 'Leadership', 'Bob Andrews', 'studio', ['Crescita personale']),
    ('pack', 'NextGen22', None, 'studio', ['Crescita personale', 'Ispirazione']),
    ('pack', 'Trilogia', 'Bob Andrews', 'studio', ['Crescita personale']),
    ('pack', 'Università dei Diamanti', 'Peter Matz', 'studio', ['Crescita personale']),
    ('pack', 'I principi del Dare Seguito', 'Jim Dornan', 'studio', ['Dare Seguito']),
    ('traccia', '5 punti per contatti efficaci', 'Jim Dornan', 'studio', ['Lista e Contatti']),
    ('traccia', 'Come approcciare e connettersi alle persone', 'Peter Matz', 'studio', ['Lista e Contatti']),
    ('traccia', 'Come trovare le persone', 'Bob Andrews', 'studio', ['Lista e Contatti']),
    ('pack', "L'abilità maestra", 'Elisabetta Bini', 'studio', ['Lista e Contatti']),
    ('traccia', 'Guidare le persone con maggiore efficacia', 'Jim Dornan', 'studio', ['Persone']),
    ('traccia', "L'abilità di connettersi alle persone", 'Massimo Bini', 'studio', ['Persone']),
    ('traccia', 'Le persone sono la nostra priorità', 'Massimo Bini', 'studio', ['Persone']),
    ('pack', 'Uscire dalla scatola', 'Skip Ross', 'studio', ['Persone']),
    ('traccia', 'Core ed il modulo di auto-valutazione', 'Massimo Bini', 'studio', ['Piano Marketing']),
    ('traccia', 'I principi del Sistema', 'Enzo Capecchi', 'studio', ['Sistema']),
    ('traccia', 'Come andare da Smeraldo a Diamante', 'Massimo Bini', 'avanzato', ['Training avanzato']),
    ('traccia', 'Desiderio-Impegno-Abilità-Persistenza', 'Massimo Bini', 'avanzato', ['Training avanzato']),
    ('pack', 'Foundations 101', 'Jim Dornan', 'avanzato', ['Training avanzato']),
    ('pack', 'Foundations 102', 'Jim Dornan', 'avanzato', ['Training avanzato']),
    ('traccia', 'Pensare e agire da Diamante', 'Michele e Federica Tarulli', 'avanzato', ['Training avanzato']),
    ('pack', 'Segni Vitali e profondità', 'Jim Dornan', 'avanzato', ['Training avanzato']),
    ('traccia', 'Sette passi per andare a Diamante', 'Massimo Bini', 'avanzato', ['Training avanzato']),
]
# ── I libri: i 44 titoli del Check (identici a `MB21Dashboard.LIBRI`) con l'autore dal sito ──
LIBRI = [
    ('Abitudini da un milione di dollari', 'Brian Tracy'), ('Cambia paradigma. Cambia la tua vita', 'Bob Proctor'), ('Ci vediamo sulla cima', 'Zig Ziglar'),
    ('Come parlare in pubblico e convincere gli altri', 'Dale Carnegie'), ('Come pensare da milionario', 'Mark Fisher e Marc Allen'),
    ('Come si diventa un venditore meraviglioso', 'Frank Bettger'), ('Come trattare gli altri e farseli amici', 'Dale Carnegie'),
    ('Come vincere lo stress e cominciare a vivere', 'Dale Carnegie'), ('Consigli da amico', 'Anthony Robbins'),
    ('È semplice, non ovvia', 'Jim Dornan'), ('Gioca le tue carte', 'James Borg'), ('Goals', 'Brian Tracy'),
    ('Hai diritto di essere ricco', 'Napoleon Hill'), ('I segreti della mente milionaria', 'T. Harv Eker'),
    ('Il pianoforte sulla spiaggia', 'Jim Dornan'), ('Il potere della mente', 'James Borg'), ('Il puzzle della vita', 'Jim Rohn'),
    ('Il segreto più strano', 'Earl Nightingale'), ('Il vantaggio della felicità', 'Shawn Achor'), ('Ingoia il rospo', 'Brian Tracy'),
    ('Intelligenza Emotiva', 'Daniel Goleman'), ('La magia di pensare in grande', 'David J. Schwartz'),
    ('La velocità della fiducia', 'Stephen M. R. Covey'), ('La vita è fantastica', 'Charlie T. Jones'),
    ('Le 21 leggi fondamentali del Leader', 'John Maxwell'), ('Le 7 regole per avere successo', 'Stephen Covey'),
    ('Le vostre zone erronee', 'Wayne W. Dyer'), ('Leadership e auto-inganno', 'The Arbinger Institute'), ('Limitless', 'Jim Kwik'),
    ('Massimo rendimento', 'Brian Tracy'), ('Mindset', 'Carol Dweck'), ('Niente scuse', 'Brian Tracy'),
    ('Partire dal perché', 'Simon Sinek'), ('Pensa e arricchisci te stesso', 'Napoleon Hill'),
    ('Piccole abitudini per grandi cambiamenti', 'James Clear'), ('Psicocibernetica', 'Maxwell Maltz'),
    ('Sette strategie per la ricchezza e la felicità', 'Jim Rohn'), ('Strategie per il successo', 'Jim Dornan'),
    ('Sviluppa la tua personalità', 'Florence Littauer'), ('Terre di diamanti', 'Russell Conwell'), ('The E-myth', 'Michael Gerber'),
    ('Tutti comunicano, pochi si connettono', 'John Maxwell'), ('Vivi una vita ispirata', 'Jim Rohn'), ('Libro no N21', None),
]
FUORI_CATALOGO = {'La velocità della fiducia', 'Tutti comunicano, pochi si connettono'}
SOLO_N21 = {'È semplice, non ovvia', 'Il pianoforte sulla spiaggia', 'Strategie per il successo', 'La magia di pensare in grande'}
ORDINE_LIBRO = {'Manuale di Avvio': 0, 'Come trattare gli altri e farseli amici': 1, 'Sviluppa la tua personalità': 1,
                'È semplice, non ovvia': 2, 'Il pianoforte sulla spiaggia': 3, 'Strategie per il successo': 3, 'La magia di pensare in grande': 3}
# IndiceBSM del CSV di Glide (per agganciare le condivisioni nel lavoro 3) e il link al sito
GLIDE = {
    'Tempo e denaro': (1, 295), "L'impresa ideale": (2, 364), 'Siamo nel mondo reale': (3, 440), 'Il principio del percorso': (4, 458),
    "L'attività si rivelerà a strati": (5, 637), 'Sviluppate una vostra solida opinione': (6, 745), "La rivoluzione dell'attività Amway": (7, 397),
    'Risposte per prendere la migliore decisione': (8, 761), 'Perché investire il tuo tempo in questa attività': (9, 226),
    'Come avere successo in questa attività': (10, 728), 'Un equilibrio non comune': (11, 400), 'La storia|Natalia Gurini': (12, 461),
    'La storia|Alessio e Maria Grazia Nocentini': (13, 232), 'La storia|Aurelio Castelli': (14, 495), 'La storia|Federica Martelli': (15, 693),
    'La storia|Massimo Bini': (16, 506), 'La risposta': (17, 349), 'I primi passi per iniziare la vostra attività': (18, 669),
    'Il ritmo del Sistema': (19, 299), 'Il valore del CEP': (20, 218), 'La vostra attività inizia al Weekend Seminar': (21, 562),
    'Superare la paura del giudizio degli altri': (22, None),
}


def pulisci(s):
    return (s.replace('ﬁ', 'fi').replace('ﬀ', 'ff').replace('ﬂ', 'fl').replace('’', "'").replace('‘', "'")
             .replace('“', '«').replace('”', '»'))


def chiave(s):
    s = unicodedata.normalize('NFD', pulisci(s).lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


def paragrafi(righe):
    """Le righe del PDF vanno a capo a metà frase: si riuniscono, tenendo a capo solo gli elenchi."""
    out = []
    for r in righe:
        r = r.strip()
        if not r:
            continue
        if out and not re.match(r'^(\d+\.|[•\-–])', r) and not re.search(r'[.:!?]$', out[-1]):
            out[-1] += ' ' + r
        else:
            out.append(r)
    return '\n'.join(out)


def leggi_pdf():
    """→ {chiave(titolo|oratore): dict(fase, ordine, titolo, oratore, minuti, riassunto, punti, per_chi)} e per titolo solo."""
    with tempfile.NamedTemporaryFile(suffix='.txt') as tmp:
        subprocess.run(['gs', '-q', '-dNOPAUSE', '-dBATCH', '-sDEVICE=txtwrite', '-sOutputFile=' + tmp.name, PDF],
                       check=True, capture_output=True)
        righe = [pulisci(re.sub(r'  +', ' ', l)).strip() for l in open(tmp.name, encoding='utf-8')]
    pagine, cur = [], []
    for r in righe:
        if re.search(r'Pagina \d+ di 44', r):
            pagine.append(cur)
            cur = []
        elif r:
            cur.append(r)
    tracce, fase, n = {}, 1, 0
    for p in pagine[1:]:
        if not p:
            continue
        if p[0] == 'Media Sharing':
            fase, n = int(p[2].replace('FASE #', '')), 0
            continue
        titolo, oratore, durata = p[0], p[1], p[2]
        n += 1
        testo = '\n'.join(p[3:])

        def sezione(a, b):
            m = re.search(re.escape(a) + r'\s*\n(.*?)(?:\n' + re.escape(b) + r'\s*(?:\n|$)|\Z)', testo, re.S) if b else re.search(re.escape(a) + r'\s*\n(.*)', testo, re.S)
            return paragrafi(m.group(1).split('\n')) if m else None
        t = dict(fase=fase, ordine=n, titolo=titolo, oratore=oratore, minuti=int(durata.split()[0]),
                 riassunto=sezione('Breve riassunto', 'Punti chiave') or sezione('Breve riassunto', 'Per chi è indicata questa traccia'),
                 punti=sezione('Punti chiave', 'Per chi è indicata questa traccia'),
                 per_chi=sezione('Per chi è indicata questa traccia', None))
        tracce[chiave(titolo + '|' + oratore)] = t
        tracce.setdefault(chiave(titolo), t)
    assert sum(1 for k in tracce if '|' in k or True) >= 40
    return tracce


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return 'array[' + ', '.join(q(x) for x in v) + ']::text[]' if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def riga(tipo, titolo, autore=None, **c):
    campi = dict(tipo=tipo, titolo=titolo, autore=autore, per_chi=None, fase=None, ordine=None, straniero=autore in STRANIERI,
                 solo_donne=False, solo_n21=False, fuori_catalogo=False, ordine_libro=None, minuti=None, riassunto=None,
                 punti_chiave=None, per_chi_testo=None, argomenti=[], link=None, glide_indice=None, note=None)
    campi.update(c)
    return campi


def costruisci():
    pdf = leggi_pdf()
    trovate = set()
    righe, tracce = [], []   # righe = pack e materiali interi; tracce = con il pack di appartenenza (titolo del pack)

    def traccia(voce, per_chi, pack):
        titolo, autore = (voce if isinstance(voce, tuple) else (voce, None))
        t = pdf.get(chiave(titolo + '|' + autore)) if autore else pdf.get(chiave(titolo))
        if t:
            trovate.add(id(t))
            autore = autore or t['oratore']
        g = GLIDE.get(titolo + '|' + autore) or GLIDE.get(titolo)
        r = riga('traccia', titolo, autore, per_chi=per_chi, argomenti=ARGOMENTI.get(pack or titolo, []),
                 glide_indice=g[0] if g else None, link=f'https://network21.it/bsm/product/{g[1]}' if g and g[1] else None,
                 note=None if t else 'Sul sito ma non nel PDF «Media Sharing V2»: senza fase (Ignazio 22/09)')
        if t:
            r.update(fase=t['fase'], ordine=0 if titolo == 'Tempo e denaro' else t['ordine'], minuti=t['minuti'], riassunto=t['riassunto'],
                     punti_chiave=t['punti'], per_chi_testo=t['per_chi'],
                     solo_donne=bool(re.search(r'pubblico femminile', t['per_chi'] or '', re.I)))
        if titolo == "Sviluppate l'abitudine di ascoltare i CD":
            r['note'] = 'Traccia unica in due parti (parte 1 e parte 2), Ignazio 22/09. Sul sito ma non nel PDF: senza fase'
        if titolo == 'Tempo e denaro':
            r['note'] = 'Passo 1 consigliato della fase #1 (Ignazio 22/09: «la regola consigliata, ma non sempre fatta»); nel PDF è l\'ultima'
        tracce.append((r, pack))

    for titolo, autore, per_chi, voci in PACK:
        righe.append(riga('pack', titolo, autore, per_chi=per_chi, argomenti=ARGOMENTI.get(titolo, []),
                          note='Le storie dei leader Diamante e oltre (il sito non elenca le tracce)' if 'Diamanti' in titolo else None))
        for v in voci:
            traccia(v, per_chi, titolo)
    for s in SINGOLE:
        traccia((s[0], s[2]) if len(s) > 2 else s[0], s[1], None)
    assert len(trovate) == 40, f'tracce del PDF trovate: {len(trovate)}'
    for tipo, titolo, autore, per_chi, arg in STUDIO:
        righe.append(riga(tipo, titolo, autore, per_chi=per_chi, argomenti=arg, ordine_libro=ORDINE_LIBRO.get(titolo),
                          note='Arriva con lo Starter Pack: la prima cosa da leggere e studiare' if tipo == 'manuale' else None))
    for titolo, autore in LIBRI:
        righe.append(riga('libro', titolo, autore, solo_n21=titolo in SOLO_N21, fuori_catalogo=titolo in FUORI_CATALOGO,
                          ordine_libro=ORDINE_LIBRO.get(titolo), argomenti=['Libri consigliati'] if autore else [],
                          note='Voce jolly del Check per un libro fuori dai consigliati' if autore is None else
                               ('Non più tra i consigliati del sito (21/09), resta per scelta di Ignazio' if titolo in FUORI_CATALOGO else
                                ('Si trova solo da Network 21, non in libreria né online' if titolo in SOLO_N21 else
                                 ('Sul sito «Il venditore meraviglioso»' if titolo.startswith('Come si diventa') else None)))))
    return righe, tracce


COLONNE = ['tipo', 'titolo', 'autore', 'per_chi', 'fase', 'ordine', 'straniero', 'solo_donne', 'solo_n21', 'fuori_catalogo',
           'ordine_libro', 'minuti', 'riassunto', 'punti_chiave', 'per_chi_testo', 'argomenti', 'link', 'glide_indice', 'note']


def valori(r):
    return '(' + ', '.join(q(r[c]) for c in COLONNE) + ', true)'


if __name__ == '__main__':
    righe, tracce = costruisci()
    n_pack = sum(1 for r in righe if r['tipo'] == 'pack')
    attese = len(righe) + len(tracce)
    ins = f"insert into public.materiali ({', '.join(COLONNE)}, da_import) values\n" + ',\n'.join(valori(r) for r in righe) + ';\n'
    for r, pack in tracce:
        sel = f"(select id from public.materiali where tipo = 'pack' and titolo = {q(pack)})" if pack else 'null'
        ins += f"insert into public.materiali ({', '.join(COLONNE)}, da_import, pack_id) values\n{valori(r)[:-1]}, {sel});\n"
    prova = len(sys.argv) > 2 and sys.argv[2] == 'prova'
    sql = f"""begin;
delete from public.materiali where da_import;
{ins}
do $$ declare n int; begin
  select count(*) into n from public.materiali where da_import;
  if n <> {attese} then raise exception 'Materiali: % scritti, attesi {attese}', n; end if;
  select count(*) into n from public.materiali where tipo = 'traccia' and fase is not null;
  if n <> 40 then raise exception 'Tracce del PDF con fase: %, attese 40', n; end if;
  select count(*) into n from public.materiali where tipo = 'traccia' and per_chi in ('ospite', 'utente');
  if n <> 49 then raise exception 'Tracce del Media Sharing: %, attese 49', n; end if;
end $$;
select tipo, per_chi, count(*) from public.materiali group by 1, 2 order by 1, 2;
select fase, count(*), string_agg(titolo, ' · ' order by ordine) from public.materiali where tipo = 'traccia' and fase is not null group by fase order by fase;
select p.titolo as pack, count(t.id) as tracce from public.materiali p join public.materiali t on t.pack_id = p.id group by p.titolo order by 1;
select count(*) filter (where straniero) as straniere, count(*) filter (where solo_donne) as solo_donne, count(*) filter (where solo_n21) as solo_n21, count(*) filter (where riassunto is not null) as con_riassunto from public.materiali;
{'rollback;' if prova else 'commit;'}
"""
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"Materiali nel file: {attese} = {n_pack} pack + {len(tracce)} tracce condivisibili + {len(righe) - n_pack - len(LIBRI)} materiali interi + {len(LIBRI)} libri",
          '· PROVA (rollback)' if prova else '· si applica (commit)')
