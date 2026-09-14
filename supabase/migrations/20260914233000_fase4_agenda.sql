-- ═══════════════════════════════════════════════════════════
-- Fase 4 · AGENDA
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Brief: docs/MB21_v4_Brief_F4_Agenda.md · scelte: docs/MB21_v4_Scelte_Agenda_bozza.md (decisioni del 14/09).
--
-- Gli appuntamenti sono righe di `azioni` (tipo ≠ Contatto, oppure Contatto programmato),
-- create dall'app con completata = false e senza esito.
-- 1. chiudi_appuntamento: esito + completata; rientro in coda secondo Sequenze (se la fase ha giorni).
--    Restituisce i valori di prima per «Annulla».
-- 2. riapri_appuntamento: l'Annulla.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create function public.chiudi_appuntamento(p_azione uuid, p_esito text)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az    public.azioni;
  v_prec  public.contatti;
  v_giorni integer;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Appuntamento non trovato'; end if;
  select * into v_prec from public.contatti where id = v_az.contatto_id;

  update public.azioni set esito = p_esito, completata = true where id = p_azione;

  select giorni_rientro into v_giorni from public.sequenze
   where chiave = v_az.categoria || '-' || v_az.tipo_azione || '-' || p_esito;
  if v_giorni is not null then
    update public.contatti set rientro_il = v_oggi + v_giorni, in_coda_dal = null, aggiornato_il = now()
     where id = v_az.contatto_id;
  end if;

  return json_build_object('azione_id', p_azione, 'esito_prec', v_az.esito, 'completata_prec', v_az.completata,
                           'contatto_id', v_az.contatto_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal,
                           'rientro_cambiato', v_giorni is not null);
end $$;

create function public.riapri_appuntamento(p_azione uuid, p_esito text, p_completata boolean,
                                           p_contatto uuid, p_rientro date, p_in_coda date, p_rientro_cambiato boolean)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.azioni set esito = p_esito, completata = p_completata where id = p_azione;
  if p_rientro_cambiato then
    update public.contatti set rientro_il = p_rientro, in_coda_dal = p_in_coda, aggiornato_il = now() where id = p_contatto;
  end if;
end $$;
