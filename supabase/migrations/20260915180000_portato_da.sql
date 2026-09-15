-- ═══════════════════════════════════════════════════════════
-- «Portato da»: l'azione è di chi ascolta, il partner che l'ha portato è un collegamento
-- 15 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisioni di Ignazio (15/09), caso: PM fatto a Sonia (ospite) portata da Filippo, registrato su Filippo.
-- - l'azione va intestata a chi ascolta il piano: l'esito è suo (Report, Griglia PM, coda)
-- - chi l'ha portato va in «Portato da» (un contatto della Lista), al posto dell'ospite scritto a mano
-- - per le azioni già registrate: «L'esito è dell'ospite» nel foglio Modifica azione sposta l'azione sull'ospite
--
-- 1. azioni.portato_da: id del contatto che ha portato. Senza vincolo verso contatti di proposito: un secondo
--    collegamento azioni → contatti renderebbe ambigue le letture «contatti(nome)» già usate dall'app.
-- 2. modifica_azione con p_contatto e p_portato_da (sostituisce la versione del 15/09 pomeriggio):
--    - contatto cambiato → la categoria dell'azione diventa quella del nuovo contatto (se ha fasi in sequenze)
--    - rientro in coda del contatto dell'azione se è la sua ultima azione e cambia l'esito O il contatto
-- 3. annulla_modifica_azione rimette anche contatto, categoria e portato da.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.azioni add column portato_da uuid;
create index azioni_portato_da on public.azioni (portato_da) where portato_da is not null;

drop function public.modifica_azione(uuid, text, text, timestamptz, timestamptz, text, text);

create function public.modifica_azione(p_azione uuid, p_contatto uuid, p_portato_da uuid, p_modalita text, p_esito text,
                                       p_inizio timestamptz, p_fine timestamptz, p_ospite text, p_note text)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az      public.azioni;
  v_nuovo   public.contatti;
  v_seq     public.sequenze;
  v_cat     text;
  v_ultima  boolean;
  v_cambia  boolean := false;
  v_rientro date;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Azione non trovata'; end if;
  select * into v_nuovo from public.contatti where id = coalesce(p_contatto, v_az.contatto_id);
  if not found then raise exception 'Contatto non trovato'; end if;

  v_cat := case when v_nuovo.id <> v_az.contatto_id and exists (select 1 from public.sequenze where categoria = v_nuovo.categoria)
                then v_nuovo.categoria else v_az.categoria end;

  update public.azioni set
    contatto_id = v_nuovo.id, categoria = v_cat, portato_da = p_portato_da,
    modalita = p_modalita, esito = p_esito, inizio = p_inizio, fine = p_fine, ospite = p_ospite, note = p_note,
    completata = case when p_esito is not null then true else completata end,
    confermato_il = case when p_inizio is distinct from v_az.inizio then null else confermato_il end
  where id = p_azione;

  select not exists (select 1 from public.azioni a where a.contatto_id = v_nuovo.id and a.id <> p_azione and a.inizio > p_inizio)
    into v_ultima;
  if v_ultima and p_esito is not null and (p_esito is distinct from v_az.esito or v_nuovo.id <> v_az.contatto_id) then
    select * into v_seq from public.sequenze where chiave = v_cat || '-' || v_az.tipo_azione || '-' || p_esito;
    if found then
      v_cambia := true;
      v_rientro := case
        when p_esito in ('PM Fissato', 'Appuntamento') then null                                    -- lo segue l'appuntamento
        when v_az.data_scelta is not null then (v_az.data_scelta at time zone 'Europe/Rome')::date   -- giorno scelto (Richiamare)
        when v_seq.giorni_rientro is not null then (p_inizio at time zone 'Europe/Rome')::date + v_seq.giorni_rientro
      end;
      update public.contatti set rientro_il = v_rientro, in_coda_dal = null, aggiornato_il = now() where id = v_nuovo.id;
    end if;
  end if;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'categoria', v_az.categoria,
    'portato_da', v_az.portato_da, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio, 'fine', v_az.fine,
    'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'contatto_rientro', v_nuovo.id, 'rientro_prec', v_nuovo.rientro_il, 'in_coda_prec', v_nuovo.in_coda_dal, 'rientro_cambiato', v_cambia);
end $$;

create or replace function public.annulla_modifica_azione(p_prima json)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.azioni set
    contatto_id = coalesce((p_prima->>'contatto_id')::uuid, contatto_id), categoria = coalesce(p_prima->>'categoria', categoria),
    portato_da = (p_prima->>'portato_da')::uuid,
    modalita = p_prima->>'modalita', esito = p_prima->>'esito', inizio = (p_prima->>'inizio')::timestamptz,
    fine = (p_prima->>'fine')::timestamptz, ospite = p_prima->>'ospite', note = p_prima->>'note',
    completata = (p_prima->>'completata')::boolean, confermato_il = (p_prima->>'confermato_il')::timestamptz
  where id = (p_prima->>'azione_id')::uuid;
  if (p_prima->>'rientro_cambiato')::boolean then
    update public.contatti set rientro_il = (p_prima->>'rientro_prec')::date, in_coda_dal = (p_prima->>'in_coda_prec')::date,
      aggiornato_il = now() where id = coalesce((p_prima->>'contatto_rientro')::uuid, (p_prima->>'contatto_id')::uuid);
  end if;
end $$;
