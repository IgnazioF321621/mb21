-- Cantiere 40 · lavoro 5: i promemoria della traccia condivisa (Ignazio 22/09: «le tracce audio hanno una durata di 72 ore:
-- l'ideale è che l'app mi ricordi di controllare se il candidato ha ascoltato la traccia dopo 24 ore e, se non ho messo
-- la spunta, dopo 48 ore, in modo da fare un promemoria al candidato stesso»).
-- Due avvisi sul telefono a chi ha condiviso, finché la condivisione non è segnata «ascoltata»: `avviso_24_il` e `avviso_48_il`
-- si scrivono dopo l'invio, così ogni avviso parte una volta sola. Controllo ogni 15 minuti; la funzione tace di notte (9-21 di Roma).
alter table public.condivisioni add column if not exists avviso_24_il timestamptz;
alter table public.condivisioni add column if not exists avviso_48_il timestamptz;
select cron.schedule('avviso-tracce', '4-49/15 * * * *', $$select chiama_avvisi('tracce')$$);
