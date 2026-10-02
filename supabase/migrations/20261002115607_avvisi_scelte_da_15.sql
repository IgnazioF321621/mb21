-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 010) · promemoria: tolte le scelte «all'ora», 5 e 10 minuti
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisione di Ignazio (02/10): il controllo dei promemoria passa da ogni minuto a ogni 5, quindi «prima di» si sceglie
-- solo 15 · 30 · 60 minuti. imposta_avviso (security definer) accetta per appuntamenti, telefonate, cose e modelli solo questi valori.
-- Il resto identico a 20260925104551_avviso_training.sql: stesse chiavi e valori di AVVISI_QUANDO (avvisi.js) e GIA_IMPOSTATO (regole.ts).
-- «Già impostato» ora: appuntamenti 30 · telefonate 15 · cose 15 · modelli 15 (si leggono dal codice, non da qui).
--
-- ⚠️ Modifica una funzione che esiste già: si applica al rilascio, con l'«ok» di Ignazio, insieme al passaggio delle sue scelte
-- vecchie (0) a 15 (dati veri: copia prima). Non tocca nessun dato.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.imposta_avviso(p_tipo text, p_valore integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ammessi jsonb := '{"appuntamenti": [15, 30, 60], "telefonate": [15, 30, 60],
    "cose": [15, 30, 60], "modelli": [15, 30, 60],
    "com_e_andata": [30, 60, 120], "buongiorno": [7, 8, 9, 10], "check": [20, 21, 22], "training": [8, 13, 18, 21]}';
begin
  if p_valore is null or not coalesce(v_ammessi -> p_tipo, '[]') @> to_jsonb(p_valore) then
    raise exception 'Scelta non valida: % = %', p_tipo, p_valore;
  end if;
  update public.utenti set avvisi_quando = avvisi_quando || jsonb_build_object(p_tipo, p_valore)
  where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;
