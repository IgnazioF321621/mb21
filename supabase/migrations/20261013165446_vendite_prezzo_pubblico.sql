-- ═════════════════════════════════════════════════════════════
-- Nota Pagine 052 · prezzo al pubblico nella vendita, e incasso aperto a tutti (Ignazio 13/10/2026)
-- 1. Aggiunta: `prezzo_pubblico`, il prezzo al pubblico del giorno della vendita, scritto a mano (in una riga possono stare più
--    prodotti). Facoltativo; resta com'è anche se i prezzi cambiano. Permessi: quelli di tabella già dati a `vendite`.
-- 2. Modifica (ok esplicito di Ignazio, nota 052): «Come ha pagato» (pagato_con) e «Incassato» (incassato) li compila ogni utente
--    sulle sue vendite; il blocco `vendite_incasso_solo_admin` resta solo sui dati di Wallet (wallet_il, wallet_id).
--    Com'era prima: migrazione 20261013055311_vendite_wallet_solo_admin.sql (copia anche in ~/evernote/copie/2026-10-13/).
--    Chi non passa dall'app (routine Wallet con chiave di servizio, editor SQL: auth.uid() vuoto) non è bloccato, come prima.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═════════════════════════════════════════════════════════════

alter table public.vendite
  add column if not exists prezzo_pubblico numeric(10,2) check (prezzo_pubblico >= 0);
comment on column public.vendite.prezzo_pubblico is 'Nota Pagine 052: prezzo al pubblico del giorno della vendita (€), scritto a mano; facoltativo';

create or replace function public.vendite_incasso_solo_admin() returns trigger
language plpgsql as $f$
begin
  if auth.uid() is not null and not public.is_admin() and (
       (tg_op = 'INSERT' and (new.wallet_il is not null or new.wallet_id is not null))
    or (tg_op = 'UPDATE' and (new.wallet_il is distinct from old.wallet_il or new.wallet_id is distinct from old.wallet_id))
  ) then
    raise exception 'I dati di Wallet li compila solo l''Admin';
  end if;
  return new;
end $f$;
