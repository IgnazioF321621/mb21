-- Nota Azioni 046, difetti 2 e 3 · archivia_contatto lasciava in Agenda le azioni ancora da fare della persona archiviata; ripristina_contatto
-- rimetteva «torna in coda oggi» solo ai Prospect (perdendo il rientro di prima) e niente a Partner e Clienti.
-- Ora archivia fa come elimina (migrazione 20260919143544): tiene una copia (colonna nuova `contatti.archiviato_prima`: rientro, coda, azioni
-- aperte, legami con le vendite), toglie le azioni aperte dall'Agenda e archivia. Ripristina rimette tutto com'era dalla copia: la categoria, il
-- rientro di prima, le azioni con lo stesso id, i legami con le vendite. Senza copia (archiviati prima di oggi) torna in coda da oggi, per
-- ogni categoria. Chi chiama non cambia niente (stesse firme).
-- Colonna nuova = aggiunta; le due funzioni = MODIFICA di funzioni esistenti: con l'ok di Ignazio.

alter table public.contatti add column if not exists archiviato_prima jsonb;
comment on column public.contatti.archiviato_prima is 'Com''era la persona quando è stata archiviata (rientro, coda, azioni aperte, legami vendite): la usa ripristina_contatto (nota Azioni 046, 04/10/2026)';

create or replace function public.archivia_contatto(p_contatto uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  c public.contatti;
  v_prima jsonb;
begin
  select * into c from public.contatti where id = p_contatto for update;
  if not found then raise exception 'Contatto non trovato'; end if;

  if c.categoria <> 'Archiviato' or c.categoria is null then
    v_prima := jsonb_build_object(
      'rientro_il', c.rientro_il, 'in_coda_dal', c.in_coda_dal,
      'azioni', coalesce((select jsonb_agg(to_jsonb(a)) from public.azioni a
                           where a.contatto_id = p_contatto and not coalesce(a.completata, false)), '[]'::jsonb),
      'vendite', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'azione_riordino_id', v.azione_riordino_id,
                                                               'azione_consegna_id', v.azione_consegna_id))
                             from public.vendite v
                            where v.contatto_id = p_contatto
                              and (v.azione_riordino_id is not null or v.azione_consegna_id is not null)), '[]'::jsonb));
    -- il lavoro non ancora fatto esce dall'Agenda (le vendite perdono da sole il collegamento: on delete set null; la copia lo rimette)
    delete from public.azioni where contatto_id = p_contatto and not coalesce(completata, false);
  end if;

  update public.contatti set
    categoria_prec = case when categoria = 'Archiviato' then categoria_prec else categoria end,
    categoria = 'Archiviato', rientro_il = null, in_coda_dal = null,
    archiviato_prima = coalesce(v_prima, archiviato_prima), aggiornato_il = now()
  where id = p_contatto;
end $function$;

create or replace function public.ripristina_contatto(p_contatto uuid)
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
  select * into c from public.contatti where id = p_contatto and categoria = 'Archiviato' for update;
  if not found then raise exception 'Contatto non archiviato'; end if;
  p := c.archiviato_prima;

  update public.contatti set
    categoria = categoria_prec,
    categoria_prec = null,
    -- con la copia il rientro di prima (anche vuoto); senza, torna in coda da oggi, qualunque sia la categoria
    rientro_il = case when p is not null then (p->>'rientro_il')::date else (now() at time zone 'Europe/Rome')::date end,
    in_coda_dal = null,
    archiviato_prima = null,
    aggiornato_il = now()
  where id = p_contatto;

  if p is not null and jsonb_array_length(coalesce(p->'azioni', '[]'::jsonb)) > 0 then
    -- le azioni tornano con lo stesso id (senza le colonne che il database calcola da solo, come `chiave`)
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into colonne
      from information_schema.columns
     where table_schema = 'public' and table_name = 'azioni' and is_generated = 'NEVER';
    execute format('insert into public.azioni (%s) select %s from jsonb_populate_recordset(null::public.azioni, $1) on conflict (id) do nothing',
                   colonne, colonne) using p->'azioni';
  end if;
  if p is not null then
    for v in select * from jsonb_to_recordset(coalesce(p->'vendite', '[]'::jsonb)) as x(id uuid, azione_riordino_id uuid, azione_consegna_id uuid) loop
      update public.vendite set azione_riordino_id = v.azione_riordino_id, azione_consegna_id = v.azione_consegna_id
       where id = v.id;
    end loop;
  end if;
end $function$;
