-- Cantiere 40 · lavoro 5 (Ignazio 22/09): «successivo al piano, oltre a uomo-donna, una domanda che si potrebbe fare è: è dipendente
-- o autonomo? Con questo ci potremmo switchare: come prima traccia, ai dipendenti "Siamo nel mondo reale", agli autonomi
-- "L'impresa ideale", per poi proseguire con il flusso già impostato».
--   contatti.lavoro   → 'dipendente' | 'autonomo' | vuoto (non ancora detto); si chiede quando serve, la prima volta dopo il PM
--   materiali.per_lavoro → la traccia che va per prima a chi fa quel lavoro (le due del PDF, fase 1)
alter table public.contatti add column if not exists lavoro text check (lavoro in ('dipendente', 'autonomo'));
alter table public.materiali add column if not exists per_lavoro text check (per_lavoro in ('dipendente', 'autonomo'));
update public.materiali set per_lavoro = 'dipendente' where tipo = 'traccia' and titolo = 'Siamo nel mondo reale';
update public.materiali set per_lavoro = 'autonomo'   where tipo = 'traccia' and titolo = 'L''impresa ideale';
comment on column public.contatti.lavoro is 'dipendente/autonomo, cantiere 40: dopo il PM la prima traccia cambia; vuoto = non ancora detto.';
comment on column public.materiali.per_lavoro is 'La traccia che va per prima a chi fa questo lavoro (dipendente → Siamo nel mondo reale · autonomo → L''impresa ideale).';
