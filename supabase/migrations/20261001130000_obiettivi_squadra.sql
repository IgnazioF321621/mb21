-- Obiettivi del mese, passo 2 (Ignazio 01/10): la squadra, cioè le colonne della tabella dei Segni Vitali del Manuale che il foglio
-- «Obiettivi del mese» non aveva. Quattro campi nuovi, facoltativi (vuoto = nessun obiettivo): l'app online non li usa.
-- Scritta in modo da poter essere rilanciata senza danni (if not exists).
alter table public.obiettivi_mese
  add column if not exists linee_bonus integer,     -- Linee riceventi Bonus
  add column if not exists planner integer,         -- 15 Planner (persone del gruppo con almeno 15 Piani Marketing nel mese)
  add column if not exists prime_linee integer,     -- Prime linee
  add column if not exists totale_gruppo integer;   -- Totale gruppo
