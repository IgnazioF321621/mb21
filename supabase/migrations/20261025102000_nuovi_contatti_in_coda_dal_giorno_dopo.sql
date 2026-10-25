-- Nota Pagine 094, voce M6 (Ignazio 25/10/2026, «si»): una regola sola per i nomi nuovi scritti nell'app.
-- Prospect, Partner e Cliente nuovi entrano nei «Contatti del giorno» dal giorno dopo, come quando si cataloga (cataloga_contatto: oggi + 1).
-- Era (migrazione 20260914160000, r. 136-143): solo il Prospect (e il nome senza categoria) entrava in coda, e dal giorno stesso;
-- un Partner o un Cliente nuovo restava senza giorno di rientro, quindi non compariva mai nei «Contatti del giorno».
-- Il nome senza categoria resta com'era (in coda da oggi). Gli import da Glide (glide_id) e chi ha già un giorno non cambiano.
-- È una modifica di una funzione che esiste: la applica la Regia al rilascio. I contatti già salvati senza giorno di rientro NON si toccano.
create or replace function public.nuovo_contatto_in_coda() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.glide_id is null and new.rientro_il is null then
    if new.categoria is null then
      new.rientro_il := (now() at time zone 'Europe/Rome')::date;
    elsif new.categoria in ('Prospect', 'Partner', 'Cliente') then
      new.rientro_il := (now() at time zone 'Europe/Rome')::date + 1;
    end if;
  end if;
  return new;
end $$;
