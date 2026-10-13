-- ═════════════════════════════════════════════════════════════
-- Nota Admin 013 · il blocco «solo Admin» copre anche wallet_il e wallet_id (ok di Ignazio 13/10)
-- Stessa funzione e stesso trigger di 20261012233952_vendite_incasso.sql (vendite_incasso_solo_admin), con due campi in più.
-- Chi non passa dall'app (procedura di invio a Wallet con chiave di servizio, editor SQL: auth.uid() vuoto) non è bloccato.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═════════════════════════════════════════════════════════════

create or replace function public.vendite_incasso_solo_admin() returns trigger
language plpgsql as $f$
begin
  if auth.uid() is not null and not public.is_admin() and (
       (tg_op = 'INSERT' and (new.pagato_con is not null or new.incassato is not null or new.wallet_il is not null or new.wallet_id is not null))
    or (tg_op = 'UPDATE' and (new.pagato_con is distinct from old.pagato_con or new.incassato is distinct from old.incassato
                           or new.wallet_il is distinct from old.wallet_il or new.wallet_id is distinct from old.wallet_id))
  ) then
    raise exception 'Come ha pagato, incassato e i dati di Wallet li compila solo l''Admin';
  end if;
  return new;
end $f$;
