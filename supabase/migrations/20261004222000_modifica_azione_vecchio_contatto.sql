-- Nota Azioni 046, difetto 1 · modifica_azione: spostando un'azione su un'altra persona ricalcolava il rientro solo della nuova; la vecchia restava
-- con un rientro che non aveva più motivo (quello dell'azione spostata). Ora, se l'azione cambia persona, anche la vecchia ricalcola il rientro dalla
-- sua ultima azione con esito rimasta (stessa regola unica, applica_rientro, migrazione 20261004200000); se non ne ha, resta com'è.
-- Il ritorno ha quattro campi in più (vecchio_contatto, vecchio_rientro_prec, vecchio_in_coda_prec, vecchio_cambiato) e annulla_modifica_azione li usa
-- per rimettere anche la vecchia persona com'era. Chi chiama non cambia niente.
-- MODIFICA di due funzioni esistenti: con l'ok di Ignazio.

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

  -- spostata su un'altra persona (nota 046): la vecchia ricalcola il rientro dalla sua ultima azione con esito rimasta
  if v_nuovo.id <> v_az.contatto_id and v_vecchio.id is not null then
    select * into v_ultima from public.azioni a
     where a.contatto_id = v_vecchio.id and a.esito is not null
     order by a.inizio desc nulls last, a.creato_il desc limit 1;
    if found then
      v_vcambia := public.applica_rientro(v_vecchio.id, v_ultima.id, v_ultima.categoria || '-' || v_ultima.tipo_azione || '-' || v_ultima.esito,
                                          v_ultima.inizio, v_ultima.data_scelta);
    end if;
  end if;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'categoria', v_az.categoria,
    'portato_da', v_az.portato_da, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio, 'fine', v_az.fine,
    'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'data_scelta', v_az.data_scelta,
    'contatto_rientro', v_nuovo.id, 'rientro_prec', v_nuovo.rientro_il, 'in_coda_prec', v_nuovo.in_coda_dal, 'rientro_cambiato', v_cambia,
    'vecchio_contatto', v_vecchio.id, 'vecchio_rientro_prec', v_vecchio.rientro_il, 'vecchio_in_coda_prec', v_vecchio.in_coda_dal, 'vecchio_cambiato', v_vcambia);
end $$;

create or replace function public.annulla_modifica_azione(p_prima json)
returns void language plpgsql set search_path to 'public' as $function$
begin
  update public.azioni set
    contatto_id = coalesce((p_prima->>'contatto_id')::uuid, contatto_id), categoria = coalesce(p_prima->>'categoria', categoria),
    portato_da = (p_prima->>'portato_da')::uuid,
    modalita = p_prima->>'modalita', esito = p_prima->>'esito', inizio = (p_prima->>'inizio')::timestamptz,
    fine = (p_prima->>'fine')::timestamptz, ospite = p_prima->>'ospite', note = p_prima->>'note',
    completata = (p_prima->>'completata')::boolean, confermato_il = (p_prima->>'confermato_il')::timestamptz,
    data_scelta = case when p_prima::jsonb ? 'data_scelta' then (p_prima->>'data_scelta')::timestamptz else data_scelta end
  where id = (p_prima->>'azione_id')::uuid;
  if (p_prima->>'rientro_cambiato')::boolean then
    update public.contatti set rientro_il = (p_prima->>'rientro_prec')::date, in_coda_dal = (p_prima->>'in_coda_prec')::date,
      aggiornato_il = now() where id = coalesce((p_prima->>'contatto_rientro')::uuid, (p_prima->>'contatto_id')::uuid);
  end if;
  -- la vecchia persona, se l'azione era stata spostata (nota 046)
  if coalesce((p_prima->>'vecchio_cambiato')::boolean, false) then
    update public.contatti set rientro_il = (p_prima->>'vecchio_rientro_prec')::date, in_coda_dal = (p_prima->>'vecchio_in_coda_prec')::date,
      aggiornato_il = now() where id = (p_prima->>'vecchio_contatto')::uuid;
  end if;
end $function$;
