-- ═══════════════════════════════════════════════════════════
-- Cantiere 33 · Lavoro 1: ELIMINARE UN NOME SENZA PERDERE IL LAVORO FATTO
-- 19 settembre 2026 · decisioni 1-7 di Ignazio (CANTIERI.md → 33)
-- ═══════════════════════════════════════════════════════════
-- «Elimina» non cancella la riga: la scheda resta nel database con il segno `eliminato_il`, così azioni, vendite,
-- biglietti e CEP già fatti continuano a contare e nello storico (Report, Griglia PM, Agenda passata) si legge il nome.
--
-- Un eliminato è **un archiviato con il segno in più**: `elimina_contatto` lo mette in categoria 'Archiviato' e gli
-- toglie i collegamenti (codice Amway, utente dell'app). Così tutto quello che già lascia fuori gli archiviati o cerca
-- le schede dal codice (coda, conti dei nomi, avvio, Segni vitali propri, schede dei partner) lo lascia fuori da solo,
-- **senza toccare nessuna funzione**. Il solo posto che mostra gli archiviati è la vista `contatti_lista`
-- (Lista, filtri, ricerca, Archiviati, doppioni): lì si aggiunge `eliminato_il is null`. Lo stesso in `contatti_coda`.
--
-- Se ne vanno solo le azioni **senza esito** (appuntamenti e telefonate non ancora fatti, compresi Riordino e Consegna
-- nati dalle vendite). Biglietti e CEP restano e contano (decisione 5); li toglie solo l'Admin con la spunta
-- (decisione 6): biglietti dal mese in corso in poi, periodo CEP aperto chiuso alla fine del mese scorso.
-- Tutto quello che cambia è messo da parte in `eliminato_prima`: «Annulla» (`annulla_elimina_contatto`) rimette
-- la scheda com'era (decisione 4). Telefono, note e compleanno non si toccano (decisione 7).
--
-- Solo aggiunte, più il filtro nelle due viste. Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.contatti
  add column eliminato_il    timestamptz,   -- vuoto = c'è
  add column eliminato_prima jsonb;         -- com'era la scheda prima di «Elimina» (per «Annulla» e per un recupero dal database)

create index contatti_eliminati on public.contatti (eliminato_il) where eliminato_il is not null;

-- ── Elimina ────────────────────────────────────────────────
-- security invoker: valgono le regole di sempre (il proprietario della scheda e l'Admin).
create function public.elimina_contatto(p_contatto uuid, p_togli_segni boolean default false) returns void
language plpgsql security invoker set search_path = public as $$
declare
  c public.contatti;
  mese date := date_trunc('month', (now() at time zone 'Europe/Rome'))::date;
  v_prima jsonb;
begin
  select * into c from public.contatti where id = p_contatto and eliminato_il is null for update;
  if not found then raise exception 'Contatto non trovato'; end if;
  if p_togli_segni and not public.is_admin() then
    raise exception 'Biglietti e CEP li toglie solo l''Admin';
  end if;

  v_prima := jsonb_build_object(
    'categoria', c.categoria, 'categoria_prec', c.categoria_prec,
    'rientro_il', c.rientro_il, 'in_coda_dal', c.in_coda_dal,
    'codice_amway', c.codice_amway, 'utente_id', c.utente_id,
    'azioni', coalesce((select jsonb_agg(to_jsonb(a)) from public.azioni a
                         where a.contatto_id = p_contatto and not coalesce(a.completata, false)), '[]'::jsonb),
    'vendite', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'azione_riordino_id', v.azione_riordino_id,
                                                             'azione_consegna_id', v.azione_consegna_id))
                           from public.vendite v
                          where v.contatto_id = p_contatto
                            and (v.azione_riordino_id is not null or v.azione_consegna_id is not null)), '[]'::jsonb),
    'biglietti', case when p_togli_segni
                      then coalesce((select jsonb_agg(to_jsonb(b)) from public.biglietti b
                                      where b.contatto_id = p_contatto and b.evento >= mese), '[]'::jsonb)
                      else '[]'::jsonb end,
    'cep_chiusi', case when p_togli_segni
                       then coalesce((select jsonb_agg(p.id) from public.cep p
                                       where p.contatto_id = p_contatto and p.uscito_il is null), '[]'::jsonb)
                       else '[]'::jsonb end);

  -- il lavoro non ancora fatto se ne va (le vendite perdono da sole il collegamento: on delete set null)
  delete from public.azioni where contatto_id = p_contatto and not coalesce(completata, false);

  if p_togli_segni then
    delete from public.biglietti where contatto_id = p_contatto and evento >= mese;
    update public.cep set uscito_il = greatest(dal, mese - 1), aggiornato_il = now()
     where contatto_id = p_contatto and uscito_il is null;
  end if;

  update public.contatti set
    categoria_prec = case when categoria = 'Archiviato' then categoria_prec else categoria end,
    categoria = 'Archiviato', rientro_il = null, in_coda_dal = null,
    codice_amway = null, utente_id = null,
    eliminato_il = now(), eliminato_prima = v_prima, aggiornato_il = now()
  where id = p_contatto;
end $$;

-- ── Annulla ────────────────────────────────────────────────
create function public.annulla_elimina_contatto(p_contatto uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare
  c public.contatti;
  p jsonb;
  colonne text;
  v record;
begin
  select * into c from public.contatti where id = p_contatto and eliminato_il is not null for update;
  if not found then raise exception 'Contatto non eliminato'; end if;
  p := c.eliminato_prima;

  update public.contatti set
    categoria = p->>'categoria', categoria_prec = p->>'categoria_prec',
    rientro_il = (p->>'rientro_il')::date, in_coda_dal = (p->>'in_coda_dal')::date,
    codice_amway = p->>'codice_amway', utente_id = (p->>'utente_id')::uuid,
    eliminato_il = null, eliminato_prima = null, aggiornato_il = now()
  where id = p_contatto;

  -- le azioni tornano con lo stesso id (senza le colonne che il database calcola da solo, come `chiave`)
  if jsonb_array_length(p->'azioni') > 0 then
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into colonne
      from information_schema.columns
     where table_schema = 'public' and table_name = 'azioni' and is_generated = 'NEVER';
    execute format('insert into public.azioni (%s) select %s from jsonb_populate_recordset(null::public.azioni, $1)',
                   colonne, colonne) using p->'azioni';
  end if;
  for v in select * from jsonb_to_recordset(p->'vendite') as x(id uuid, azione_riordino_id uuid, azione_consegna_id uuid) loop
    update public.vendite set azione_riordino_id = v.azione_riordino_id, azione_consegna_id = v.azione_consegna_id
     where id = v.id;
  end loop;

  if jsonb_array_length(p->'biglietti') > 0 then
    insert into public.biglietti select * from jsonb_populate_recordset(null::public.biglietti, p->'biglietti');
  end if;
  update public.cep set uscito_il = null, aggiornato_il = now()
   where id in (select (jsonb_array_elements_text(p->'cep_chiusi'))::uuid);
end $$;

grant execute on function public.elimina_contatto(uuid, boolean) to authenticated;
grant execute on function public.annulla_elimina_contatto(uuid) to authenticated;

-- ── Le due viste: l'eliminato non c'è ──────────────────────
-- Stesse colonne di prima, scritte una per una (la vista è nata con `c.*` il 14/09: le colonne arrivate dopo non ci sono,
-- e riscrivere `c.*` oggi le infilerebbe in mezzo, cosa che `create or replace view` rifiuta).
create or replace view public.contatti_lista with (security_invoker = true) as
select c.id, c.user_id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria, c.area, c.brand,
       c.referral_di, c.note, c.rientro_il, c.glide_id, c.creato_il, c.aggiornato_il, c.in_coda_dal, c.categoria_prec,
       c.onb_amway, c.onb_ordine, c.onb_n21, c.onb_sogno, c.onb_starter_pack, c.onb_lista_start, c.onb_role_play,
       c.onb_contatti, c.onb_pack_ds, c.onb_bbs, c.onb_wes, c.onb_cep, c.onb_primo_pm, c.onb_primo_abo,
       p.nome        as partner,
       u.area        as ultima_area,
       u.modalita    as ultima_modalita,
       u.tipo_azione as ultimo_tipo,
       u.esito       as ultima_fase,
       u.inizio      as ultima_il,
       s.icona       as fase_icona,
       (select count(*) from public.azioni a where a.contatto_id = c.id and a.tipo_azione = 'Contatto') as contatti_fatti
from public.contatti c
join public.utenti p on p.id = c.user_id
left join lateral (
  select a.area, a.modalita, a.tipo_azione, a.esito, a.inizio, a.chiave
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
where c.eliminato_il is null;

-- La coda: uguale a quella del 18/09 (cantiere 27 lavoro 3), con il filtro in più.
create or replace view public.contatti_coda with (security_invoker = true) as
select c.id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria,
       c.rientro_il, c.in_coda_dal,
       u.esito        as ultima_fase,
       u.tipo_azione  as ultimo_tipo,
       u.inizio       as ultima_il,
       (u.id is not null) as contattato,
       s.giorni_rientro as ultimi_giorni,
       coalesce(s.coach, case when u.id is null then m.coach end) as coach,
       u.modalita     as ultima_modalita,
       coalesce(u.area, c.area) as ultima_area,
       c.user_id, c.creato_il, c.glide_id,
       (exists (select 1 from public.vendite v where v.contatto_id = c.id
                 and v.riordino >= (now() at time zone 'Europe/Rome')::date)
        or exists (select 1 from public.vendite v join public.azioni r on r.id = v.azione_riordino_id
                    where v.contatto_id = c.id and not coalesce(r.completata, false))
        or exists (select 1 from public.azioni r where r.contatto_id = c.id and r.tipo_azione = 'Contatto'
                    and r.esito = 'Riordino' and r.glide_id is not null and not coalesce(r.completata, false)
                    and (r.inizio at time zone 'Europe/Rome')::date >= date '2026-09-01')) as riordino_programmato
from public.contatti c
left join lateral (
  select a.id, a.esito, a.tipo_azione, a.inizio, a.chiave, a.modalita, a.area
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
left join public.sequenze m on m.chiave = 'Prospect-Contatto-Mai contattato o 2+ anni'
where (c.user_id = public.utente_corrente() or public.is_admin())
  and c.eliminato_il is null;
