-- ═══════════════════════════════════════════════════════════
-- Prova gratuita di 15 giorni per chi entra per la prima volta (richiesta di Ignazio 16/09:
-- «per uno nuovo che non è mai stato iscritto i primi 15 giorni gratuiti, scadenza automatica dalla registrazione»).
-- Vale per ogni utente creato da zero: approvazione di una richiesta dal link (`approva_richiesta`) e «＋ Nuovo utente».
-- Non vale per: utente eliminato e ripristinato (è un update, non un nuovo utente) · abbonamento in comune
-- (conta la scadenza di chi paga) · Admin · scadenza già scritta.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.mb21_prova_gratuita()
returns trigger
language plpgsql
as $$
begin
  if new.abbonamento_scadenza is null and new.abbonamento_con is null and coalesce(new.ruolo, 'ABO') <> 'Admin' then
    new.abbonamento_scadenza := (now() at time zone 'Europe/Rome')::date + 15;
  end if;
  return new;
end;
$$;

create trigger mb21_prova_gratuita
  before insert on public.utenti
  for each row execute function public.mb21_prova_gratuita();
