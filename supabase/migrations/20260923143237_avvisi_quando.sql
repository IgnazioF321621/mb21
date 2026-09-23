-- ═══════════════════════════════════════════════════════════
-- Cantiere 43, lavoro 2 · «Avvisi» nel Profilo: ognuno sceglie QUANDO
-- 23 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisioni di Ignazio (23/09, schizzo approvato): per ogni tipo di avviso si sceglie
-- solo il tempo, niente «spento». Chi non tocca niente ha i valori «già impostato».
--
-- SOLO AGGIUNTE, niente di esistente cambia:
-- 1. utenti.avvisi_quando: le scelte di ognuno, solo quelle cambiate.
--    Vuoto ({}) = tutti i valori «già impostato» (scritti nell'app, `AVVISI_QUANDO` in avvisi.js,
--    e dal lavoro 3 nella funzione Edge `avvisi`). Lo legge solo il proprietario (e l'Admin),
--    come tutta la riga di `utenti`.
--    Chiavi e valori ammessi:
--      appuntamenti · telefonate · cose · modelli → minuti prima: 0 (all'ora) · 5 · 10 · 15 · 30 · 60
--      com_e_andata → minuti dopo: 30 · 60 · 120
--      buongiorno   → ora: 7 · 8 · 9 · 10
--      check        → ora: 20 · 21 · 22
-- 2. imposta_avviso(p_tipo, p_valore): l'utente cambia una sua scelta, e solo la sua.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti add column avvisi_quando jsonb not null default '{}'::jsonb;

-- `utenti` si modifica solo da Admin (regole di accesso): questa funzione apre
-- all'utente le sue scelte, e solo quelle (come imposta_contatti_al_giorno).
create function public.imposta_avviso(p_tipo text, p_valore integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ammessi jsonb := '{"appuntamenti": [0, 5, 10, 15, 30, 60], "telefonate": [0, 5, 10, 15, 30, 60],
    "cose": [0, 5, 10, 15, 30, 60], "modelli": [0, 5, 10, 15, 30, 60],
    "com_e_andata": [30, 60, 120], "buongiorno": [7, 8, 9, 10], "check": [20, 21, 22]}';
begin
  if p_valore is null or not coalesce(v_ammessi -> p_tipo, '[]') @> to_jsonb(p_valore) then
    raise exception 'Scelta non valida: % = %', p_tipo, p_valore;
  end if;
  update public.utenti set avvisi_quando = avvisi_quando || jsonb_build_object(p_tipo, p_valore)
  where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

revoke all on function public.imposta_avviso(text, integer) from public, anon;
grant execute on function public.imposta_avviso(text, integer) to authenticated;
