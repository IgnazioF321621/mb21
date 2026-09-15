-- ═══════════════════════════════════════════════════════════
-- Partner Select (cantiere 15, decisioni di Ignazio 15/09)
-- `utenti.nel_partner_select`: chi compare nel menu dell'Admin.
-- Tutti gli utenti sì, tranne i due non attivi indicati da Ignazio.
-- Nessuna regola di accesso nuova: l'Admin legge già tutte le righe.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.utenti add column nel_partner_select boolean not null default true;

update public.utenti set nel_partner_select = false
 where nome_cognome in ('Sandra Celestre', 'Belinda Vaccaro');

do $$
begin
  if (select count(*) from public.utenti where nel_partner_select = false) <> 2 then
    raise exception 'Attesi 2 utenti fuori dal Partner Select';
  end if;
end $$;
