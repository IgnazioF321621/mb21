-- Nota Pagine 139 · DATI VERI: non è una migrazione. Ok di Ignazio del 29/10/2026 («sì», via Regia). Lo lancia la Regia al rilascio, DOPO la migrazione
-- 20261029063500_esito_il_solo_fatti_davvero.sql. Da quella migrazione un Contatto conta solo nel giorno di esito_il: perché i conti passati restino
-- identici, le azioni con esito, senza esito_il e col giorno già arrivato (fino a oggi) prendono esito_il = il loro giorno (com'erano contate finora).
-- Restano vuote, e quindi non contano mai da sole: le azioni col giorno nel futuro (al 29/10 mattina 16: 11 Riordino Glide, 2 Glide, 3 dell'app)
-- e quella senza data. Al 29/10/2026 mattina (lettura, solo conteggi): 1609 righe.
-- Il trigger scatta solo su esito e completata: questo update (solo esito_il) non lo fa scattare.

-- 1) la copia: si salva il risultato in tools/banco/copie/azioni_esito_il_prima_139.json (solo id, esito_il vuoto: niente nomi)
select id, esito_il
from public.azioni
where esito is not null and esito_il is null and inizio is not null
  and (inizio at time zone 'Europe/Rome')::date <= (now() at time zone 'Europe/Rome')::date
order by id;

-- 2) la correzione (stesse condizioni della copia)
update public.azioni
set esito_il = (inizio at time zone 'Europe/Rome')::date
where esito is not null and esito_il is null and inizio is not null
  and (inizio at time zone 'Europe/Rome')::date <= (now() at time zone 'Europe/Rome')::date;

-- Per tornare indietro: update public.azioni set esito_il = null where id in (<gli id della copia>);
