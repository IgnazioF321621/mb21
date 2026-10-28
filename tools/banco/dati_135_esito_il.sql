-- Nota Pagine 135 · DATI VERI: non è una migrazione. Lo lancia la Regia al rilascio, SOLO con l'ok di Ignazio sui dati, dopo la migrazione
-- 20261028210000_esito_il_contatti_vecchi.sql. Mette a posto i contatti vecchi già registrati con `esito_il` = il giorno in cui sono stati scritti:
-- Contatto con esito, scritto lo stesso giorno dell'esito, con la data dell'azione prima di quel giorno → `esito_il` = il giorno dell'azione.
-- Al 28/10/2026 sera (lettura dall'archivio, solo conteggi): 6 righe con esito_il 28/10 (scelte a mano, date 2020-2025) e 1 con esito_il 22/10.
-- Gli appuntamenti (PM, Consulenza…) non si toccano: per loro esito_il non conta (contano nel giorno dell'incontro).

-- 1) la copia: si salva il risultato in tools/banco/copie/azioni_esito_il_prima_135.json (solo id e date, niente nomi)
select id, inizio, creato_il, esito_il
from public.azioni
where tipo_azione = 'Contatto' and esito is not null and esito_il is not null
  and (creato_il at time zone 'Europe/Rome')::date = esito_il
  and (inizio at time zone 'Europe/Rome')::date < esito_il
order by esito_il, inizio;

-- 2) la correzione (stesse condizioni della copia; il trigger scatta solo su esito e completata, quindi non riscrive esito_il)
update public.azioni
set esito_il = (inizio at time zone 'Europe/Rome')::date
where tipo_azione = 'Contatto' and esito is not null and esito_il is not null
  and (creato_il at time zone 'Europe/Rome')::date = esito_il
  and (inizio at time zone 'Europe/Rome')::date < esito_il;
