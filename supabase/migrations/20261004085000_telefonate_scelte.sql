-- Telefonate scelte a mano (Azioni, nota 012 · decisioni di Ignazio 04/10/2026).
-- Prima: una telefonata che il partner programma da sé (scheda → «Nuova azione», Agenda → «+», tipo Contatto · Telefonata) finiva in Agenda
-- come telefonata normale e non in coda. Ignazio: deve entrare in CODA, anche oltre i 5 del giorno (in coda si può avere 10 o 14 telefonate),
-- restarci finché non è fatta (anche il giorno dopo), con l'orario facoltativo (con l'ora sta anche in Agenda e nella timeline). Il traguardo
-- del giorno resta quello scelto: le telefonate oltre contano «in più» («5 di 5 ✓ e 3 in più», mai «3 di 10»). La scheda è una sola.
--
-- 1. Due campi nuovi facoltativi su `azioni` (aggiunte: l'app online di prima non li usa):
--      scelta_a_mano  la telefonata l'ha programmata il partner: sta in coda dal giorno scelto finché non ha un esito, conta nei contatti del giorno
--      senza_ora      niente orario: solo in coda, non in Agenda; quando si chiude prende l'ora di adesso (chiudi_azione, migrazione 20261004091000)
-- 2. `stato_oggi` — MODIFICA di una funzione esistente, serve l'«ok» di Ignazio: `fatti_oggi` conta anche le telefonate scelte a mano con l'esito
--    di oggi, non più solo gli esiti dati dalle card della coda (`da_coda`). Così chi ha fatto 5 telefonate a mano ha fatto i suoi 5 (la coda
--    automatica non gliene propone altri: posti = contatti_al_giorno − fatti_oggi) e oltre il traguardo si contano «in più» (MB21Coda.contoGiorno).
--    Gli esiti dati dalla scheda del contatto e le telefonate di riordino restano fuori dal conto, come prima.
-- Il resto lo fa l'app: coda.js (telefonateScelte, senzaScelte, contoGiorno), pagina-dashboard.js («Telefonate scelte a mano», esito con
-- chiudiAppuntamento sulla stessa riga), pagina-agenda.js (senza orario non si vede), index.html (nuovoAppuntamento con «Senza orario · solo in coda»).
-- Deve venire PRIMA di 20261004090000 (elimina_azione) e 20261004091000 (chiudi_azione), che usano le due colonne.

alter table public.azioni add column if not exists scelta_a_mano boolean not null default false;
alter table public.azioni add column if not exists senza_ora boolean not null default false;
comment on column public.azioni.scelta_a_mano is 'Telefonata (Contatto · Telefonata) programmata dal partner: sta in coda dal giorno scelto finché non ha un esito e conta nei contatti del giorno (Azioni, nota 012, 04/10/2026)';
comment on column public.azioni.senza_ora is 'La telefonata scelta a mano non ha un orario: solo in coda, non in Agenda; chiusa, prende l''ora di adesso (chiudi_azione)';

-- la lettura della coda cerca le telefonate scelte a mano ancora aperte: sono poche, indice parziale leggero
create index if not exists azioni_scelte_aperte on public.azioni (user_id, inizio)
  where scelta_a_mano and not coalesce(completata, false) and esito is null;

-- stato_oggi: contatti al giorno, fatti oggi (esiti dalla coda + telefonate scelte a mano fatte), catalogati oggi
create or replace function public.stato_oggi(p_utente uuid default null) returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'contatti_al_giorno', u.contatti_al_giorno,
    'fatti_oggi', (select count(*) from public.azioni a
                   where a.user_id = u.id
                     and (a.da_coda or (a.scelta_a_mano and coalesce(a.completata, false) and a.esito is not null))
                     and a.inizio >= (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')
                     and a.inizio <  (date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') + interval '1 day'),
    'catalogati_oggi', (select count(*) from public.contatti c
                        where c.user_id = u.id and c.catalogato_il = (now() at time zone 'Europe/Rome')::date))
  from public.utenti u where u.id = coalesce(p_utente, public.utente_corrente());
$$;
