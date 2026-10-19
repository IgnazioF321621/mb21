-- ════════════════════════════════════════════════════════════════════════════
-- «Hai una risposta alla tua segnalazione» (nota Admin 016, Ignazio 19/10/2026): all'apertura dell'app un foglio come quello dei messaggi
-- mostra le risposte che l'Admin ha scritto e il partner non ha ancora letto; con «Ho capito» non tornano più, su nessun dispositivo.
-- SOLO AGGIUNTE (niente cambia per l'app online): un campo facoltativo `risposta_letta_il` e una funzione nuova che lo scrive.
-- Il partner NON può aggiornare `segnalazioni` (update solo Admin: regole e permessi esistenti restano com'erano): la funzione `security definer`
-- tocca solo quel campo, solo sulle righe del chiamante, solo se c'è una risposta. Se l'Admin cambia la risposta, l'app rimette il campo a vuoto.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.segnalazioni add column if not exists risposta_letta_il timestamptz;
create index if not exists segnalazioni_risposte_da_leggere on public.segnalazioni (user_id) where risposta is not null and risposta_letta_il is null;

create or replace function public.segna_risposte_lette(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if public.utente_corrente() is null then return 0; end if;
  update public.segnalazioni
     set risposta_letta_il = now()
   where id = any(p_ids)
     and user_id = public.utente_corrente()
     and risposta is not null
     and risposta_letta_il is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.segna_risposte_lette(uuid[]) from public, anon;
grant execute on function public.segna_risposte_lette(uuid[]) to authenticated;
comment on function public.segna_risposte_lette(uuid[]) is 'Nota Admin 016: il partner segna come lette le risposte alle proprie segnalazioni (solo risposta_letta_il, solo le sue)';
