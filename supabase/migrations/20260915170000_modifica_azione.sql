-- ═══════════════════════════════════════════════════════════
-- Foglio unico «Modifica azione»
-- 15 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisioni di Ignazio (15/09):
-- - un solo foglio per correggere un'azione, uguale in Report, Griglia PM, scheda contatto e Agenda
-- - un'azione per ogni passo del percorso: il foglio serve a correggere, non a portare avanti
-- - regola della coda: se si corregge l'esito dell'ULTIMA azione del contatto, il rientro in coda si ricalcola;
--   se l'azione è vecchia si corregge solo il dato (la coda la segue già un'azione più recente)
--
-- 1. modifica_azione: sottotipo, esito, inizio/fine, ospite, note. Restituisce i valori di prima per «Annulla».
--    Rientro (solo ultima azione ed esito cambiato, fase trovata in sequenze), contato dal giorno dell'azione:
--    PM Fissato / Appuntamento → vuoto (lo segue l'appuntamento) · giorno scelto se c'è · fase con giorni → giorno + giorni ·
--    senza giorni → vuoto (come registra_esito, ma contando dal giorno dell'azione invece che da oggi).
-- 2. annulla_modifica_azione: rimette i valori di prima.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create function public.modifica_azione(p_azione uuid, p_modalita text, p_esito text, p_inizio timestamptz,
                                       p_fine timestamptz, p_ospite text, p_note text)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az     public.azioni;
  v_prec   public.contatti;
  v_seq    public.sequenze;
  v_ultima boolean;
  v_cambia boolean := false;
  v_rientro date;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Azione non trovata'; end if;
  select * into v_prec from public.contatti where id = v_az.contatto_id;

  update public.azioni set
    modalita = p_modalita, esito = p_esito, inizio = p_inizio, fine = p_fine, ospite = p_ospite, note = p_note,
    completata = case when p_esito is not null then true else completata end,
    confermato_il = case when p_inizio is distinct from v_az.inizio then null else confermato_il end
  where id = p_azione;

  select not exists (select 1 from public.azioni a where a.contatto_id = v_az.contatto_id and a.id <> p_azione and a.inizio > p_inizio)
    into v_ultima;
  if v_ultima and p_esito is distinct from v_az.esito and p_esito is not null then
    select * into v_seq from public.sequenze where chiave = v_az.categoria || '-' || v_az.tipo_azione || '-' || p_esito;
    if found then
      v_cambia := true;
      v_rientro := case
        when p_esito in ('PM Fissato', 'Appuntamento') then null                          -- lo segue l'appuntamento
        when v_az.data_scelta is not null then (v_az.data_scelta at time zone 'Europe/Rome')::date   -- giorno scelto (Richiamare)
        when v_seq.giorni_rientro is not null then (p_inizio at time zone 'Europe/Rome')::date + v_seq.giorni_rientro
      end;
      update public.contatti set rientro_il = v_rientro, in_coda_dal = null, aggiornato_il = now() where id = v_az.contatto_id;
    end if;
  end if;

  return json_build_object('azione_id', p_azione, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio,
    'fine', v_az.fine, 'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'contatto_id', v_az.contatto_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal, 'rientro_cambiato', v_cambia);
end $$;

create function public.annulla_modifica_azione(p_prima json)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.azioni set
    modalita = p_prima->>'modalita', esito = p_prima->>'esito', inizio = (p_prima->>'inizio')::timestamptz,
    fine = (p_prima->>'fine')::timestamptz, ospite = p_prima->>'ospite', note = p_prima->>'note',
    completata = (p_prima->>'completata')::boolean, confermato_il = (p_prima->>'confermato_il')::timestamptz
  where id = (p_prima->>'azione_id')::uuid;
  if (p_prima->>'rientro_cambiato')::boolean then
    update public.contatti set rientro_il = (p_prima->>'rientro_prec')::date, in_coda_dal = (p_prima->>'in_coda_prec')::date,
      aggiornato_il = now() where id = (p_prima->>'contatto_id')::uuid;
  end if;
end $$;
