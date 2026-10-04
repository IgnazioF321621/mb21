-- Nota Azioni 046, difetto 4 · elimina_contatto non scollegava il compagno/a: la scheda collegata (coppia, migrazione 20260916150136: le due schede
-- si puntano a vicenda) restava con `compagno_id` verso una persona eliminata (le targhette dei biglietti e i Segni del ramo la contavano ancora).
-- Ora elimina scrive nella copia chi la puntava (`compagno_di`), toglie il collegamento dall'altra scheda e, con «Annulla» (annulla_elimina_contatto),
-- lo rimette. Il resto delle due funzioni è uguale alla versione viva del 04/10. Chi chiama non cambia niente.
-- MODIFICA di due funzioni esistenti: con l'ok di Ignazio.

create or replace function public.elimina_contatto(p_contatto uuid, p_togli_segni boolean default false)
returns void
language plpgsql
set search_path to 'public'
as $function$
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
                       else '[]'::jsonb end,
    -- le schede che la puntano come compagno/a (nota 046): si scollegano, «Annulla» le ricollega
    'compagno_di', coalesce((select jsonb_agg(x.id) from public.contatti x where x.compagno_id = p_contatto), '[]'::jsonb));

  -- il lavoro non ancora fatto se ne va (le vendite perdono da sole il collegamento: on delete set null)
  delete from public.azioni where contatto_id = p_contatto and not coalesce(completata, false);

  if p_togli_segni then
    delete from public.biglietti where contatto_id = p_contatto and evento >= mese;
    update public.cep set uscito_il = greatest(dal, mese - 1), aggiornato_il = now()
     where contatto_id = p_contatto and uscito_il is null;
  end if;

  update public.contatti set compagno_id = null, aggiornato_il = now() where compagno_id = p_contatto;

  update public.contatti set
    categoria_prec = case when categoria = 'Archiviato' then categoria_prec else categoria end,
    categoria = 'Archiviato', rientro_il = null, in_coda_dal = null,
    codice_amway = null, utente_id = null,
    eliminato_il = now(), eliminato_prima = v_prima, aggiornato_il = now()
  where id = p_contatto;
end $function$;

create or replace function public.annulla_elimina_contatto(p_contatto uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
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

  -- il compagno/a torna collegato (nota 046); le copie di prima del 04/10 non hanno la voce: niente da fare
  update public.contatti set compagno_id = p_contatto, aggiornato_il = now()
   where id in (select (jsonb_array_elements_text(coalesce(p->'compagno_di', '[]'::jsonb)))::uuid)
     and compagno_id is null;
end $function$;
