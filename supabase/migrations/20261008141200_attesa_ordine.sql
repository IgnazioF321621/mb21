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
