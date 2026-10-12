-- ═════════════════════════════════════════════════════════════
-- Nota Admin 013 · VENDITE → WALLET, parte MB21 (Ignazio 12/10)
-- Due campi facoltativi sulla vendita, che compila solo l'Admin dal modulo vendita:
--   pagato_con → come ha pagato il cliente: Contanti / Bonifico
--   incassato  → quanto ha pagato il cliente, in € (la provvigione resta nella vista vendite_conti)
-- Solo aggiunta: nessuna riga esistente cambia, l'app online non li usa, nessuna vista toccata.
-- I permessi sono quelli di tabella già dati a `vendite` (colonne nuove incluse): nessun GRANT nuovo.
-- Il segno «già mandata a Wallet» e la routine di Claude verranno dopo, quando Ignazio avrà provato i campi.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

alter table public.vendite
  add column pagato_con text check (pagato_con in ('Contanti', 'Bonifico')),
  add column incassato  numeric(10,2) check (incassato >= 0);

-- ── Solo l'Admin può scrivere i due campi (ok di Ignazio 12/10) ──
-- Un partner che salva la sua vendita non li manda; se provasse a scriverli, il database dice no.
-- Chi non passa dall'app (funzioni online con chiave di servizio, editor SQL: auth.uid() vuoto) non è bloccato.
create or replace function public.vendite_incasso_solo_admin() returns trigger
language plpgsql as $f$
begin
  if auth.uid() is not null and not public.is_admin() and (
       (tg_op = 'INSERT' and (new.pagato_con is not null or new.incassato is not null))
    or (tg_op = 'UPDATE' and (new.pagato_con is distinct from old.pagato_con or new.incassato is distinct from old.incassato))
  ) then
    raise exception 'Come ha pagato e incassato li compila solo l''Admin';
  end if;
  return new;
end $f$;

create trigger vendite_incasso_solo_admin before insert or update on public.vendite
  for each row execute function public.vendite_incasso_solo_admin();
