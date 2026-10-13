-- ═════════════════════════════════════════════════════════════
-- Nota Pagine 054 · riordino «A rottura» per i pezzi di ricambio (Ignazio 14/10/2026, per tutti i partner)
-- Solo aggiunta, due campi facoltativi sulla vendita:
--   riordino_a_rottura → la vendita non ha una data di riordino perché il pezzo si riordina quando si rompe
--                        (distingue «A rottura» dallo storico senza data); default false: nessuna vendita esistente cambia
--   durata_mesi        → «di solito dura N mesi»: solo da leggere nella scheda › Vendite, mai promemoria né scadenze
-- Con «A rottura» il riordino resta vuoto: il trigger mb21_vendita_agenda (non toccato) non crea la telefonata, e
-- Riordini da sentire, avvisi, calendario e «Prossimo riordino» la saltano come già fanno con lo storico senza data.
-- Permessi: quelli di tabella già dati a `vendite`. Nessuna vista toccata (vendite_conti resta com'è).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio, prima della pubblicazione.
-- ═════════════════════════════════════════════════════════════

alter table public.vendite
  add column if not exists riordino_a_rottura boolean not null default false,
  add column if not exists durata_mesi smallint check (durata_mesi between 1 and 120);
comment on column public.vendite.riordino_a_rottura is 'Nota Pagine 054: si riordina quando si rompe (niente data, niente telefonata)';
comment on column public.vendite.durata_mesi is 'Nota Pagine 054: di solito dura N mesi, solo informativo';
