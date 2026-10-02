-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 070) · «cosa manca per il prossimo traguardo» nell'avviso della sera
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Ignazio (02/10): nei complimenti della sera, la cosa che manca per il prossimo raggiungimento: prima il Leader 1° livello (la voce che manca),
-- poi il Leaders Club (le due voci), poi l'Executive (le tre). Le regole stanno nell'app (check.js → prossimoTraguardo, le stesse di «Cosa manca» e
-- «I prossimi passi») e non si copiano nel server: l'app, quando calcola il percorso, salva qui il risultato; l'avviso della sera lo legge.
-- AGGIUNTE (nessun dato esistente toccato): campo nuovo facoltativo `utenti.prossimo_traguardo` (jsonb: { nome, mancano[], mese, aggiornato_il }) e
-- funzione nuova `salva_prossimo_traguardo(p_dati)`: scrive solo il proprio campo (null = niente da dire). L'avviso lo usa solo se è del mese in corso
-- e aggiornato da non più di 4 giorni (se la persona non apre l'app, non si dice una cosa vecchia).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti add column if not exists prossimo_traguardo jsonb;

create or replace function public.salva_prossimo_traguardo(p_dati jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dati is not null and (jsonb_typeof(p_dati) <> 'object' or jsonb_typeof(p_dati -> 'mancano') <> 'array'
      or jsonb_array_length(p_dati -> 'mancano') > 5 or length(coalesce(p_dati ->> 'nome', '')) not between 1 and 60
      or length(coalesce(p_dati ->> 'mese', '')) <> 10 or length(p_dati::text) > 1500) then
    raise exception 'Traguardo non valido';
  end if;
  update public.utenti
     set prossimo_traguardo = case when p_dati is null then null else p_dati || jsonb_build_object('aggiornato_il', now()) end
   where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

revoke all on function public.salva_prossimo_traguardo(jsonb) from public, anon;
grant execute on function public.salva_prossimo_traguardo(jsonb) to authenticated;
