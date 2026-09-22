-- ═══════════════════════════════════════════════════════════
-- Cantiere 41 · L'Agenda come NotePlan — il modulo Core N21 nel foglio e le sezioni (Ignazio 22/09/2026)
--   modello_giorno.sezione → il titolo sotto cui la voce compare nel foglio («Core» per le 7 abitudini del modulo
--                            «Le 7 abitudini della persona Core» di N21; «Routine» per le voci personali, o il nome che vuole l'utente).
--   modello_giorno.scala   → su che scala vive la voce (giorno · settimana · mese · periodo · anno): «Ascoltare 1 CD al giorno» è
--                            del giorno, «8 Piani Marketing al mese» del mese, «OPEN settimanale» della settimana.
--   cose_da_fare.core      → la spunta a mano di un'abitudine Core che l'app non sa misurare da sola (OPEN, counseling…):
--                            una riga per utente, abitudine e giorno (= primo giorno della scala).
-- Le abitudini Core misurabili (CD, pagine, PM, clienti) si spuntano da sole da Check e azioni (regola in agenda.js).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.modello_giorno
  add column sezione text not null default 'Routine' check (char_length(sezione) between 1 and 40),
  add column scala text not null default 'giorno' check (scala in ('giorno', 'settimana', 'mese', 'periodo', 'anno'));

alter table public.cose_da_fare
  add column core text check (char_length(core) <= 20);
create unique index cose_da_fare_core_giorno on public.cose_da_fare (user_id, core, giorno) where core is not null;
