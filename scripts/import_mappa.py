"""Import della Mappa (Fase 8, 16/09/2026): l'albero Amway e i volumi mese per mese.

File Amway del mese (`<data>_<mese>.csv`, scaricato dalla LOS di amway.it) → squadra + volumi_mese di quel mese.
`LOS.csv` dell'export di Glide                                            → volumi_mese dei mesi passati (VPP, VPG, bonus).

Il file Amway è CONFIDENZIALE (telefoni ed email di tutti): sta fuori dal repo, e anche l'SQL che esce di qui.
Rilanciabile: riscrive le righe con `on conflict`, non cancella niente.

Uso:
  python3 scripts/import_mappa.py ~/Downloads/16092026_202609.csv /percorso/fuori/dal/repo/mappa.sql
  supabase db query --linked -f /percorso/fuori/dal/repo/mappa.sql
"""
import csv
import sys

LOS = '/Users/ignaziofiorito/mb21-import/LOS.csv'
MESI = {'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6,
        'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12}


def pulisci(v):
    """Toglie l'apostrofo che Amway mette davanti a ogni valore."""
    return (v or '').strip().lstrip("'").strip()


def testo(v):
    v = pulisci(v)
    return 'null' if v == '' else "'" + v.replace("'", "''") + "'"


def numero(v):
    """539,93 → 539.93 · 1221.23 → 1221.23 · 3% → 3 · vuoto → null."""
    v = pulisci(v).replace('%', '').replace(' ', '')
    if v == '':
        return 'null'
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    try:
        float(v)
    except ValueError:
        return 'null'
    return v


def data(v):
    """'15 marzo 2010' → date '2010-03-15'."""
    p = pulisci(v).split()
    if len(p) != 3 or p[1].lower() not in MESI:
        return 'null'
    return f"'{int(p[2]):04d}-{MESI[p[1].lower()]:02d}-{int(p[0]):02d}'"


def amway(percorso):
    with open(percorso, encoding='utf-8-sig', newline='') as f:
        righe = list(csv.reader(f))
    mese = None
    for r in righe[:3]:
        if r and r[0].strip().lower().startswith('mese di competenza'):
            mese = int(pulisci(r[1]))
    if mese is None:
        sys.exit('Nel file Amway manca "Mese di competenza"')
    intestazione = next(i for i, r in enumerate(righe) if r and r[0].strip() == 'Qualifica Amway Partner')
    dati = [dict(zip(righe[intestazione], r)) for r in righe[intestazione + 1:] if any(c.strip() for c in r)]
    return mese, dati


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    mese, dati = amway(sys.argv[1])
    fuori = open(sys.argv[2], 'w', encoding='utf-8')
    w = fuori.write
    w(f'-- Mappa: albero e volumi. File Amway del mese {mese}, {len(dati)} partner.\n')
    w('begin;\n\n')

    for d in dati:
        w("insert into public.squadra (partner_id, sponsor_id, nome, livello, data_ingresso, telefono, email, indirizzo, data_rinnovo) values ("
          f"{testo(d['Codice Amway Partner'])}, {testo(d['Codice Amway Partner Sponsor'])}, {testo(d['Nome'])}, "
          f"{numero(d['Qualifica Amway Partner'])}, {data(d['Data di ingresso'])}, {testo(d['Telefono'])}, "
          f"{testo(d['Email'])}, {testo(d['Indirizzo'])}, {data(d['Data di rinnovo'])})\n"
          " on conflict (partner_id) do update set sponsor_id = excluded.sponsor_id, nome = excluded.nome,"
          " livello = excluded.livello, data_ingresso = excluded.data_ingresso, telefono = excluded.telefono,"
          " email = excluded.email, indirizzo = excluded.indirizzo, data_rinnovo = excluded.data_rinnovo,"
          " aggiornato_il = now();\n")
    w('\n')

    for d in dati:
        w("insert into public.volumi_mese (partner_id, mese, vpp, vpg, bonus, vvg, vp_cliente, vp_rubino, clienti,"
          " al_livello_successivo, dimensioni_gruppo, ordini, ordini_multicarrello, vpp_annuali, vp_organizzazione) values ("
          f"{testo(d['Codice Amway Partner'])}, {mese}, {numero(d['VPP'])}, {numero(d['VPG'])}, {numero(d['Percentuale di bonus'])},"
          f" {numero(d['VVG'])}, {numero(d['VP Cliente'])}, {numero(d['VP Rubino'])}, {numero(d[' Clienti'])},"
          f" {numero(d['Punti al livello successivo'])}, {numero(d['Dimensioni gruppo'])}, {numero(d['Numero ordini personali'])},"
          f" {numero(d['Numero ordini multicarrello'])}, {numero(d['VPP annuali'])}, {numero(d['Totale VP organizzazione'])})\n"
          " on conflict (partner_id, mese) do update set vpp = excluded.vpp, vpg = excluded.vpg, bonus = excluded.bonus,"
          " vvg = excluded.vvg, vp_cliente = excluded.vp_cliente, vp_rubino = excluded.vp_rubino, clienti = excluded.clienti,"
          " al_livello_successivo = excluded.al_livello_successivo, dimensioni_gruppo = excluded.dimensioni_gruppo,"
          " ordini = excluded.ordini, ordini_multicarrello = excluded.ordini_multicarrello, vpp_annuali = excluded.vpp_annuali,"
          " vp_organizzazione = excluded.vp_organizzazione, aggiornato_il = now();\n")

    # ── Storico dall'export di Glide (solo i mesi che non sono quello del file Amway)
    noti = {pulisci(d['Codice Amway Partner']) for d in dati}
    with open(LOS, encoding='utf-8-sig', newline='') as f:
        los = list(csv.DictReader(f))
    scritte, saltate = 0, set()
    w('\n')
    for r in los:
        pid, m = pulisci(r['Partner_ID']), pulisci(r['Mese_ID'])
        if not pid or not m or int(m) == mese:
            continue
        if pid not in noti:
            saltate.add(pid)
            continue
        w("insert into public.volumi_mese (partner_id, mese, vpp, vpg, bonus) values ("
          f"'{pid}', {int(m)}, {numero(r['VPP'])}, {numero(r['VPG'])}, {numero(r['Bonus'])})\n"
          " on conflict (partner_id, mese) do nothing;\n")
        scritte += 1

    w('\ncommit;\n')
    fuori.close()
    print(f'Partner: {len(dati)} · mese del file: {mese} · righe di storico da LOS.csv: {scritte}')
    if saltate:
        print(f'Saltati {len(saltate)} partner presenti in LOS.csv ma non nel file Amway di oggi: {sorted(saltate)}')


main()
