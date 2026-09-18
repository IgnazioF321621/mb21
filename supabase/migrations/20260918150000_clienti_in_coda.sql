-- ═══════════════════════════════════════════════════════════
-- Cantiere 27 · Lavoro 3: i CLIENTI rientrano in coda (decisioni di Ignazio del 18/09)
-- Prima nessuna fase del Cliente aveva giorni di rientro: dopo un esito il cliente usciva dalla coda per sempre
-- (58 clienti su 84 senza rientro). Ora:
--   · dopo «Ordine», «Vendita» o «No Vendita» il Cliente rientra in coda dopo **90 giorni**, per una nuova consulenza;
--   · «No Risposta» 2 giorni e «No Interesse» 365 (poi «Quando risentirlo?»), come il Prospect: servono ai bottoni
--     della coda del Cliente (Ordine · Appuntamento · Richiamare · Non risponde · Non interessato);
--   · **non vale se ha un riordino programmato**: lo segue la telefonata di riordino (riquadro «Riordini da sentire»),
--     quindi la coda lo salta finché il riordino è in piedi → contatti_coda.riordino_programmato.
-- Riordino programmato = una vendita con riordino da oggi in poi · oppure la telefonata di riordino di una vendita
-- ancora da fare · oppure una telefonata «Riordino» di Glide non fatta dal 1° settembre 2026 (come il riquadro).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

insert into public.sequenze (categoria, tipo_azione, fase, coach, giorni_rientro, area) values
  ('Cliente', 'Contatto',       'Ordine',       'Ringrazia; tra 3 mesi proponi una nuova consulenza',      90,  'Prodotti'),
  ('Cliente', 'Contatto',       'No Risposta',  'Riprova tra 2 giorni, orario diverso',                    2,   'Prodotti'),
  ('Cliente', 'Contatto',       'No Interesse', 'Ringrazia e chiedi un referral',                          365, 'Prodotti'),
  ('Cliente', 'Consulenza PRD', 'Vendita',      'Segui la consegna; tra 3 mesi una nuova consulenza',      90,  'Prodotti'),
  ('Cliente', 'Consulenza PRD', 'No Vendita',   'Resta in contatto; tra 3 mesi proponi una nuova consulenza', 90, 'Prodotti')
on conflict (chiave) do nothing;

create or replace view public.contatti_coda with (security_invoker = true) as
select c.id, c.nome, c.professione, c.fascia_eta, c.citta, c.telefono, c.categoria,
       c.rientro_il, c.in_coda_dal,
       u.esito        as ultima_fase,
       u.tipo_azione  as ultimo_tipo,
       u.inizio       as ultima_il,
       (u.id is not null) as contattato,
       s.giorni_rientro as ultimi_giorni,
       coalesce(s.coach, case when u.id is null then m.coach end) as coach,
       u.modalita     as ultima_modalita,
       coalesce(u.area, c.area) as ultima_area,
       c.user_id, c.creato_il, c.glide_id,
       (exists (select 1 from public.vendite v where v.contatto_id = c.id
                 and v.riordino >= (now() at time zone 'Europe/Rome')::date)
        or exists (select 1 from public.vendite v join public.azioni r on r.id = v.azione_riordino_id
                    where v.contatto_id = c.id and not coalesce(r.completata, false))
        or exists (select 1 from public.azioni r where r.contatto_id = c.id and r.tipo_azione = 'Contatto'
                    and r.esito = 'Riordino' and r.glide_id is not null and not coalesce(r.completata, false)
                    and (r.inizio at time zone 'Europe/Rome')::date >= date '2026-09-01')) as riordino_programmato
from public.contatti c
left join lateral (
  select a.id, a.esito, a.tipo_azione, a.inizio, a.chiave, a.modalita, a.area
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
left join public.sequenze m on m.chiave = 'Prospect-Contatto-Mai contattato o 2+ anni'
where c.user_id = public.utente_corrente() or public.is_admin();
