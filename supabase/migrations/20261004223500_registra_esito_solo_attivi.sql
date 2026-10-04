-- Nota Azioni 046, difetto 5 · registra_esito accettava esiti su persone eliminate o archiviate (dalla coda non succede, ma la funzione non
-- lo impediva). Ora rifiuta con un messaggio chiaro; il resto è uguale alla versione del 04/10 (regola unica del rientro, 20261004200000).
-- MODIFICA di una funzione esistente: con l'ok di Ignazio.

create or replace function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                                 p_modalita text default 'Telefonata', p_da_coda boolean default false)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_seq   public.sequenze;
  v_prec  public.contatti;
  v_id    uuid;
  v_ora   timestamptz := now();
begin
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then raise exception 'Fase non trovata: %', p_chiave; end if;

  select * into v_prec from public.contatti where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;
  if v_prec.eliminato_il is not null then raise exception 'Contatto eliminato: prima si ripristina'; end if;
  if v_prec.categoria = 'Archiviato' then raise exception 'Contatto archiviato: prima si ripristina'; end if;

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata,
                             data_scelta, da_coda)
  values (v_prec.user_id, p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, v_ora, true,
          p_data, p_da_coda)
  returning id into v_id;

  if not public.applica_rientro(p_contatto, v_id, p_chiave, v_ora, p_data) then
    update public.contatti set rientro_il = null, in_coda_dal = null, aggiornato_il = now() where id = p_contatto;
  end if;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;
