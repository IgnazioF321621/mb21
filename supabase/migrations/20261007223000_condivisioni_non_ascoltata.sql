-- Nota Pagine 039 (feedback di Carolina, scelta B di Ignazio 07/10/2026): «Non l'ha ascoltata».
-- Un campo nuovo facoltativo: il giorno in cui il partner ha segnato che la persona non ha ascoltato la traccia.
-- Da quel momento la traccia esce da «Tracce condivise» della Dashboard e resta nella scheda (Sharing) come «non ascoltata».
-- Aggiunta pura: l'app di oggi non lo legge; i permessi della tabella (grant a authenticated, RLS di condivisioni) valgono anche per lui.
alter table public.condivisioni add column if not exists non_ascoltata_il date;
comment on column public.condivisioni.non_ascoltata_il is 'Nota Pagine 039: giorno in cui il partner ha segnato «Non l''ha ascoltata» (vuoto = ascoltata o ancora in attesa)';
