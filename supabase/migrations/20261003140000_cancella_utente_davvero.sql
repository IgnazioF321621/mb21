-- ═══════════════════════════════════════════════════════════
-- Fondamenta e Backup, nota 025 parte 2 · «cancella davvero» un partner (diritto all'oblio), solo dopo la copia
-- 4 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- AGGIUNTA: una funzione nuova che l'app online non usa. Preparata con l'ok di Ignazio del 04/10/2026; la applica la Regia al rilascio.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21).
--
-- Quando serve: un partner chiede per iscritto di essere cancellato. Oggi «Elimina» in Admin è reversibile (eliminato_il) e lascia
-- tutto nel database. Questa funzione toglie davvero l'utente e, a cascata, tutto il suo (31 tabelle: contatti, azioni, vendite,
-- check, training, coach, obiettivi…), più il suo account di accesso (auth.users).
-- Protezioni, in ordine:
--   1. dall'app la chiama solo l'Admin (is_admin()); da Claude Code sul database (senza token) passa;
--   2. l'utente deve essere GIÀ eliminato in modo reversibile (eliminato_il non vuoto): prima «Elimina» in Admin, poi questa;
--   3. p_conferma deve essere la sua email esatta: niente cancellazioni per sbaglio di un altro id;
--   4. PRIMA si fa la copia con `python3 scripts/esporta_partner.py <email>` (file .xlsx sul disco LaCie): la funzione non può
--      controllarlo, quindi lo controlla chi la lancia; il risultato riporta quante righe sono sparite, tabella per tabella.
--   5. il trigger `mb21_niente_cancellazione` (migrazione 20261003130000) ferma ogni altro delete: qui passa perché la funzione
--      imposta `mb21.cancella_davvero = si` solo nella propria transazione.
-- Uso: select public.cancella_utente_davvero('<id utente>', 'email@esatta.it');
-- Per tornare indietro: `drop function public.cancella_utente_davvero(uuid, text);` (i dati cancellati tornano solo dalla copia .xlsx).
-- ═══════════════════════════════════════════════════════════

create or replace function public.cancella_utente_davvero(p_utente uuid, p_conferma text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.utenti;
  r record;
  n bigint;
  conti jsonb := '{}'::jsonb;
begin
  -- dall'app (c'è il token) solo l'Admin; da Claude Code sul database (nessun token) passa. Dentro una security definer current_user
  -- è sempre il proprietario e session_user è postgres anche nelle prove: per questo si guarda il token, non il ruolo.
  if coalesce(current_setting('request.jwt.claims', true), '') <> '' and not public.is_admin() then
    raise exception 'Solo l''Admin può cancellare davvero un utente';
  end if;
  select * into u from public.utenti where id = p_utente;
  if u.id is null then raise exception 'Utente non trovato'; end if;
  if u.eliminato_il is null then
    raise exception 'Prima si elimina l''utente dall''Admin (eliminazione reversibile), poi si cancella davvero';
  end if;
  if lower(trim(coalesce(p_conferma, ''))) <> lower(trim(coalesce(u.email, ''))) then
    raise exception 'La conferma deve essere l''email esatta dell''utente';
  end if;
  -- quante righe spariscono, tabella per tabella (tutte quelle con una chiave verso utenti)
  for r in
    select c.conrelid::regclass::text as t, a.attname as col
      from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
     where c.contype = 'f' and c.confrelid = 'public.utenti'::regclass and c.conrelid <> 'public.utenti'::regclass
  loop
    execute format('select count(*) from %s where %I = $1', r.t, r.col) into n using p_utente;
    if n > 0 then conti := conti || jsonb_build_object(replace(r.t, 'public.', '') || '.' || r.col, n); end if;
  end loop;
  perform set_config('mb21.cancella_davvero', 'si', true);
  if u.auth_id is not null then delete from auth.users where id = u.auth_id; end if;
  delete from public.utenti where id = p_utente;
  return jsonb_build_object('utente', u.id, 'email', u.email, 'nome', u.nome_cognome, 'cancellato_il', now(), 'righe_cancellate', conti);
end $$;
revoke execute on function public.cancella_utente_davvero(uuid, text) from public, anon;
grant execute on function public.cancella_utente_davvero(uuid, text) to authenticated, service_role;
comment on function public.cancella_utente_davvero(uuid, text) is 'Fondamenta 025: cancella davvero un utente già eliminato (eliminato_il), con conferma = email; prima si esporta con scripts/esporta_partner.py. Solo Admin.';
