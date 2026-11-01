-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 168 (Ignazio 01/11/2026, «si ok» al valore nuovo): «Sessione di telefonate» in «Programmare la settimana».
-- Uno spazio senza nessuno, tipo `Telefonate`; aggiunte le persone diventa un appuntamento «Appuntamento · Lista/Contatti» (righe di `azioni`,
-- nessun cambio lì) e lo spazio si toglie. Qui solo un valore in più nel vincolo esistente dei tipi di `spazi` (MODIFICA approvata: si applica al
-- rilascio, prima del codice, con una copia di `spazi` prima). Nessun dato cambia; le regole di accesso e i permessi della tabella restano quelli.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════
alter table public.spazi drop constraint spazi_tipo_check;
alter table public.spazi add constraint spazi_tipo_check check (tipo in ('Piano Marketing', 'Consulenza PRD', 'SdS/OPEN', 'Team', 'LOS', 'Telefonate'));
