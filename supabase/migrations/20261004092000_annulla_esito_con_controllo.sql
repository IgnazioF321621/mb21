-- «Annulla» di un esito dato dalla coda non riporta più un rientro vecchio (Azioni, nota 045 · 04/10/2026). `annulla_esito` cancellava l'azione dell'esito e rimetteva
-- il rientro di prima SENZA controllare se nel frattempo c'era stata un'altra azione: un Annulla da una seconda scheda aperta riportava un rientro vecchio.
-- Ora, se dopo quell'esito il contatto ha già un'altra azione con esito (creata dopo), rifiuta con un messaggio chiaro. Gli appuntamenti appena fissati (senza esito)
-- non contano: nascono dallo stesso giro. Stessa firma di prima: cambia solo il controllo.
-- MODIFICA di una funzione che esiste già e che l'app online usa: serve l'«ok» di Ignazio. Definizione di prima: 20260913230000_fase1_oggi.sql.
-- (La riflessione scritta dopo l'esito se ne va con l'esito annullato: è voluto, un esito annullato non ha più una riflessione. `annulla_catalogo` non si tocca.)
create or replace function public.annulla_esito(p_azione uuid, p_rientro date, p_in_coda date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contatto uuid;
  v_creato   timestamptz;
begin
  select contatto_id, creato_il into v_contatto, v_creato from public.azioni where id = p_azione;
  if v_contatto is null then raise exception 'Azione non trovata'; end if;
  if exists (select 1 from public.azioni a where a.contatto_id = v_contatto and a.id <> p_azione and a.esito is not null and a.creato_il > v_creato) then
    raise exception 'Dopo questo esito ce ne sono altri: non si può annullare';
  end if;
  delete from public.azioni where id = p_azione;
  update public.contatti set rientro_il = p_rientro, in_coda_dal = p_in_coda, aggiornato_il = now() where id = v_contatto;
end $$;
