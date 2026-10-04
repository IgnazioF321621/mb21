-- Il nome della serata negli incontri di Team e LdS (Pagine e Grafica, nota 022 · Ignazio 04/10/2026)
--   «Prepara la settimana» (MB Plan): gli incontri di gruppo (Team, LdS) hanno un campo in più, facoltativo, dove scrivere il nome della serata
--   (oppure la tipologia, la linea o la squadra: un campo libero solo). Vale per Team e LdS; la SdS/OPEN è sempre la stessa e non ha nome.
--   Si vede dove l'incontro compare: Programma della settimana, Agenda, timeline, settimana.
-- Una colonna NUOVA e facoltativa su `spazi`: l'app online di prima non la usa, quindi non cambia niente per chi la usa oggi. I permessi sono quelli della tabella.
-- NON APPLICATA: serve l'ok di Ignazio (CLAUDE.md § 4); va applicata PRIMA di pubblicare la versione nuova dell'app.
-- Per tornare indietro: `alter table public.spazi drop column nome;` (i nomi scritti si perdono, gli incontri restano).

alter table public.spazi add column nome text check (nome is null or char_length(nome) between 1 and 60);
