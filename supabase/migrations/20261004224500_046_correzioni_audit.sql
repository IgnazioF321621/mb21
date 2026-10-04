-- Nota Azioni 046 · correzioni dall'audit automatico delle quattro migrazioni (db-safety-review, 04/10/2026 sera, arrivato dopo l'applicazione).
-- 1. modifica_azione: la vecchia persona ricalcola il rientro solo se l'azione spostata AVEVA un esito (altrimenti non aveva mai inciso e si rischiava di
--    coprire un «Quando risentirlo?» messo a mano); la chiave si prende dalla colonna generata `chiave`.
-- 2. ripristina_contatto: rifiuta le persone eliminate (sono anche «Archiviato»: ripristinarle da qui lasciava eliminato_il pieno) e rimette anche
--    `in_coda_dal` dalla copia, come fa annulla_elimina_contatto.
-- 3. elimina_contatto / annulla_elimina_contatto: il collegamento di coppia si toglie da TUTTE E DUE le schede (anche quella eliminata, `compagno_id`
--    salvato nella copia) e «Annulla» lo rimette da tutte e due solo se l'altra scheda non si è collegata a un terzo nel frattempo.
-- 4. Permessi (regola del 03/10, CLAUDE.md § 4): le cinque funzioni che non li avevano mai avuti (esecuzione a PUBLIC, anon compreso; la RLS invoker
--    non lasciava vedere niente) passano a «solo chi è entrato», come le altre.
-- MODIFICA di funzioni esistenti e dei loro permessi: con l'ok di Ignazio. Il resto dei corpi è uguale alle versioni applicate alle 22:40.

-- 1 ───────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.modifica_azione(p_azione uuid, p_contatto uuid, p_portato_da uuid, p_modalita text, p_esito text,
                                                  p_inizio timestamptz, p_fine timestamptz, p_ospite text, p_note text,
                                                  p_cambia_scelta boolean default false, p_data_scelta timestamptz default null)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az       public.azioni;
  v_nuovo    public.contatti;
  v_vecchio  public.contatti;
  v_ultima   public.azioni;
  v_cat      text;
  v_cambia   boolean := false;
  v_vcambia  boolean := false;
  v_scelta   timestamptz;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Azione non trovata'; end if;
  select * into v_nuovo from public.contatti where id = coalesce(p_contatto, v_az.contatto_id);
  if not found then raise exception 'Contatto non trovato'; end if;
  select * into v_vecchio from public.contatti where id = v_az.contatto_id;

  v_cat := case when v_nuovo.id <> v_az.contatto_id and exists (select 1 from public.sequenze where categoria = v_nuovo.categoria)
                then v_nuovo.categoria else v_az.categoria end;
  v_scelta := case when p_cambia_scelta then p_data_scelta else v_az.data_scelta end;

  update public.azioni set
    contatto_id = v_nuovo.id, categoria = v_cat, portato_da = p_portato_da,
    modalita = p_modalita, esito = p_esito, inizio = p_inizio, fine = p_fine, ospite = p_ospite, note = p_note,
    data_scelta = v_scelta,
    completata = case when p_esito is not null then true else completata end,
    confermato_il = case when p_inizio is distinct from v_az.inizio or v_scelta is distinct from v_az.data_scelta then null else confermato_il end
  where id = p_azione;

  -- il rientro della persona (nuova o stessa) si ricalcola solo se è cambiato qualcosa che lo riguarda (esito, persona, giorno scelto)
  if p_esito is not null
     and (p_esito is distinct from v_az.esito or v_nuovo.id <> v_az.contatto_id or v_scelta is distinct from v_az.data_scelta) then
    v_cambia := public.applica_rientro(v_nuovo.id, p_azione, v_cat || '-' || v_az.tipo_azione || '-' || p_esito, p_inizio, v_scelta);
  end if;

  -- spostata su un'altra persona (nota 046) un'azione CON esito: la vecchia ricalcola il rientro dalla sua ultima azione con esito rimasta
  if v_nuovo.id <> v_az.contatto_id and v_vecchio.id is not null and v_az.esito is not null then
    select * into v_ultima from public.azioni a
     where a.contatto_id = v_vecchio.id and a.esito is not null
     order by a.inizio desc nulls last, a.creato_il desc limit 1;
    if found then
      v_vcambia := public.applica_rientro(v_vecchio.id, v_ultima.id, v_ultima.chiave, v_ultima.inizio, v_ultima.data_scelta);
    end if;
  end if;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'categoria', v_az.categoria,
    'portato_da', v_az.portato_da, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio, 'fine', v_az.fine,
    'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'data_scelta', v_az.data_scelta,
    'contatto_rientro', v_nuovo.id, 'rientro_prec', v_nuovo.rientro_il, 'in_coda_prec', v_nuovo.in_coda_dal, 'rientro_cambiato', v_cambia,
    'vecchio_contatto', v_vecchio.id, 'vecchio_rientro_prec', v_vecchio.rientro_il, 'vecchio_in_coda_prec', v_vecchio.in_coda_dal, 'vecchio_cambiato', v_vcambia);
end $$;

-- 2 ───────────────────────────────────────────────────────────────────────────────────────────────
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
  if c.eliminato_il is not null then raise exception 'Contatto eliminato: si rimette con «Annulla» dell''eliminazione'; end if;
  p := c.archiviato_prima;

  update public.contatti set
    categoria = categoria_prec,
    categoria_prec = null,
    -- con la copia il rientro e la coda di prima (anche vuoti); senza, torna in coda da oggi, qualunque sia la categoria
    rientro_il = case when p is not null then (p->>'rientro_il')::date else (now() at time zone 'Europe/Rome')::date end,
    in_coda_dal = case when p is not null then (p->>'in_coda_dal')::date end,
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

-- 3 ───────────────────────────────────────────────────────────────────────────────────────────────
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
    -- la coppia (nota 046): chi la puntava come compagno/a e chi puntava lei; il collegamento si toglie da tutte e due le schede
    'compagno_di', coalesce((select jsonb_agg(x.id) from public.contatti x where x.compagno_id = p_contatto), '[]'::jsonb),
    'compagno_id', c.compagno_id);

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
    codice_amway = null, utente_id = null, compagno_id = null,
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
  v_compagno uuid;
  v_ricollegati integer := 0;
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
  if jsonb_array_length(coalesce(p->'azioni', '[]'::jsonb)) > 0 then
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into colonne
      from information_schema.columns
     where table_schema = 'public' and table_name = 'azioni' and is_generated = 'NEVER';
    execute format('insert into public.azioni (%s) select %s from jsonb_populate_recordset(null::public.azioni, $1)',
                   colonne, colonne) using p->'azioni';
  end if;
  for v in select * from jsonb_to_recordset(coalesce(p->'vendite', '[]'::jsonb)) as x(id uuid, azione_riordino_id uuid, azione_consegna_id uuid) loop
    update public.vendite set azione_riordino_id = v.azione_riordino_id, azione_consegna_id = v.azione_consegna_id
     where id = v.id;
  end loop;

  if jsonb_array_length(coalesce(p->'biglietti', '[]'::jsonb)) > 0 then
    insert into public.biglietti select * from jsonb_populate_recordset(null::public.biglietti, p->'biglietti');
  end if;
  update public.cep set uscito_il = null, aggiornato_il = now()
   where id in (select (jsonb_array_elements_text(coalesce(p->'cep_chiusi', '[]'::jsonb)))::uuid);

  -- la coppia torna collegata da tutte e due le parti, solo se l'altra scheda non si è collegata a un terzo nel frattempo (nota 046);
  -- le copie di prima del 04/10 non hanno le voci: niente da fare
  update public.contatti set compagno_id = p_contatto, aggiornato_il = now()
   where id in (select (jsonb_array_elements_text(coalesce(p->'compagno_di', '[]'::jsonb)))::uuid)
     and compagno_id is null;
  get diagnostics v_ricollegati = row_count;
  v_compagno := (p->>'compagno_id')::uuid;
  if v_compagno is not null and exists (select 1 from public.contatti x where x.id = v_compagno and x.compagno_id = p_contatto) then
    update public.contatti set compagno_id = v_compagno, aggiornato_il = now() where id = p_contatto;
  end if;
end $function$;

-- 4 · permessi: solo chi è entrato (regola del 03/10); elimina/annulla_elimina li hanno dal 19/09 ────────────────────────────────────────
revoke execute on function public.modifica_azione(uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, boolean, timestamptz) from public, anon;
revoke execute on function public.annulla_modifica_azione(json) from public, anon;
revoke execute on function public.registra_esito(uuid, text, timestamptz, text, boolean) from public, anon;
revoke execute on function public.archivia_contatto(uuid) from public, anon;
revoke execute on function public.ripristina_contatto(uuid) from public, anon;
grant execute on function public.modifica_azione(uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, boolean, timestamptz) to authenticated, service_role;
grant execute on function public.annulla_modifica_azione(json) to authenticated, service_role;
grant execute on function public.registra_esito(uuid, text, timestamptz, text, boolean) to authenticated, service_role;
grant execute on function public.archivia_contatto(uuid) to authenticated, service_role;
grant execute on function public.ripristina_contatto(uuid) to authenticated, service_role;
