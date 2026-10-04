-- Una regola sola per il rientro in coda (Azioni, nota 030, punto 1; regola scelta da Ignazio il 04/10/2026 sera).
-- Prima il giorno in cui una persona torna in coda si calcolava in tre modi: registra_esito (dalla coda) contava da oggi; chiudi_appuntamento
-- (dall'Agenda) contava da oggi anche per un'azione di giorni fa e lo spostava anche se dopo c'erano già altre azioni; modifica_azione contava dal
-- giorno dell'azione, solo se era l'ultima, senza la regola dei 7 giorni. Ora una funzione sola, applica_rientro, usata da tutte e tre:
--   · il rientro si conta DAL GIORNO DELL'AZIONE (non da quando la si registra): giorno + giorni_rientro della fase (sequenze);
--   · si tocca SOLO SE quell'azione è l'ultima con esito della persona (una più recente con esito vince);
--   · sopra i 7 giorni (storico, chi importa il passato) non si tocca niente;
--   · PM Fissato, Appuntamento e Consulenza Prodotti di una telefonata → nessun rientro (lo segue l'appuntamento), uguale da coda, Agenda e scheda
--     (prima lo faceva il telefono con una scrittura in più, solo da alcuni punti);
--   · con un giorno scelto (Richiamare) il rientro è quel giorno; una fase senza giorni e senza giorno scelto non tocca niente.
-- Restituisce true se ha scritto (è il «rientro_cambiato» che serve ad Annulla). Le tre funzioni restituiscono quello che restituivano prima.
-- MODIFICA di funzioni esistenti (registra_esito, chiudi_appuntamento, modifica_azione): con l'ok di Ignazio. applica_rientro è nuova.

create or replace function public.applica_rientro(p_contatto uuid, p_azione uuid, p_chiave text, p_inizio timestamptz, p_data timestamptz default null)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_oggi    date := (now() at time zone 'Europe/Rome')::date;
  v_quando  timestamptz := coalesce(p_inizio, now());
  v_giorno  date := (coalesce(p_inizio, now()) at time zone 'Europe/Rome')::date;
  v_seq     public.sequenze;
  v_rientro date;
begin
  if p_contatto is null then return false; end if;
  if v_giorno < v_oggi - 7 then return false; end if;   -- storico: più di 7 giorni fa, la coda non si tocca
  -- non è l'ultima azione con esito della persona: il rientro lo decide quella più recente
  if exists (select 1 from public.azioni a
              where a.contatto_id = p_contatto and a.id is distinct from p_azione and a.esito is not null and a.inizio > v_quando) then
    return false;
  end if;
  select * into v_seq from public.sequenze where chiave = p_chiave;
  if not found then return false; end if;

  if v_seq.tipo_azione = 'Contatto' and v_seq.fase in ('PM Fissato', 'Appuntamento', 'Consulenza Prodotti') then
    v_rientro := null;                                             -- lo segue l'appuntamento
  elsif p_data is not null then
    v_rientro := (p_data at time zone 'Europe/Rome')::date;        -- il giorno scelto (Richiamare)
  elsif v_seq.giorni_rientro is not null then
    v_rientro := v_giorno + v_seq.giorni_rientro;                  -- dal giorno dell'azione
  else
    return false;                                                  -- fase senza giorni e senza giorno scelto: niente da cambiare
  end if;

  update public.contatti set rientro_il = v_rientro, in_coda_dal = null, aggiornato_il = now() where id = p_contatto;
  return true;
end $$;

revoke execute on function public.applica_rientro(uuid, uuid, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.applica_rientro(uuid, uuid, text, timestamptz, timestamptz) to authenticated, service_role;

-- 1. dalla coda (e dalla scheda): la nuova azione è l'ultima; se la regola non scrive, la persona esce comunque dalla coda di oggi (come prima)
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

-- 2. dall'Agenda, dalla scheda, dai Riordini (e da chiudi_azione): la stessa regola, dal giorno dell'azione
create or replace function public.chiudi_appuntamento(p_azione uuid, p_esito text)
returns json
language plpgsql
set search_path to 'public'
as $function$
declare
  v_az     public.azioni;
  v_prec   public.contatti;
  v_cambia boolean;
begin
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Appuntamento non trovato'; end if;
  select * into v_prec from public.contatti where id = v_az.contatto_id;

  update public.azioni set esito = p_esito, completata = true where id = p_azione;

  v_cambia := public.applica_rientro(v_az.contatto_id, p_azione, v_az.categoria || '-' || v_az.tipo_azione || '-' || p_esito, v_az.inizio, null);

  return json_build_object('azione_id', p_azione, 'esito_prec', v_az.esito, 'completata_prec', v_az.completata,
                           'contatto_id', v_az.contatto_id, 'rientro_prec', v_prec.rientro_il, 'in_coda_prec', v_prec.in_coda_dal,
                           'rientro_cambiato', v_cambia);
end $function$;

-- 3. dal foglio «Modifica»: la stessa regola (prima calcolava da sé, senza i 7 giorni e azzerando il rientro per le fasi senza giorni)
create or replace function public.modifica_azione(p_azione uuid, p_contatto uuid, p_portato_da uuid, p_modalita text, p_esito text,
                                                  p_inizio timestamptz, p_fine timestamptz, p_ospite text, p_note text,
                                                  p_cambia_scelta boolean default false, p_data_scelta timestamptz default null)
returns json language plpgsql security invoker set search_path = public as $$
declare
  v_az      public.azioni;
  v_nuovo   public.contatti;
  v_cat     text;
  v_cambia  boolean := false;
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

  -- il rientro si ricalcola solo se è cambiato qualcosa che lo riguarda (esito, persona, giorno scelto); la regola è quella di applica_rientro
  if p_esito is not null
     and (p_esito is distinct from v_az.esito or v_nuovo.id <> v_az.contatto_id or v_scelta is distinct from v_az.data_scelta) then
    v_cambia := public.applica_rientro(v_nuovo.id, p_azione, v_cat || '-' || v_az.tipo_azione || '-' || p_esito, p_inizio, v_scelta);
  end if;

  return json_build_object('azione_id', p_azione, 'contatto_id', v_az.contatto_id, 'categoria', v_az.categoria,
    'portato_da', v_az.portato_da, 'modalita', v_az.modalita, 'esito', v_az.esito, 'inizio', v_az.inizio, 'fine', v_az.fine,
    'ospite', v_az.ospite, 'note', v_az.note, 'completata', v_az.completata, 'confermato_il', v_az.confermato_il,
    'data_scelta', v_az.data_scelta,
    'contatto_rientro', v_nuovo.id, 'rientro_prec', v_nuovo.rientro_il, 'in_coda_prec', v_nuovo.in_coda_dal, 'rientro_cambiato', v_cambia);
end $$;
