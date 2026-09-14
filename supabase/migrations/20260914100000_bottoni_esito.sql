-- ═══════════════════════════════════════════════════════════
-- Fase 1 · Bottoni esito
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Tabella bottoni confermata da Ignazio il 14/09 (STRUTTURA.md → Bottoni esito).
-- 1. Sequenze: Partner e Cliente non avevano fasi di telefonata → 4 righe
--    Contatto · Richiamare / Appuntamento, senza giorni (rientro = data scelta).
-- 2. azioni.data_scelta: data (e ora, per l'appuntamento) scelta col bottone.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

insert into public.sequenze (categoria, tipo_azione, fase, coach, giorni_rientro, area) values
  ('Partner', 'Contatto', 'Richiamare',   'Richiamalo alla data, porta un obiettivo', null, 'Attività'),
  ('Partner', 'Contatto', 'Appuntamento', 'Conferma l''appuntamento il giorno prima', null, 'Attività'),
  ('Cliente', 'Contatto', 'Richiamare',   'Richiamalo alla data, chiedi come va',     null, 'Prodotti'),
  ('Cliente', 'Contatto', 'Appuntamento', 'Conferma l''appuntamento, prepara i prodotti', null, 'Prodotti')
on conflict (chiave) do nothing;

alter table public.azioni add column data_scelta timestamptz;

-- Come prima, in più salva la data scelta sull'azione.
create or replace function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                                 p_modalita text default 'Telefonata')
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_seq   public.sequenze;
  v_prec  public.contatti;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_id    uuid;
begin
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then raise exception 'Fase non trovata: %', p_chiave; end if;

  select * into v_prec from public.contatti where id = p_contatto;
  if not found then raise exception 'Contatto non trovato'; end if;

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata, data_scelta)
  values (public.utente_corrente(), p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, now(), true, p_data)
  returning id into v_id;

  update public.contatti set
    rientro_il = case
      when p_data is not null then (p_data at time zone 'Europe/Rome')::date
      when v_seq.giorni_rientro is not null then v_oggi + v_seq.giorni_rientro
    end,
    in_coda_dal = null,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;
