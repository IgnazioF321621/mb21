-- ═══════════════════════════════════════════════════════════
-- Righe della coda con le parole di Glide
-- 14 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Decisione di Ignazio (14/09): la riga della coda mostra, come le «Azioni da completare»
-- di Glide, «modalità • area | esito» dell'ultima azione, con la frase del coach sotto.
-- contatti_coda: aggiunte in fondo ultima_modalita e ultima_area (il resto è invariato).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

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
       coalesce(u.area, c.area) as ultima_area
from public.contatti c
left join lateral (
  select a.id, a.esito, a.tipo_azione, a.inizio, a.chiave, a.modalita, a.area
  from public.azioni a where a.contatto_id = c.id
  order by a.inizio desc nulls last, a.creato_il desc limit 1
) u on true
left join public.sequenze s on s.chiave = u.chiave
left join public.sequenze m on m.chiave = 'Prospect-Contatto-Mai contattato o 2+ anni'
where c.user_id = public.utente_corrente();
