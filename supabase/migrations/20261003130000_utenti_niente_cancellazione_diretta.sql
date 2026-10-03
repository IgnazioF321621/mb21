-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 025 parte 1 (audit del 03/10/2026) · nessuna cancellazione diretta di un utente
-- 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- ⚠️ AGGIUNGE un trigger a una tabella esistente (`utenti`): ok di Ignazio del 03/10/2026 a prepararla. La applica la Regia al rilascio.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- Cosa non va: 31 chiavi esterne puntano a `utenti` con `on delete cascade` (contatti, azioni, vendite, check, training, coach,
-- obiettivi…). Cancellare una riga di `utenti` dal pannello di Supabase, o con una query sbagliata, o dall'Admin via API (la regola
-- `utenti_write_admin` glielo permette), cancella TUTTI i dati di quel partner, senza avviso e senza copia. L'app non lo fa mai
-- (l'Admin usa l'eliminazione logica: `eliminato_il`), e nessuna funzione fa `delete from utenti`.
-- Cosa fa: un trigger BEFORE DELETE su `utenti` ferma la cancellazione con un messaggio chiaro. Si cancella davvero solo da una
-- funzione apposita (nota 025 parte 2, da fare: copia dei dati prima, su richiesta scritta del partner) che, prima del delete,
-- imposta `set_config('mb21.cancella_davvero', 'si', true)` nella propria transazione.
-- Nessun cambiamento per chi usa l'app. Per tornare indietro: `drop trigger mb21_niente_cancellazione on public.utenti; drop function public.mb21_niente_cancellazione();`
-- ═══════════════════════════════════════════════════════════

create or replace function public.mb21_niente_cancellazione() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('mb21.cancella_davvero', true), '') <> 'si' then
    raise exception 'Un utente non si cancella direttamente: con lui sparirebbero tutti i suoi dati (contatti, azioni, check…). Nell''app si usa «Elimina» (eliminazione reversibile, eliminato_il). La cancellazione vera, con copia prima, passa da una funzione apposita (nota Fondamenta 025).'
    using errcode = 'P0001';
  end if;
  return old;
end $$;
revoke execute on function public.mb21_niente_cancellazione() from public, anon, authenticated;

drop trigger if exists mb21_niente_cancellazione on public.utenti;
create trigger mb21_niente_cancellazione before delete on public.utenti for each row execute function public.mb21_niente_cancellazione();
comment on trigger mb21_niente_cancellazione on public.utenti is 'Fondamenta 025: ferma il delete diretto (cascata su 31 tabelle); passa solo con set_config(''mb21.cancella_davvero'', ''si'', true) nella funzione di cancellazione vera.';
