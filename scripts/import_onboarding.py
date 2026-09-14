"""Import dei 14 passi di Onboarding (colonne *_onb di Lista Nomi, export Glide) in `contatti`.

Fase 2, 14/09/2026: all'import iniziale la checklist era stata rimandata.
Scrive un file SQL (una transazione) nel percorso passato come argomento, da tenere fuori dal repo.

Uso:
  python3 scripts/import_onboarding.py /percorso/fuori/dal/repo/onboarding.sql
  supabase db query --linked -f /percorso/fuori/dal/repo/onboarding.sql
"""
import csv
import sys

CARTELLA = '/Users/ignaziofiorito/mb21-import/'
# colonna Glide → colonna contatti, nell'ordine della sezione Onboarding
PASSI = [
    ('Amway_onb', 'onb_amway'), ('Ordine_onb', 'onb_ordine'), ('N21_onb', 'onb_n21'),
    ('Sogno_onb', 'onb_sogno'), ('StarterPack_onb', 'onb_starter_pack'), ('ListaStart_onb', 'onb_lista_start'),
    ('RolePlay_onb', 'onb_role_play'), ('Contatti_onb', 'onb_contatti'), ('PackDS_onb', 'onb_pack_ds'),
    ('BBS_onb', 'onb_bbs'), ('WES_onb', 'onb_wes'), ('CEP_onb', 'onb_cep'),
    ('PrimoPM_onb', 'onb_primo_pm'), ('PrimoABO_onb', 'onb_primo_abo'),
]

with open(CARTELLA + 'Lista Nomi.csv', encoding='utf-8-sig', newline='') as f:
    righe = [r for r in csv.DictReader(f) if any(r[g].strip() for g, _ in PASSI)]

sql = ['begin;']
for r in righe:
    valori = ', '.join(f"{col} = {'true' if r[g].strip() == 'true' else 'false'}" for g, col in PASSI)
    glide_id = r['ContattoID'].replace("'", "''")
    sql.append(f"update public.contatti set {valori} where glide_id = '{glide_id}';")
sql.append(f"""do $$ declare n int; begin
  select count(*) into n from public.contatti where {' or '.join(col for _, col in PASSI)};
  if n > {len(righe)} then raise exception 'Onboarding: % contatti con passi, attesi al massimo {len(righe)}', n; end if;
end $$;""")
sql.append('commit;')

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql) + '\n')
print('Contatti con almeno un passo compilato:', len(righe))
