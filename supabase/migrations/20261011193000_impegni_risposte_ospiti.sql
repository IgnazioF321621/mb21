-- Nota Pagine 047 (Ignazio 11/10/2026): la SdS/OPEN è una sola, quella dell'Admin, condivisa con tutto il Team.
-- Chi la riceve conferma la presenza e scrive gli ospiti con il nome, anche più tardi (riaprendo la serata).
-- Solo un'aggiunta: un campo facoltativo `ospiti` (elenco di nomi) nella propria riga di `impegni_risposte`.
-- Le regole di accesso restano quelle di prima: ognuno legge e scrive le sue righe, l'Admin tutte («impegni_risposte_own»);
-- i permessi della tabella valgono già per il campo nuovo. Nessuna funzione esistente cambia (risposte_impegno e impegni_ricevuti restano come sono).
alter table public.impegni_risposte
  add column if not exists ospiti text[];
comment on column public.impegni_risposte.ospiti is 'Nota Pagine 047: i nomi degli ospiti che porta chi partecipa (SdS/OPEN del Team); null = nessuno';
