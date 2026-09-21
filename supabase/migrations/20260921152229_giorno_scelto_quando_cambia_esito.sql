-- ═══════════════════════════════════════════════════════════
-- Cantiere 39 · GLI ESITI — Lavori 1 e 2 (decisioni di Ignazio del 21/09, CANTIERI.md)
-- Il caso: telefonata dalla coda con esito «Richiamare» e giorno scelto il 21/09; il giorno dopo l'esito viene cambiato
-- in «No Interesse» dal foglio «Modifica». `modifica_azione` non toccava mai `data_scelta`: la riga restava in Agenda il 21
-- («Dalla coda: No Interesse») e, peggio, il rientro in coda si ricalcolava sul giorno scelto vecchio invece che sui
-- giorni del nuovo esito.
--
-- Cosa cambia:
--   modifica_azione         → due parametri in più, con un valore predefinito (chi chiama come prima non cambia niente):
--                             p_cambia_scelta = true → `data_scelta` diventa p_data_scelta (null = tolta: l'app lo chiede
--                             prima, «Tolgo dall'Agenda il giorno scelto?»). Il rientro in coda guarda il giorno scelto
--                             NUOVO (se è stato tolto: i giorni del nuovo esito) e si ricalcola anche quando cambia solo
--                             il giorno scelto. Spostando il giorno scelto la conferma torna da fare.
--   annulla_modifica_azione → rimette anche `data_scelta` (se l'avviso viene da una modifica fatta con la funzione nuova).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

drop function public.modifica_azione(uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text);

create function public.modifica_azione(p_azione uuid, p_contatto uuid, p_portato_da uuid, p_modalita text, p_esito text,
                                       p_inizio timestamptz, p_fine timestamptz, p_ospite text, p_note text,
                                       p_cambia_scelta boolean default false, p_data_scelta timestamptz default null)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az      public.azioni;
  v_nuovo   public.contatti;
  v_seq     public.sequenze;
  v_cat     text;
  v_ultima  boolean;
  v_cambia  boolean := false;
  v_rientro date;
  v_scelta  timestamptz;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Azione non trovata'; end if;
  select * into v_nuovo from public.contatti where id = coalesce(p_contatto, v_az.contatto_id);
  if not found then raise exception 'Contatto non trovato'; end if;

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

  select not exists (select 1 from public.azioni a where a.contatto_id = v_nuovo.id and a.id <> p_azione and a.inizio > p_inizio)
    into v_ultima;
  if v_ultima and p_esito is not null
     and (p_esito is distinct from v_az.esito or v_nuovo.id <> v_az.contatto_id or v_scelta is distinct from v_az.data_scelta) then
    select * into v_seq from public.sequenze where chiave = v_cat || '-' || v_az.tipo_azione || '-' || p_esito;
    if found then
      v_cambia := true;
      v_rientro := case
        when p_esito in ('PM Fissato', 'Appuntamento') then null                                -- lo segue l'appuntamento
        when v_scelta is not null then (v_scelta at time zone 'Europe/Rome')::date               -- giorno scelto (Richiamare), quello di adesso
        when v_seq.giorni_rientro is not null then (p_inizio at time zone 'Europe/Rome')::date + v_seq.giorni_rientro
      end;
      update public.contatti set rientro_il = v_rientro, in_coda_dal = null, aggiornato_il = now() where id = v_nuovo.id;
    end if;
  end if;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'categoria', v_az.categoria,
    'portato_da', v_az.portato_da, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio, 'fine', v_az.fine,
    'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'data_scelta', v_az.data_scelta,
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
    completata = (p_prima->>'completata')::boolean, confermato_il = (p_prima->>'confermato_il')::timestamptz,
    data_scelta = case when p_prima::jsonb ? 'data_scelta' then (p_prima->>'data_scelta')::timestamptz else data_scelta end
  where id = (p_prima->>'azione_id')::uuid;
  if (p_prima->>'rientro_cambiato')::boolean then
    update public.contatti set rientro_il = (p_prima->>'rientro_prec')::date, in_coda_dal = (p_prima->>'in_coda_prec')::date,
      aggiornato_il = now() where id = coalesce((p_prima->>'contatto_rientro')::uuid, (p_prima->>'contatto_id')::uuid);
  end if;
end $$;
