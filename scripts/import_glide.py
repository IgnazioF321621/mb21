"""Import dei dati di MB21 v3.0 (export CSV di Glide) nelle tabelle di Supabase.

Legge i CSV da /Users/ignaziofiorito/mb21-import/ e scrive un unico file SQL
(una transazione) nel percorso passato come argomento. Il file SQL contiene
dati personali: va generato FUORI dal repo.

Si lancia solo su tabelle vuote: se trova righe, la transazione si annulla.

Uso:
  python3 scripts/import_glide.py /percorso/fuori/dal/repo/import.sql
  supabase db query --linked -f /percorso/fuori/dal/repo/import.sql
"""
import csv
import sys
import unicodedata
from datetime import datetime

CARTELLA = '/Users/ignaziofiorito/mb21-import/'
CATEGORIE = {'Ex Partner': 'Ex Partner/Cliente', 'Ex P/C': 'Ex Partner/Cliente'}


def leggi(nome):
    with open(CARTELLA + nome, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def pulisci(v):
    """Toglie i caratteri invisibili (es. ‬ nei telefoni copiati) e gli spazi ai bordi."""
    v = ''.join(c for c in (v or '') if unicodedata.category(c) != 'Cf').strip()
    return None if v in ('', '"-"') else v


def q(v):
    v = v if v is None or isinstance(v, bool) or isinstance(v, int) else pulisci(v)
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    return "'" + v.replace("'", "''") + "'"


def data(v):
    """'05/03/2026, 0:00:00' oppure '15/10/2025' (ora di Roma) → timestamptz."""
    v = pulisci(v)
    if not v:
        return 'null'
    d = datetime.strptime(v, '%d/%m/%Y, %H:%M:%S' if ',' in v else '%d/%m/%Y')
    return f"(timestamp '{d:%Y-%m-%d %H:%M:%S}' at time zone 'Europe/Rome')"


def sino(v):
    v = pulisci(v)
    return None if v is None else v == 'true'


def categoria(v):
    v = pulisci(v)
    return CATEGORIE.get(v, v)


def valori(righe):
    return ',\n'.join('(' + ', '.join(r) + ')' for r in righe)


utenti = leggi('User.csv')
sequenze = leggi('Sequenze.csv')
email_utenti = {r['UtenteEmail'] for r in utenti}
contatti = [r for r in leggi('Lista Nomi.csv') if r['UtenteEmail'] in email_utenti]  # fuori chi non è in User
azioni = leggi('Azioni.csv')
note = leggi('CoachNote.csv')

sql = ["begin;", """
do $$ begin
  if exists (select 1 from public.utenti) or exists (select 1 from public.contatti)
     or exists (select 1 from public.azioni) or exists (select 1 from public.sequenze)
     or exists (select 1 from public.coach_note) then
    raise exception 'Tabelle non vuote: import annullato';
  end if;
end $$;"""]

sql.append("insert into public.utenti (email, nome_cognome, nome, partner_id, ruolo, foto) values\n" + valori(
    [q(r['UtenteEmail']), q(r['NomeCognome']), q(r['FirstName']), q(r['PartnerID']), q(r['Ruolo']), q(r['Photo'])]
    for r in utenti) + ";")

sql.append("insert into public.sequenze (categoria, tipo_azione, fase, coach, giorni_rientro, icona, area, "
           "tipo_suggerimento, suggerimento_1, suggerimento_2, suggerimento_3) values\n" + valori(
    [q(r['Categoria_seq']), q(r['TipoAzione_seq']), q(r['Fase_seq']), q(r['Coach_seq']),
     q(int(r['GiorniRientro_seq'])) if pulisci(r['GiorniRientro_seq']) else 'null',
     q(r['Fase_ico']), q(r['Area_seq']), q(r['TipoSuggerim_seq']),
     q(r['Sugger.1_seq']), q(r['Sugger.2_seq']), q(r['Sugger.3_seq'])]
    for r in sequenze) + ";")

sql.append("insert into public.contatti (user_id, nome, professione, fascia_eta, citta, telefono, categoria, "
           "area, brand, referral_di, note, glide_id)\n"
           "select u.id, v.nome, v.professione, v.fascia_eta, v.citta, v.telefono, v.categoria, v.area, v.brand, "
           "v.referral_di, v.note, v.glide_id\nfrom (values\n" + valori(
    [q(r['UtenteEmail']), q(r['Nominativo']), q(r['Professione']), q(r['Fascia Età']), q(r['Località']),
     q(r['Telefono']), q(categoria(r['Categoria'])), q(r['Area']), q(r['Brand']), q(r['Referral di']),
     q(r['Note']), q(r['ContattoID'])]
    for r in contatti) +
    "\n) as v(email, nome, professione, fascia_eta, citta, telefono, categoria, area, brand, referral_di, note, glide_id)\n"
    "join public.utenti u on u.email = v.email;")

# categoria = categoria del contatto in Glide (Categoria<Lista): è quella che Glide usa nella chiave.
sql.append("insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, fine, "
           "completata, area, brand, ospite, note, coach_script, glide_id, creato_il)\n"
           "select u.id, c.id, v.categoria, v.tipo_azione, v.modalita, v.esito, v.inizio, v.fine, v.completata, "
           "v.area, v.brand, v.ospite, v.note, v.coach_script, v.glide_id, coalesce(v.creato_il, v.inizio, now())\n"
           "from (values\n" + valori(
    [q(r['UtenteEmail']), q(r['ContattoID']), q(categoria(r['Categoria<Lista'])), q(r['TipoAzione']),
     q(r['AzioneUnica']), q(r['EsitoUnico']), data(r['DataAzione']), data(r['DataAzione_end']),
     q(sino(r['Completed'])), q(r['Area']), q(r['Brand']), q(r['Ospite']), q(r['Note']),
     q(r['Coach_Script'] == 'true'), q(r['🔒 RowID']), data(r['DataCreazione'])]
    for r in azioni) +
    "\n) as v(email, contatto_glide, categoria, tipo_azione, modalita, esito, inizio, fine, completata, area, brand, "
    "ospite, note, coach_script, glide_id, creato_il)\n"
    "join public.utenti u on u.email = v.email\n"
    "join public.contatti c on c.glide_id = v.contatto_glide;")

sql.append("insert into public.coach_note (user_id, contatto_id, tipo_azione, testo, scritta_il)\n"
           "select u.id, c.id, v.tipo_azione, v.testo, coalesce(v.scritta_il, now())\nfrom (values\n" + valori(
    [q(r['Coach_UtenteEmail']), q(r['Coach_ContattoID']), q(r['Coach_TipoAzione']), q(r['Coach_Testo']),
     data(r['Coach_Data'])]
    for r in note) +
    "\n) as v(email, contatto_glide, tipo_azione, testo, scritta_il)\n"
    "join public.utenti u on u.email = v.email\n"
    "join public.contatti c on c.glide_id = v.contatto_glide;")

# Controllo finale: se i numeri non tornano con i CSV, la transazione si annulla.
attesi = {'utenti': len(utenti), 'sequenze': len(sequenze), 'contatti': len(contatti),
          'azioni': len(azioni), 'coach_note': len(note)}
sql.append("do $$ declare n bigint; begin\n" + '\n'.join(
    f"  select count(*) into n from public.{t}; if n <> {k} then raise exception '{t}: % righe, attese {k}', n; end if;"
    for t, k in attesi.items()) + "\nend $$;")
sql.append("commit;")

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(sql) + '\n')
print('Righe attese:', attesi)
