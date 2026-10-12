-- ═══════════════════════════════════════════════════════════
-- TRIGGER NUOVO su una tabella esistente (azioni): ok esplicito di Ignazio del 12/10/2026 («ok procedi con tutti e 2»). Si applica al rilascio,
-- dopo 20261012185500 (il campo) e prima di 20261012185700 (la vista).
-- Nota Azioni 030: un punto solo per tutte le strade che danno un esito (chiudi_azione, modifica_azione, «Cambia esito», foglio Modifica,
-- Riordini da sentire, Dashboard, MB Plan, scheda, e i loro Annulla). Il trigger tocca SOLO il campo nuovo `esito_il`, nient'altro.
--   · l'esito diventa vuoto (Annulla, riapertura)            → esito_il vuoto
--   · l'azione riceve il suo primo esito                      → esito_il = oggi (Roma)
--   · il «Riordino» di Glide (esito già scritto) si completa  → esito_il = oggi (Roma)
--   · un esito cambiato in un altro («Cambia esito»)          → esito_il resta quello di prima (si corregge l'esito, non il giorno)
-- Le righe NUOVE (coda, azioni scritte a mano già con l'esito) restano vuote: per loro conta il giorno dell'azione, che è quello vero.
-- ═══════════════════════════════════════════════════════════
create or replace function public.mb21_azione_esito_il()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.esito is null then
    new.esito_il := null;
  elsif old.esito is null
     or (old.esito = new.esito and not coalesce(old.completata, false) and coalesce(new.completata, false) and new.esito_il is null) then
    new.esito_il := (now() at time zone 'Europe/Rome')::date;
  end if;
  return new;
end;
$$;
revoke execute on function public.mb21_azione_esito_il() from public, anon, authenticated;

drop trigger if exists mb21_azione_esito_il on public.azioni;
create trigger mb21_azione_esito_il
  before update of esito, completata on public.azioni
  for each row execute function public.mb21_azione_esito_il();
