-- Scheda contatto: «🔗 Invita nell'app MB21» sparisce se la persona è già utente dell'app.
-- Ogni partner legge solo la propria riga di utenti, quindi il confronto lo fa il database e risponde solo sì/no.
-- Confronto per NOME (maiuscole e ordine delle parole ignorati), non per codice Amway: la coppia ha lo stesso codice
-- ma non è detto che siano registrati tutti e due (Ignazio 17/09). Utenti eliminati esclusi.

create or replace function public.chiave_nome(p_nome text) returns text
language sql immutable as $$
  select array_to_string(array(
    select w from unnest(regexp_split_to_array(lower(trim(coalesce(p_nome, ''))), '\s+')) w where w <> '' order by w), ' ');
$$;

create or replace function public.e_gia_utente(p_nome text) returns boolean
language sql stable security definer set search_path = public as $$
  select chiave_nome(p_nome) <> '' and exists (
    select 1 from utenti u where u.eliminato_il is null and chiave_nome(u.nome_cognome) = chiave_nome(p_nome));
$$;
revoke all on function public.chiave_nome(text) from public;
revoke all on function public.e_gia_utente(text) from public;
grant execute on function public.chiave_nome(text) to authenticated;
grant execute on function public.e_gia_utente(text) to authenticated;
