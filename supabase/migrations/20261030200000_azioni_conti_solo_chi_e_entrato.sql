-- Nota Fondamenta 012, punto 2 (audit della Regia del 30/10/2026; «sì» di Ignazio, girato dalla Regia il 30/10).
-- La vista azioni_conti girava con i permessi di chi l'ha creata: le regole di accesso di `azioni`
-- non valevano, e con la sola chiave pubblica (senza entrare) si leggevano utente, contatto, giorno,
-- tipo ed esito delle azioni conteggiate (senza nomi).
-- Ora gira con i permessi di chi legge (come check_giorni_conti, vendite_conti, contatti_coda,
-- contatti_lista e check_mesi): ognuno vede le sue righe, l'Admin tutte (regola azioni_own).
-- In più chi non è entrato non ha più il permesso di leggerla.
--
-- È una MODIFICA di una vista esistente (CLAUDE.md § 4): la applica la Regia al rilascio.
-- Provata il 30/10/2026 in transazione annullata sul database vero: righe e conteggi di
-- azioni_conti e check_giorni_conti identici prima e dopo per l'Admin e per l'altra utente,
-- anon respinto.
-- Prova dopo l'applicazione: curl /rest/v1/azioni_conti con la chiave pubblica senza token → 401;
-- poi Oggi (contatti della settimana) e il Check da entrato, come prima.

alter view public.azioni_conti set (security_invoker = true);
revoke select, insert, update, delete, truncate, references, trigger on public.azioni_conti from anon;
grant select on public.azioni_conti to authenticated, service_role;
