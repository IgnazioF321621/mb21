-- «Contatti fatti» con un significato solo (Azioni, nota 030, punto 2; decisione di Ignazio 04/10/2026 sera).
-- Report, Griglia, Core e «Il mio giorno» contano già le telefonate in cui si è PARLATO con la persona (vista azioni_conti: No Risposta e Telefono
-- spento esclusi). La scheda del contatto («Contatti fatti», vista contatti_lista) contava invece ogni azione di tipo Contatto di sempre, anche a vuoto
-- e anche senza esito: ora conta le telefonate con un esito in cui si è parlato (il «Riordino» solo se la telefonata è stata fatta), per ogni categoria.
-- In Dashboard e Agenda «fatti 3 di 5» resta il conto delle telefonate fatte oggi, anche a vuoto: è il lavoro fatto, non le persone raggiunte.
-- MODIFICA di una vista esistente (stesse colonne, cambia solo il conto): con l'ok di Ignazio.

create or replace view public.contatti_lista with (security_invoker = true) as
select c.id, c.user_id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria, c.area, c.brand,
       c.referral_di, c.note, c.rientro_il, c.glide_id, c.creato_il, c.aggiornato_il, c.in_coda_dal, c.categoria_prec,
       c.onb_amway, c.onb_ordine, c.onb_n21, c.onb_sogno, c.onb_starter_pack, c.onb_lista_start, c.onb_role_play,
       c.onb_contatti, c.onb_pack_ds, c.onb_bbs, c.onb_wes, c.onb_cep, c.onb_primo_pm, c.onb_primo_abo,
       p.nome        as partner,
       u.area        as ultima_area,
       u.modalita    as ultima_modalita,
       u.tipo_azione as ultimo_tipo,
       u.esito       as ultima_fase,
       u.inizio      as ultima_il,
       s.icona       as fase_icona,
       (select count(*) from public.azioni a
         where a.contatto_id = c.id and a.tipo_azione = 'Contatto'
           and a.esito is not null and a.esito not in ('No Risposta', 'Telefono spento')
           and (a.esito <> 'Riordino' or coalesce(a.completata, false))) as contatti_fatti
from public.contatti c
join public.utenti p on p.id = c.user_id
left join lateral (
  select a.area, a.modalita, a.tipo_azione, a.esito, a.inizio, a.chiave
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
where c.eliminato_il is null;
