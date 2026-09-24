-- MB Plan (24/09/2026, Ignazio): le righe lunghe si tagliavano a 200 lettere senza avvisare e col dettato si perdeva la fine.
-- Le cose da fare e le righe dei progetti arrivano a 1000 lettere; le voci dei modelli (modello_giorno) restano a 200.
alter table cose_da_fare drop constraint cose_da_fare_testo_check;
alter table cose_da_fare add constraint cose_da_fare_testo_check check (char_length(testo) between 1 and 1000);
