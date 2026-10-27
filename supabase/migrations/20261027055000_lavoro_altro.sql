-- ═══════════════════════════════════════════════════════════
-- Nota Pagine 098 (Ignazio 27/10/2026, «sì»): nel «Tipo di lavoro» della scheda anche «Altro» (pensionato, studente, chi non lavora…).
-- MODIFICA di un vincolo che esiste (CLAUDE.md § 4, approvata da Ignazio): `contatti.lavoro` accettava solo 'dipendente' e 'autonomo'
-- (migrazione 20260922121614); ora anche 'altro'. I dati non cambiano: i 127 contatti con il tipo di lavoro restano com'erano
-- (copia prima della modifica: ~/mb21-import/copie/2026-10-27_contatti_lavoro.json, id e lavoro).
-- Lo Sharing tratta «altro» come «dipendente» (Ignazio, «B»: la traccia «Siamo nel mondo reale»), in sharing.js: niente qui.
-- `materiali.per_lavoro` resta dipendente/autonomo. Si applica al rilascio, prima di pubblicare l'app (che offre già «Altro»).
-- ═══════════════════════════════════════════════════════════
alter table public.contatti drop constraint if exists contatti_lavoro_check;
alter table public.contatti add constraint contatti_lavoro_check check (lavoro in ('dipendente', 'autonomo', 'altro'));
