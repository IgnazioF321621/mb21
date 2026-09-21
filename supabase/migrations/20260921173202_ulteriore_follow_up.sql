-- ═══════════════════════════════════════════════════════════
-- Cantiere 39 · GLI ESITI — «DS Fissato» → «Ulteriore Follow Up» (decisione di Ignazio del 21/09)
-- Tra i risultati di un Follow Up «DS Fissato» (nome di Glide) sembrava il Follow Up stesso («è come Presentazione nel PM,
-- non serve»); quello che serve è il «ci rivediamo», come «Richiamare» per le telefonate: «Ulteriore Follow Up».
-- Si rinomina la fase che c'è già, così restano la sua regola di rientro (Prospect +2 giorni, Partner senza giorni) e la
-- frase del coach. `sequenze.chiave` e `azioni.chiave` sono calcolate e si rifanno da sole. Al 21/09: 1 azione (di Glide).
-- Nessuna funzione e nessuna vista del database cita «DS Fissato»; la coda lo riconosce in coda.js → FASI_DARE_SEGUITO.
-- ⚠️ Si applica INSIEME alla pubblicazione dell'app.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

update public.sequenze set fase = 'Ulteriore Follow Up' where fase = 'DS Fissato';
update public.azioni   set esito = 'Ulteriore Follow Up' where esito = 'DS Fissato';
