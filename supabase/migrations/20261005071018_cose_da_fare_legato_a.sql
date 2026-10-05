-- ════════════════════════════════════════════════════════════════════════════
-- MB Plan «Da fare» (Ignazio 05/10/2026): ogni cosa da fare si lega a una persona della lista (`contatto_id`, già c'è) oppure a un gruppo:
--   `legato_a` = 'Team' · 'LdS' · 'N21' (Network 21) · 'Amway'. Il campo è facoltativo nel database (le cose già scritte non ce l'hanno
--   e si vedono con «Da collegare»): è l'app che non fa salvare una cosa nuova senza «Per chi è?».
--   `ripeti` = 'settimana' | 'mese': la cosa, quando si spunta, ricompare da sola la settimana (o il mese) dopo (regola in agenda.js, prossimaRipetizione).
-- Solo due campi nuovi facoltativi: l'app online non lo usa, quindi si può applicare in qualsiasi momento; l'app nuova ne ha bisogno.
-- Nessun permesso da aggiungere: i GRANT e le regole della tabella valgono per le sue colonne.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.cose_da_fare
  add column if not exists legato_a text check (legato_a is null or legato_a in ('Team', 'LdS', 'N21', 'Amway')),
  add column if not exists ripeti text check (ripeti is null or ripeti in ('settimana', 'mese'));
