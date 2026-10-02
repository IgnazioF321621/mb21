-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 060) · pausa con «0 contatti al giorno»
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisione di Ignazio (18/09, confermata il 02/10): chi sceglie 0 contatti al giorno è in pausa: niente coda e niente Dare Seguito
-- scaduti, niente «Buongiorno» del mattino (a meno che abbia già qualcosa di programmato: appuntamenti, riordini).
-- Oggi il database vieta lo zero: il vincolo `utenti_contatti_al_giorno_check` vuole da 1 a 10 e `imposta_contatti_al_giorno` rifiuta lo 0.
-- Questa migrazione li allarga a 0-10. Nessun dato cambia (tutti hanno già da 1 a 10), il predefinito resta 5.
-- ⚠️ MODIFICA un vincolo e una funzione esistenti: si applica al rilascio, con l'«ok» di Ignazio. Va applicata PRIMA di pubblicare
-- l'app nuova (l'app vecchia non offre lo 0, quindi non ne risente). Per tornare indietro: rimettere 1-10 (con nessuno a 0).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti drop constraint utenti_contatti_al_giorno_check;
alter table public.utenti add constraint utenti_contatti_al_giorno_check check (contatti_al_giorno between 0 and 10);

create or replace function public.imposta_contatti_al_giorno(p_numero integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_numero is null or p_numero < 0 or p_numero > 10 then
    raise exception 'Contatti al giorno: da 0 (pausa) a 10';
  end if;
  update public.utenti set contatti_al_giorno = p_numero where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;
