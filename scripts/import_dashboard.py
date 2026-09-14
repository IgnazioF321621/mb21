"""Import della Dashboard (Fase 3, 14/09/2026) dall'export Glide: Check del Giorno, obiettivi del mese, abbonamento.

Day.csv   → check_giorno   (una riga per check; più check sulla stessa data restano separati e si sommano)
Check.csv → obiettivi_mese (una riga per partner e mese)
User.csv  → utenti.abbonamento_scadenza (Abb_Preavviso + 7 giorni)

Scrive un file SQL (una transazione) nel percorso passato come argomento, da tenere fuori dal repo.
Rilanciabile: cancella prima le righe importate (check con glide_ora, obiettivi dei mesi dell'export).

Uso:
  python3 scripts/import_dashboard.py /percorso/fuori/dal/repo/dashboard.sql
  supabase db query --linked -f /percorso/fuori/dal/repo/dashboard.sql
"""
import csv
import sys
from datetime import datetime, timedelta

CARTELLA = '/Users/ignaziofiorito/mb21-import/'


def leggi(nome):
    with open(CARTELLA + nome, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def q(v):
    return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"


def numero(v, intero=False):
    v = (v or '').strip().replace(',', '.')
    if v == '':
        return None
    n = float(v)
    return str(round(n)) if intero else f'{n:.2f}'


def utente(email):
    return f"(select id from public.utenti where email = {q(email.strip().lower())})"


sql = ['begin;']

# ── check_giorno ──
CHECK = [('Contatti_day', 'contatti', True), ('PM_day', 'pm', True), ('SpoPers_day', 'sponsor_personali', True),
         ('SpoGruppo_day', 'sponsor_gruppo', True), ('VPClienti_day', 'vp_clienti', False), ('CEP_day', 'cep', True),
         ('BBS_day', 'bbs', True), ('WES_day', 'wes', True), ('Tracce_day', 'tracce', True), ('Pagine_day', 'pagine', True)]
day = leggi('Day.csv')
sql.append('delete from public.check_giorno where glide_ora is not null;')
for r in day:
    try:
        data = datetime.strptime(r['CheckDay'][:10], '%d/%m/%Y').date()
    except ValueError:   # una riga dell'export ha la data senza anno («28/02 53»): l'anno viene da MeseID
        data = datetime.strptime(r['CheckDay'][:5] + '/' + r['MeseID'][:4], '%d/%m/%Y').date()
    valori = [numero(r[g], intero) or '0' for g, _, intero in CHECK]
    sql.append(
        f"insert into public.check_giorno (user_id, data, {', '.join(c for _, c, _ in CHECK)}, libro, note_libro, glide_ora) values "
        f"({utente(r['UtenteEmail'])}, '{data}', {', '.join(valori)}, "
        f"{q(r['Libro'].strip() or None)}, {q(r['Libro_nota'].strip()[:150] or None)}, {q(r['CheckDay'])});")

# ── obiettivi_mese ──
OBIETTIVI = [('VPPtgt', 'vpp', False), ('VPVtgt', 'vpv', False), ('VPGtgt', 'vpg', False), ('ContattiTgt', 'contatti', True),
             ('PMtgt', 'pm', True), ('SpoPersTgt', 'sponsor_personali', True), ('SpoGrupTgt', 'sponsor_gruppo', True),
             ('BBStgt', 'bbs', True), ('WEStgt', 'wes', True), ('CEPtgt', 'cep', True), ('TracceTgt', 'tracce', True),
             ('PagineTgt', 'pagine', True), ('BBSstart', 'bbs_partenza', True), ('WESstart', 'wes_partenza', True),
             ('CEPstart', 'cep_partenza', True), ('VPPnow', 'vpp_amway', False), ('VPGnow', 'vpg_amway', False)]
chk = leggi('Check.csv')
for r in chk:
    mese = f"{r['MeseID'][:4]}-{r['MeseID'][4:]}-01"
    valori = [numero(r[g], intero) or 'null' for g, _, intero in OBIETTIVI]
    colonne = ', '.join(c for _, c, _ in OBIETTIVI)
    sql.append(f"delete from public.obiettivi_mese where user_id = {utente(r['UtenteEmail'])} and mese = '{mese}';")
    sql.append(f"insert into public.obiettivi_mese (user_id, mese, {colonne}) values "
               f"({utente(r['UtenteEmail'])}, '{mese}', {', '.join(valori)});")

# ── abbonamento ──
utenti = leggi('User.csv')
for r in utenti:
    if not r['Abb_Preavviso'].strip():
        continue
    scadenza = datetime.strptime(r['Abb_Preavviso'][:10], '%d/%m/%Y').date() + timedelta(days=7)
    sql.append(f"update public.utenti set abbonamento_scadenza = '{scadenza}' where email = {q(r['UtenteEmail'].strip().lower())};")

sql.append(f"""do $$ declare n int; m int; begin
  select count(*) into n from public.check_giorno where glide_ora is not null;
  if n <> {len(day)} then raise exception 'Check: % righe, attese {len(day)}', n; end if;
  select count(*) into m from public.obiettivi_mese;
  if m < {len(chk)} then raise exception 'Obiettivi: % righe, attese almeno {len(chk)}', m; end if;
end $$;""")
sql.append('commit;')

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql) + '\n')
print('Check del Giorno:', len(day), '· Obiettivi del mese:', len(chk),
      '· Abbonamenti:', sum(1 for r in utenti if r['Abb_Preavviso'].strip()))
