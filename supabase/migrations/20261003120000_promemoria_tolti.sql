-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi) · i promemoria prima degli impegni escono dall'app
-- 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Ignazio 03/10: appuntamenti, telefonate, cose da fare e voci dei modelli li avvisa il calendario di ognuno (Apple o Google),
-- non più l'app. Restano gli avvisi sull'attività nel suo insieme: Buongiorno, sera (il Check), «Com'è andata?» (serve per avere gli esiti),
-- Training e le tracce condivise.
-- Cosa fa: spegne l'orologio `avviso-promemoria` (ogni 5 minuti, dalle 04:00 alle 22:55 UTC, jobid 3). Niente più chiamate alla funzione
-- Edge per i promemoria: calano anche i registri di Supabase.
-- Non tocca: `promemoria_da_mandare()` e il ramo «promemoria» di `avvisi_da_fare()` restano nel database, inutilizzati e innocui; la funzione Edge
-- `avvisi`, se un orologio vecchio la chiamasse ancora con il tipo «promemoria», risponde «saltato» senza fare niente.
-- ⚠️ Spegne un'attività programmata esistente: si applica al rilascio, nel solito ordine (migrazioni → app → funzione). Prima o dopo la funzione
-- nuova non cambia: senza orologio, il tipo «promemoria» non viene più chiamato.
-- Per tornare indietro: `select cron.schedule('avviso-promemoria', '*/5 4-22 * * *', $$select chiama_avvisi('promemoria') where promemoria_da_mandare()$$);`
-- (e la funzione `avvisi` di prima del 03/10). I segni «già avvisato» (avvisi_mandati) li pulisce ora l'ultimo giro della sera (alle 22 di Roma).
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

select cron.unschedule(jobid) from cron.job where jobname = 'avviso-promemoria';
