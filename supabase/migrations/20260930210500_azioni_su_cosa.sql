-- Azioni (cantiere 48): «Su cosa lavorate?» — i passi da fare in un incontro con un Partner (anche più d'uno), scelti quando si fissa
-- l'appuntamento. Campo nuovo e facoltativo: l'app online non lo usa, le azioni che ci sono restano com'erano (vuoto).
alter table public.azioni add column if not exists su_cosa text[];
comment on column public.azioni.su_cosa is 'Appuntamento con un Partner: i passi su cui si lavora (fasi del tipo: Motivazione, ListaStart…), scelti quando si fissa l''incontro';
