-- Cantiere 24 · passo 3: promemoria 30 minuti prima dell'appuntamento.
-- L'orologio controlla ogni 5 minuti; la funzione Edge manda l'avviso agli appuntamenti che iniziano tra 25 e 35 minuti
-- e segna `promemoria_il` sull'azione, così un appuntamento riceve un promemoria solo.
alter table public.azioni add column if not exists promemoria_il timestamptz;
select cron.schedule('avviso-promemoria', '*/5 * * * *', $$select chiama_avvisi('promemoria')$$);
