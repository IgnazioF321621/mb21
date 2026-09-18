-- Cantiere 31, lavoro 1 (Ignazio 18/09): «Avvio concluso» sulla scheda del Partner. Il giorno in cui lo sponsor dichiara concluso
-- l'avvio del nuovo partner: da lì la riga dell'avvio nella scheda diventa «Avvio concluso» e il partner
-- non compare più tra quelli da avviare. Vuoto = avvio aperto. Si può riaprire (torna vuoto).
-- La vista `contatti_lista` non cambia: la scheda lo legge da `contatti`, come fa per il compleanno, la coppia e il codice Amway.
alter table public.contatti add column if not exists avvio_concluso_il date;
comment on column public.contatti.avvio_concluso_il is 'Giorno in cui l''avvio del Partner (14 passi onb_*) è stato dichiarato concluso; vuoto = aperto. Cantiere 31.';
