-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» di MB App · l'avviso del Training, 5 minuti al giorno
-- 25 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisione di Ignazio (25/09): tutti i giorni, all'ora scelta nel Profilo → Avvisi (8 · 13 · 18 · 21, già impostato 13),
-- solo a chi quel giorno non si è ancora allenato (nessuna riga in training_giorni per oggi). Lo manda la funzione Edge
-- `avvisi`, tipo 'training'.
--
-- 1. imposta_avviso accetta anche la chiave «training» (ora: 8 · 13 · 18 · 21). Il resto identico a
--    20260923143237_avvisi_quando.sql: stesse chiavi e stessi valori di AVVISI_QUANDO (avvisi.js) e GIA_IMPOSTATO (regole.ts).
-- 2. L'orologio `avviso-training` ogni ora dalle 6 alle 20 UTC = dalle 8 alle 21 di Roma, sia con l'ora legale sia con la solare:
--    la funzione avvisa chi ha scelto l'ora di Roma di quel momento (ognuno una volta sola).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.imposta_avviso(p_tipo text, p_valore integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ammessi jsonb := '{"appuntamenti": [0, 5, 10, 15, 30, 60], "telefonate": [0, 5, 10, 15, 30, 60],
    "cose": [0, 5, 10, 15, 30, 60], "modelli": [0, 5, 10, 15, 30, 60],
    "com_e_andata": [30, 60, 120], "buongiorno": [7, 8, 9, 10], "check": [20, 21, 22], "training": [8, 13, 18, 21]}';
begin
  if p_valore is null or not coalesce(v_ammessi -> p_tipo, '[]') @> to_jsonb(p_valore) then
    raise exception 'Scelta non valida: % = %', p_tipo, p_valore;
  end if;
  update public.utenti set avvisi_quando = avvisi_quando || jsonb_build_object(p_tipo, p_valore)
  where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

select cron.schedule('avviso-training', '0 6-20 * * *', $$select chiama_avvisi('training')$$);
