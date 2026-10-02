-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 020) · meno chiamate alla funzione «avvisi», per i registri di Supabase
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Perché: il limite gratuito dei registri è in comune con Zona Tracker (0,90 GB su 1 dopo 17 giorni) e la funzione partiva circa
-- 1.850 volte al giorno (promemoria ogni minuto = 1.440). Via di mezzo scelta da Ignazio il 02/10: si scende a circa 400 al giorno.
-- Gli orari sono UTC (Roma = UTC+2 con l'ora legale, +1 con la solare); la funzione stessa filtra l'ora di Roma, qui si tolgono
-- solo le chiamate inutili, con un'ora di margine per la solare:
--  · promemoria: ogni 5 minuti, dalle 04:00 alle 22:55 UTC (= dalle 6 a mezzanotte circa); prima ogni minuto, tutto il giorno
--  · «Com'è andata?» (senza_esito): ogni 15 minuti (minuti 2, 17, 32, 47); prima ogni 5
--  · tracce: ogni 15 minuti dalle 07:04 alle 20:49 UTC (la funzione avvisa solo dalle 9 alle 21 di Roma); prima tutto il giorno
-- Dipende da 20261002115607_avvisi_scelte_da_15.sql: con il controllo ogni 5 minuti «all'ora», 5′ e 10′ non sarebbero puntuali (da 15′ in su sì:
-- l'avviso parte tra N e N−5 minuti prima). Cambia attività programmate esistenti: serve l'«ok» di Ignazio (dato il 02/10).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

select cron.alter_job((select jobid from cron.job where jobname = 'avviso-promemoria'), schedule => '*/5 4-22 * * *');
select cron.alter_job((select jobid from cron.job where jobname = 'avviso-senza-esito'), schedule => '2-47/15 * * * *');
select cron.alter_job((select jobid from cron.job where jobname = 'avviso-tracce'), schedule => '4-49/15 7-20 * * *');
