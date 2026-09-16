-- ═══════════════════════════════════════════════════════════
-- Cantiere 19 lavoro 5 · scadenza che conta per il banner della Dashboard
-- Con l'abbonamento in comune vale la scadenza di chi paga, ma un partner non legge la riga degli altri:
-- questa funzione la restituisce solo per sé stessi (o per chiunque se chi chiede è l'Admin).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create function public.scadenza_abbonamento(p_utente uuid) returns date
language sql stable security definer set search_path = public as $$
  select coalesce(p.abbonamento_scadenza, case when u.abbonamento_con is null then u.abbonamento_scadenza end)
    from utenti u left join utenti p on p.id = u.abbonamento_con
   where u.id = p_utente and (u.id = utente_corrente() or is_admin());
$$;
revoke all on function public.scadenza_abbonamento(uuid) from public;
grant execute on function public.scadenza_abbonamento(uuid) to authenticated;
