"""Import delle vendite di MB21 v3.0 (Vendite.csv, export Glide) nella tabella `vendite`.

Cantiere 26 lavoro 2, 18/09/2026. La vendita si aggancia al contatto con `ClienteID` = `contatti.glide_id`
e prende il `user_id` del contatto. Le righe importate hanno `da_glide = true`: rilanciando l'import
si cancellano e si ricaricano solo quelle, le vendite scritte nell'app non si toccano.
Scrive un file SQL (una transazione) nel percorso passato come argomento, da tenere fuori dal repo.

Uso:
  python3 scripts/import_vendite.py /percorso/fuori/dal/repo/vendite.sql
  supabase db query --linked -f /percorso/fuori/dal/repo/vendite.sql
"""
import csv
import sys
from datetime import datetime

CARTELLA = '/Users/ignaziofiorito/mb21-import/'
BRAND = {'Nutrilite': 'Nutrilite/XS'}  # due scritture dello stesso brand: nel modulo c'è solo «Nutrilite/XS»


def giorno(v):
    """'19/09/2025, 19:00:00' oppure '2026-08-31T…' → 'AAAA-MM-GG' (vuoto → None)."""
    v = (v or '').strip()
    if not v:
        return None
    if '/' in v:
        return datetime.strptime(v.split(',')[0], '%d/%m/%Y').strftime('%Y-%m-%d')
    return datetime.strptime(v[:10], '%Y-%m-%d').strftime('%Y-%m-%d')


def numero(v):
    v = (v or '').strip().replace(',', '.')
    return float(v) if v else 0.0


def q(v):
    return 'null' if v is None else "'" + v.replace("'", "''") + "'"


def leggi():
    with open(CARTELLA + 'Vendite.csv', encoding='utf-8-sig', newline='') as f:
        righe = list(csv.DictReader(f))
    return [{
        'email': r['UserEmail'].strip().lower(),
        'glide_id': r['ClienteID'].strip(),
        'data': giorno(r['DataVendita']),
        'brand': BRAND.get(r['Brand_vnd'].strip(), r['Brand_vnd'].strip()),
        'prodotto': r['Prodotto_vnd'].strip(),
        'vp': numero(r['VPVendita_vnd']),
        'sconto': numero(r['Sconto_vnd']),
        'riordino': giorno(r['DataRiordino']),
    } for r in righe]


if __name__ == '__main__':
    vendite = leggi()
    valori = ',\n'.join(
        f"({q(v['glide_id'])}, date {q(v['data'])}, {q(v['brand'])}, {q(v['prodotto'][:50])}, "
        f"{v['vp']:.2f}, {v['sconto']:.2f}, {'null' if v['riordino'] is None else 'date ' + q(v['riordino'])})"
        for v in vendite)
    sql = f"""begin;
delete from public.vendite where da_glide;
insert into public.vendite (user_id, contatto_id, data, brand, prodotto, vp, sconto, riordino, da_glide)
select c.user_id, c.id, v.data, v.brand, v.prodotto, v.vp, v.sconto, v.riordino, true
from (values
{valori}
) as v(glide_id, data, brand, prodotto, vp, sconto, riordino)
join public.contatti c on c.glide_id = v.glide_id;
do $$ declare n int; begin
  select count(*) into n from public.vendite where da_glide;
  if n <> {len(vendite)} then raise exception 'Vendite: % importate, attese {len(vendite)}', n; end if;
end $$;
commit;
"""
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        f.write(sql)
    print('Vendite nel file:', len(vendite))
