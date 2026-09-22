-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · pulizia (22/09/2026): via dal modello le 5 voci «Core» inventate prima del PDF ufficiale
--   (Leggere 15 minuti · Ascoltare una traccia · I contatti del giorno · Il Check della sera · Usare e mostrare i prodotti,
--   chiavi lettura · traccia · contatti · check · prodotti con scala giorno e sezione Routine). Erano finite nel foglio come
--   «Routine» e la chiave `prodotti` bloccava la voce Core vera «Consumare i prodotti Amway». Con loro vanno le loro spunte (cascade).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

delete from public.modello_giorno
 where core in ('lettura', 'traccia', 'contatti', 'check')
    or (core = 'prodotti' and sezione = 'Routine' and scala = 'giorno');
