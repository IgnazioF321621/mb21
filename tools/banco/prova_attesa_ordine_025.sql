-- Prova della nota Azioni 025 («Ordina da solo»): migrazione 20261008141200_attesa_ordine.sql + funzione attesa_ordine.
-- Tutto dentro una transazione che finisce SEMPRE annullata: il blocco termina con un'eccezione voluta («PROVA FINITA»), poi c'è anche rollback.
-- Uso: supabase db query --linked -f tools/banco/prova_attesa_ordine_025.sql  (dentro c'è la copia della migrazione: se cambia, rifare la copia)
begin;
-- ↓ copia della migrazione (il comando non legge altri file)
-- ═══════════════════════════════════════════════════════════
-- Riordino: «In attesa che ordini» (nota Azioni 025, decisione di Ignazio 08/10/2026).
-- Nella telefonata di riordino il cliente dice «ordino io dal mio account»: non è un no e non è una vendita.
-- L'esito nuovo «Ordina da solo» chiude la telefonata (esce dai Riordini da sentire) e apre un'ATTESA sulla telefonata stessa:
--   · attesa_dal        = il giorno in cui l'ha detto
--   · attesa_chiedi_il  = quando l'app chiede «ha ordinato?» (dal + 7; «Non ancora» lo sposta di altri 7)
--   · attesa_chiusa_il  = quando l'attesa si chiude («Ha ordinato» → la vendita con la data vera; «Non ordina più»); vuoto = attesa aperta
-- SOLO AGGIUNTE: tre campi facoltativi su `azioni`, una riga in `sequenze` (senza rientro: il cliente ordina da solo) e una funzione nuova.
-- Nessuna vendita viene mai registrata da sola.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica al rilascio con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.azioni
  add column if not exists attesa_dal       date,
  add column if not exists attesa_chiedi_il date,
  add column if not exists attesa_chiusa_il date;

comment on column public.azioni.attesa_dal       is 'Nota Azioni 025: il cliente ha detto «ordino da solo» questo giorno (telefonata di riordino chiusa «Ordina da solo»)';
comment on column public.azioni.attesa_chiedi_il is 'Nota Azioni 025: da questo giorno l''app chiede «ha ordinato?» (Sì · Non ancora · Non ordina più)';
comment on column public.azioni.attesa_chiusa_il is 'Nota Azioni 025: il giorno in cui l''attesa si è chiusa; vuoto = ancora in attesa';

-- L'esito nel motore delle fasi: senza giorni di rientro (nessuna telefonata in coda: il cliente ordina da solo). Consiglio, non ordine.
insert into public.sequenze (categoria, tipo_azione, fase, coach, giorni_rientro, area) values
  ('Cliente', 'Contatto', 'Ordina da solo', 'Ordina da solo dal suo account: tra 7 giorni l''app ti chiede se ha ordinato', null, 'Prodotti')
on conflict (chiave) do nothing;

-- attesa_ordine(p_azione, p_cosa, p_giorno):
--   'apri'       → attesa_dal = p_giorno (o oggi), attesa_chiedi_il = +7, attesa_chiusa_il vuoto
--   'non_ancora' → attesa_chiedi_il = oggi + 7
--   'chiudi'     → attesa_chiusa_il = p_giorno (o oggi)
--   'annulla'    → i tre campi vuoti (l'Annulla dell'esito)
-- Chi chiama: il proprietario dell'azione o l'Admin. Restituisce la riga aggiornata (i tre campi).
create or replace function public.attesa_ordine(p_azione uuid, p_cosa text, p_giorno date default null)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_az    public.azioni;
  v_oggi  date := (now() at time zone 'Europe/Rome')::date;
  v_dal   date;
begin
  if public.utente_corrente() is null then raise exception 'Serve essere entrati nell''app'; end if;
  select * into v_az from public.azioni where id = p_azione;
  if not found then raise exception 'Azione non trovata'; end if;
  if v_az.user_id <> public.utente_corrente() and not public.is_admin() then raise exception 'Non è una tua azione'; end if;
  if p_cosa = 'apri' then
    v_dal := coalesce(p_giorno, v_oggi);
    update public.azioni set attesa_dal = v_dal, attesa_chiedi_il = v_dal + 7, attesa_chiusa_il = null where id = p_azione;
  elsif p_cosa = 'non_ancora' then
    if v_az.attesa_dal is null or v_az.attesa_chiusa_il is not null then raise exception 'Nessuna attesa aperta'; end if;
    update public.azioni set attesa_chiedi_il = v_oggi + 7 where id = p_azione;
  elsif p_cosa = 'chiudi' then
    if v_az.attesa_dal is null or v_az.attesa_chiusa_il is not null then raise exception 'Nessuna attesa aperta'; end if;
    update public.azioni set attesa_chiusa_il = coalesce(p_giorno, v_oggi) where id = p_azione;
  elsif p_cosa = 'annulla' then
    update public.azioni set attesa_dal = null, attesa_chiedi_il = null, attesa_chiusa_il = null where id = p_azione;
  else
    raise exception 'Cosa non riconosciuta: %', p_cosa;
  end if;
  select * into v_az from public.azioni where id = p_azione;
  return json_build_object('id', v_az.id, 'attesa_dal', v_az.attesa_dal, 'attesa_chiedi_il', v_az.attesa_chiedi_il, 'attesa_chiusa_il', v_az.attesa_chiusa_il);
end;
$function$;

revoke execute on function public.attesa_ordine(uuid, text, date) from public, anon;
grant execute on function public.attesa_ordine(uuid, text, date) to authenticated, service_role;

-- ↑ fine migrazione
do $$
declare
  v_prova   text[] := '{}';
  v_utente  public.utenti;
  v_altro   uuid;
  v_c       uuid;
  v_a       uuid;
  v_r       json;
  v_oggi    date := (now() at time zone 'Europe/Rome')::date;
  v_err     text;
begin
  -- nei panni di un partner vero (solo il suo id: niente dati cambiati, tutto annullato in fondo)
  select * into v_utente from public.utenti where auth_id is not null and ruolo <> 'Admin' order by nome limit 1;
  select id into v_altro from public.utenti where id <> v_utente.id and auth_id is not null limit 1;
  perform set_config('request.jwt.claim.sub', v_utente.auth_id::text, true);
  if public.utente_corrente() <> v_utente.id then raise exception 'utente_corrente non è il partner della prova'; end if;
  insert into public.contatti (user_id, nome, categoria) values (v_utente.id, 'ZZ Prova Attesa 025', 'Cliente') returning id into v_c;
  insert into public.azioni (user_id, contatto_id, categoria, tipo_azione, modalita, inizio, fine, esito, completata)
    values (v_utente.id, v_c, 'Cliente', 'Contatto', 'Telefonata', now() - interval '1 hour', now() - interval '55 minutes', 'Ordina da solo', true) returning id into v_a;
  -- la riga in sequenze c'è, senza rientro
  if not exists (select 1 from public.sequenze where chiave = 'Cliente-Contatto-Ordina da solo' and giorni_rientro is null) then raise exception 'manca la fase'; end if;
  v_prova := array_append(v_prova, 'fase in sequenze senza rientro');
  -- apri: dal = oggi, chiedi = oggi + 7
  v_r := public.attesa_ordine(v_a, 'apri');
  if (v_r->>'attesa_dal')::date <> v_oggi or (v_r->>'attesa_chiedi_il')::date <> v_oggi + 7 or v_r->>'attesa_chiusa_il' is not null then raise exception 'apri sbagliato: %', v_r; end if;
  v_prova := array_append(v_prova, 'apri → dal oggi, chiede tra 7');
  -- non ancora: altri 7 da oggi
  v_r := public.attesa_ordine(v_a, 'non_ancora');
  if (v_r->>'attesa_chiedi_il')::date <> v_oggi + 7 then raise exception 'non_ancora sbagliato: %', v_r; end if;
  v_prova := array_append(v_prova, 'non ancora → +7');
  -- chiudi con la data vera dell'ordine (ieri)
  v_r := public.attesa_ordine(v_a, 'chiudi', v_oggi - 1);
  if (v_r->>'attesa_chiusa_il')::date <> v_oggi - 1 then raise exception 'chiudi sbagliato: %', v_r; end if;
  v_prova := array_append(v_prova, 'chiudi → chiusa ieri');
  -- chiusa: non ancora / chiudi rifiutano
  begin
    perform public.attesa_ordine(v_a, 'non_ancora'); raise exception 'non doveva';
  exception when others then get stacked diagnostics v_err = message_text; if v_err <> 'Nessuna attesa aperta' then raise; end if; end;
  v_prova := array_append(v_prova, 'chiusa: «Non ancora» rifiutato');
  -- annulla: tutto vuoto
  v_r := public.attesa_ordine(v_a, 'annulla');
  if v_r->>'attesa_dal' is not null or v_r->>'attesa_chiedi_il' is not null or v_r->>'attesa_chiusa_il' is not null then raise exception 'annulla sbagliato: %', v_r; end if;
  v_prova := array_append(v_prova, 'annulla → vuoto');
  -- un altro partner non può toccarla
  if v_altro is not null then
    perform set_config('request.jwt.claim.sub', (select auth_id::text from public.utenti where id = v_altro), true);
    begin
      perform public.attesa_ordine(v_a, 'apri'); raise exception 'non doveva';
    exception when others then get stacked diagnostics v_err = message_text; if v_err not in ('Non è una tua azione') and not public.is_admin() then raise; end if; end;
    v_prova := array_append(v_prova, 'un altro partner: rifiutato (o Admin)');
  end if;
  raise exception 'PROVA FINITA, tutto ok: %', array_to_string(v_prova, ' · ');
end $$;
rollback;
