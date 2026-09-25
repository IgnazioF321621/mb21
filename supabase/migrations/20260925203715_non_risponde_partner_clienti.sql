-- ═══════════════════════════════════════════════════════════
-- «No Risposta» e «Telefono spento» anche per Partner e Clienti (Ignazio 25/09: «come mai non ci sono più esiti
-- per una telefonata "no risposta" nella sezione azioni?»). In Glide c'erano (4 telefonate a Clienti e 2 a Partner
-- chiuse «No Risposta»); nella nuova app erano solo del Prospect, e del Cliente solo in coda.
-- Le regole di rientro, uguali al Prospect: No Risposta +2 giorni, Telefono spento +7. Servono a:
--   · `registra_esito` (coda in Dashboard): senza la riga dà «Fase non trovata»;
--   · `chiudi_appuntamento` (scheda e MB Plan): senza la riga l'esito si salva ma la persona non rientra in coda.
-- «Cliente-Contatto-No Risposta» c'è già dal 18/09 (20260918150000_clienti_in_coda.sql).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

insert into public.sequenze (categoria, tipo_azione, fase, coach, giorni_rientro, area) values
  ('Cliente', 'Contatto', 'Telefono spento', 'Cerca un altro canale',                  7, 'Prodotti'),
  ('Partner', 'Contatto', 'No Risposta',     'Riprova tra 2 giorni, orario diverso',   2, 'Attività'),
  ('Partner', 'Contatto', 'Telefono spento', 'Cerca un altro canale',                  7, 'Attività')
on conflict (chiave) do nothing;
