"""Import delle condivisioni di MB21 v3.0 (Sharing.csv, export Glide del 13/09/2026) nella tabella `condivisioni`.

Cantiere 40 lavoro 3, 22/09/2026. La condivisione si aggancia al contatto con `ContattoID` = `contatti.glide_id`,
a chi ha condiviso con `UtenteEmail` = `utenti.email` (in 5 righe su 109 non è il proprietario del contatto:
il registro dice chi ha condiviso davvero) e alla traccia con titolo + autore di `TracciaShare`
(«Titolo - Autore» oppure, nelle righe più vecchie, «Titolo (Autore)») = `materiali.titolo` + `materiali.autore`.
Le due tracce della vecchia versione del Media Sharing che non esistono più vengono aggiunte a `materiali`
come «fuori catalogo» (una condivisione ciascuna), così il registro è completo.
«Ascoltata» vuota = non ascoltata. `ascoltata_il` resta vuoto: Glide non lo sapeva.
Le righe importate hanno `da_glide = true`: rilanciando l'import si cancellano e si ricaricano solo quelle.
Scrive un file SQL (una transazione) fuori dal repo.

Uso:
  python3 scripts/import_condivisioni.py /percorso/fuori/dal/repo/condivisioni.sql          → si applica (commit)
  python3 scripts/import_condivisioni.py /percorso/fuori/dal/repo/condivisioni.sql prova    → si prova e si annulla (rollback)
  supabase db query --linked -f /percorso/fuori/dal/repo/condivisioni.sql
"""
import csv
import re
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

CARTELLA = '/Users/ignaziofiorito/mb21-import/'
ROMA = ZoneInfo('Europe/Rome')
# Tracce della vecchia versione del Media Sharing, non più sul sito né nel PDF: entrano in biblioteca fuori catalogo
VECCHIE = [('Maturare una consapevolezza fondata', 'Maria Grazia Pizzocri'),
           ('Cosa pensate di fare di questa vostra unica, selvaggia e preziosa vita', 'Alain Mazzari')]


def pulisci(s):
    return re.sub(r'\s+', ' ', s.replace('’', "'").replace('‘', "'")).strip()


def titolo_autore(v):
    """«Titolo - Autore» oppure «Titolo (Autore)» → (titolo, autore)."""
    v = pulisci(v)
    m = re.match(r'^(.*?)\s*\((.+)\)$', v) or re.match(r'^(.*?)\s+-\s+(.+)$', v)
    if not m:
        raise ValueError('traccia non capita: ' + v)
    return m.group(1).strip(), m.group(2).strip()


def giorno(v):
    """'2025-10-22T16:01:00.000Z' (UTC → ora di Roma) oppure '15/01/2026, 0:00:00' → 'AAAA-MM-GG'."""
    v = v.strip()
    if '/' in v:
        return datetime.strptime(v.split(',')[0], '%d/%m/%Y').strftime('%Y-%m-%d')
    return datetime.strptime(v[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc).astimezone(ROMA).strftime('%Y-%m-%d')


def q(v):
    return 'null' if v is None else "'" + v.replace("'", "''") + "'"


def leggi():
    with open(CARTELLA + 'Sharing.csv', encoding='utf-8-sig', newline='') as f:
        righe = list(csv.DictReader(f))
    out = []
    for r in righe:
        titolo, autore = titolo_autore(r['TracciaShare'])
        out.append({'glide_id': r['ContattoID'].strip(), 'email': r['UtenteEmail'].strip().lower(), 'titolo': titolo, 'autore': autore,
                    'data': giorno(r['DataCondivisione']), 'ascoltata': r['Ascoltata'].strip() == 'true',
                    'note': pulisci(r['Note'])[:300] or None})
    return out


if __name__ == '__main__':
    cond = leggi()
    prova = len(sys.argv) > 2 and sys.argv[2] == 'prova'
    vecchie = ',\n'.join(f"('traccia', {q(t)}, {q(a)}, 'ospite', true, array['Dare Seguito']::text[], "
                         f"'Vecchia versione del Media Sharing (da Glide): non più sul sito né nel PDF', true)" for t, a in VECCHIE)
    valori = ',\n'.join(f"({q(c['glide_id'])}, {q(c['email'])}, {q(c['titolo'])}, {q(c['autore'])}, date {q(c['data'])}, "
                        f"{'true' if c['ascoltata'] else 'false'}, {q(c['note'])})" for c in cond)
    sql = f"""begin;
delete from public.condivisioni where da_glide;
insert into public.materiali (tipo, titolo, autore, per_chi, fuori_catalogo, argomenti, note, da_import) values
{vecchie}
on conflict (tipo, titolo, coalesce(autore, '')) do nothing;
insert into public.condivisioni (user_id, contatto_id, materiale_id, condivisa_il, ascoltata, note, da_glide)
select u.id, c.id, m.id, v.data, v.ascoltata, v.note, true
from (values
{valori}
) as v(glide_id, email, titolo, autore, data, ascoltata, note)
join public.contatti c on c.glide_id = v.glide_id
join public.utenti u on lower(u.email) = v.email
join public.materiali m on m.tipo = 'traccia' and lower(m.titolo) = lower(v.titolo) and lower(m.autore) = lower(v.autore);
do $$ declare n int; begin
  select count(*) into n from public.condivisioni where da_glide;
  if n <> {len(cond)} then raise exception 'Condivisioni: % importate, attese {len(cond)}', n; end if;
end $$;
select 'A condivisioni ' || count(*) || ' · persone ' || count(distinct contatto_id) || ' · partner ' || count(distinct user_id) || ' · ascoltate ' || count(*) filter (where ascoltata) || ' · con note ' || count(*) filter (where note is not null) || ' · dal ' || min(condivisa_il) || ' al ' || max(condivisa_il) as r from public.condivisioni
union all select 'B ' || m.titolo || ' - ' || m.autore || ' → ' || count(*) from public.condivisioni k join public.materiali m on m.id = k.materiale_id group by m.titolo, m.autore
union all select 'C tracce fuori catalogo in biblioteca: ' || count(*) from public.materiali where fuori_catalogo and tipo = 'traccia'
order by 1;
{'rollback;' if prova else 'commit;'}
"""
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        f.write(sql)
    print('Condivisioni nel file:', len(cond), '· PROVA (rollback)' if prova else '· si applica (commit)')
