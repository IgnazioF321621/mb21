-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 030) · soluzione B: la funzione «avvisi» parte solo se c'è qualcosa da avvisare
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Idea (Ignazio 02/10): il controllo ogni 5 minuti lo fa prima il database con una domanda leggera, e la funzione Edge parte
-- solo se questa risponde «sì». Così le chiamate non crescono con il numero di utenti ma con gli avvisi veri.
--
-- `promemoria_da_mandare(p_adesso)` dice «sì» se esiste almeno UNA cosa ancora da avvisare, per la scelta di ognuno
-- (utenti.avvisi_quando; già impostato appuntamenti 30 · telefonate 15 · cose 15 · modelli 15, come GIA_IMPOSTATO in regole.ts):
--   · appuntamento (azione non «Contatto», non completata) e PM / Appuntamento fissati dalla coda (data_scelta): azioni.promemoria_il vuoto
--   · telefonata in agenda (Contatto, non completata, senza esito, non di Riordino): promemoria_il vuoto
--   · cosa da fare con l'ora (scritta a mano, scala giorno, non fatta) e voce di un modello (modello e voce accesi, scala giorno,
--     giorno della settimana giusto, ora della riga del giorno se spostata «solo oggi»): senza il segno in avvisi_mandati
-- e «è il momento» come `eMomentoPrima` (regole.ts): da N minuti prima fino all'inizio (con N = 0 fino a 5 minuti dopo).
-- È una domanda che può dire «sì» di troppo (la funzione poi decide, e se non c'è niente non manda niente), mai «no» di troppo:
-- se cambiano le regole in regole.ts, vanno cambiate anche qui. Provata con dati finti in una prova annullata (vedi STRUTTURA.md).
-- Non tocca nessun dato. Solo il database la chiama (cron): nessun permesso all'app.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

create or replace function public.promemoria_da_mandare(p_adesso timestamptz default now()) returns boolean
language sql stable security definer set search_path = public as $$
  with scelte as (   -- i minuti prima di ognuno (chi non ha scelto: il «già impostato»)
    select id,
      coalesce((avvisi_quando ->> 'appuntamenti')::int, 30) as appuntamenti,
      coalesce((avvisi_quando ->> 'telefonate')::int, 15) as telefonate,
      coalesce((avvisi_quando ->> 'cose')::int, 15) as cose,
      coalesce((avvisi_quando ->> 'modelli')::int, 15) as modelli
    from public.utenti
  ),
  giorni as (   -- oggi e domani a Roma (a mezzanotte la prima cosa di domani è già «tra un'ora»)
    select ((p_adesso at time zone 'Europe/Rome')::date + n) as g from generate_series(0, 1) n
  )
  select
    exists (   -- appuntamenti veri
      select 1 from public.azioni a join scelte s on s.id = a.user_id
      where a.tipo_azione <> 'Contatto' and a.completata = false and a.promemoria_il is null
        and a.inizio - s.appuntamenti * interval '1 minute' <= p_adesso
        and p_adesso < a.inizio + (case when s.appuntamenti = 0 then interval '5 minutes' else interval '0' end))
    or exists (   -- PM e Appuntamento fissati dalla coda
      select 1 from public.azioni a join scelte s on s.id = a.user_id
      where a.tipo_azione = 'Contatto' and a.esito in ('PM Fissato', 'Appuntamento') and a.promemoria_il is null and a.data_scelta is not null
        and a.data_scelta - s.appuntamenti * interval '1 minute' <= p_adesso
        and p_adesso < a.data_scelta + (case when s.appuntamenti = 0 then interval '5 minutes' else interval '0' end))
    or exists (   -- telefonate in agenda (senza quelle di Riordino, che crea l'app da una vendita)
      select 1 from public.azioni a join scelte s on s.id = a.user_id
      where a.tipo_azione = 'Contatto' and a.completata = false and a.esito is null and a.promemoria_il is null
        and a.inizio - s.telefonate * interval '1 minute' <= p_adesso
        and p_adesso < a.inizio + (case when s.telefonate = 0 then interval '5 minutes' else interval '0' end)
        and not exists (select 1 from public.vendite v where v.azione_riordino_id = a.id))
    or exists (   -- cose da fare con l'ora, scritte a mano
      select 1 from public.cose_da_fare c join scelte s on s.id = c.user_id
      cross join lateral (select ((c.giorno + c.ora) at time zone 'Europe/Rome') as inizio) t
      where c.ora is not null and c.fatto_il is null and c.modello_id is null and c.core is null and coalesce(c.scala, 'giorno') = 'giorno'
        and c.giorno in (select g from giorni)
        and t.inizio - s.cose * interval '1 minute' <= p_adesso
        and p_adesso < t.inizio + (case when s.cose = 0 then interval '5 minutes' else interval '0' end)
        and not exists (select 1 from public.avvisi_mandati m where m.chiave = 'cosa:' || c.id || ':' || c.giorno || ':' || to_char(c.ora, 'HH24:MI')))
    or exists (   -- voci dei modelli
      select 1
      from public.modello_giorno v
      join public.modelli mo on mo.id = v.modello_id and mo.attivo is not false and coalesce(mo.scala, 'giorno') = 'giorno'
      join scelte s on s.id = v.user_id
      cross join giorni gg
      left join lateral (select c2.ora, c2.fatto_il from public.cose_da_fare c2 where c2.modello_id = v.id and c2.giorno = gg.g limit 1) d on true
      cross join lateral (select coalesce(d.ora, v.ora) as ora) o
      cross join lateral (select ((gg.g + o.ora) at time zone 'Europe/Rome') as inizio) t
      where v.core is null and v.attivo is not false and v.modello_id is not null and o.ora is not null and d.fatto_il is null
        and (v.giorni is null or cardinality(v.giorni) = 0 or extract(isodow from gg.g)::int = any (v.giorni))
        and t.inizio - s.modelli * interval '1 minute' <= p_adesso
        and p_adesso < t.inizio + (case when s.modelli = 0 then interval '5 minutes' else interval '0' end)
        and not exists (select 1 from public.avvisi_mandati m where m.chiave = 'voce:' || v.id || ':' || gg.g || ':' || to_char(o.ora, 'HH24:MI')))
$$;

revoke all on function public.promemoria_da_mandare(timestamptz) from public, anon, authenticated;
