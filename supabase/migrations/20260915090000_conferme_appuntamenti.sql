-- ═══════════════════════════════════════════════════════════
-- Conferme degli appuntamenti
-- 15 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisioni di Ignazio (15/09):
-- - la conferma di un appuntamento compare in Dashboard 12 ore prima, fino all'inizio (logica nell'app, agenda.js)
-- - fissando un appuntamento il contatto esce dalla coda: il percorso lo segue l'appuntamento
--
-- 1. azioni.confermato_il: quando l'appuntamento è stato confermato (vuoto = da confermare).
-- 2. registra_esito: con le fasi PM Fissato / Appuntamento il rientro resta vuoto (prima era il giorno scelto).
-- 3. Contatti già fermi su PM Fissato / Appuntamento con rientro: rientro vuoto (0 righe il 15/09).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.azioni add column confermato_il timestamptz;

create or replace function public.registra_esito(p_contatto uuid, p_chiave text, p_data timestamptz default null,
                                                 p_modalita text default 'Telefonata', p_da_coda boolean default false)
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

  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, esito, inizio, completata,
                             data_scelta, da_coda)
  values (public.utente_corrente(), p_contatto, v_seq.categoria, v_seq.tipo_azione, p_modalita, v_seq.fase, now(), true,
          p_data, p_da_coda)
  returning id into v_id;

  update public.contatti set
    rientro_il = case
      when v_seq.fase in ('PM Fissato', 'Appuntamento') then null   -- lo segue l'appuntamento (15/09)
      when p_data is not null then (p_data at time zone 'Europe/Rome')::date
      when v_seq.giorni_rientro is not null then v_oggi + v_seq.giorni_rientro
    end,
    in_coda_dal = null,
    aggiornato_il = now()
  where id = p_contatto;

  return json_build_object('azione_id', v_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal);
end $$;

update public.contatti set rientro_il = null, in_coda_dal = null, aggiornato_il = now()
where rientro_il is not null and id in (
  select c.id from public.contatti c
  cross join lateral (
    select a.esito, a.tipo_azione, a.data_scelta from public.azioni a
    where a.contatto_id = c.id order by a.inizio desc nulls last, a.creato_il desc limit 1
  ) u
  where u.tipo_azione = 'Contatto' and u.esito in ('PM Fissato', 'Appuntamento') and u.data_scelta is not null
);
