-- Scheda contatto: «✅ Utente MB21» e niente «Invita nell'app MB21» se la persona è già utente dell'app.
-- Aggancio automatico (Ignazio 17/09, punto 1): codice Amway della scheda → email nel file Amway (squadra) → utente con quella email.
-- Niente confronto per nome (ognuno lo scrive come vuole) né per solo codice (la coppia lo condivide: in Amway c'è uno solo dei due,
-- e la sua scheda è l'unica col codice). Utenti eliminati esclusi. Punto 2 (collegamento a mano dall'Admin) da fare.
-- Security definer: ogni partner legge solo la propria riga di utenti; qui esce solo un sì/no.

drop function if exists public.e_gia_utente(text);

create or replace function public.e_utente_mb21(p_contatto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from contatti c
      join squadra s on s.partner_id = c.codice_amway
      join utenti u on lower(trim(u.email)) = lower(trim(s.email))
     where c.id = p_contatto and c.codice_amway is not null and s.email is not null and u.eliminato_il is null);
$$;
revoke all on function public.e_utente_mb21(uuid) from public;
grant execute on function public.e_utente_mb21(uuid) to authenticated;
