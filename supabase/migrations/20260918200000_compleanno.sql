-- Cantiere 30, lavoro A (Ignazio 18/09): il compleanno del contatto, letto dalla rubrica del telefono, da mostrare nella scheda
-- («domani potremmo mandare messaggi di auguri»). Una data sola: quando l'anno non si sa si scrive 1604, la stessa convenzione
-- dell'iPhone; per «chi compie gli anni oggi» basta guardare giorno e mese.
-- La vista `contatti_lista` non cambia: la scheda legge il compleanno da `contatti`, come fa per la coppia e il codice Amway.
alter table public.contatti add column if not exists compleanno date;
comment on column public.contatti.compleanno is 'Compleanno; anno 1604 = anno non noto (convenzione iPhone). Cantiere 30.';
