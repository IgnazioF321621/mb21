-- ═══════════════════════════════════════════════════════════
-- Prova gratuita: 15 giorni dal giorno in cui l'Admin abilita l'utente, non da quando viene creato
-- (Ignazio 16/09: «se io perdo tempo, loro perdono la possibilità di lavorarci»).
-- Scatta quando «Può entrare» si accende (insert già abilitato, come `approva_richiesta`, o update da spento ad acceso)
-- e l'utente non ha mai avuto una scadenza. Non vale per abbonamento in comune (conta chi paga) né per l'Admin.
-- Sostituisce la regola di `20260916220000_prova_gratuita.sql` (che scattava alla creazione).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

drop trigger if exists mb21_prova_gratuita on public.utenti;

create or replace function public.mb21_prova_gratuita()
returns trigger
language plpgsql
as $$
begin
  if new.accesso_attivo
     and (tg_op = 'INSERT' or not coalesce(old.accesso_attivo, false))
     and new.abbonamento_scadenza is null
     and new.abbonamento_con is null
     and coalesce(new.ruolo, 'ABO') <> 'Admin' then
    new.abbonamento_scadenza := (now() at time zone 'Europe/Rome')::date + 15;
  end if;
  return new;
end;
$$;

create trigger mb21_prova_gratuita
  before insert or update of accesso_attivo on public.utenti
  for each row execute function public.mb21_prova_gratuita();
