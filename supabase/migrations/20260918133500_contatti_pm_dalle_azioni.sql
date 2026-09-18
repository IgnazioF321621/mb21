-- ═══════════════════════════════════════════════════════════
-- Cantiere 27 · CONTATTI E PM DEL CHECK DALLE AZIONI — Lavoro 2, pezzo 1 (decisioni di Ignazio del 18/09, CANTIERI.md)
-- Come i VP Clienti dalle vendite (20260918113000): un numero, una fonte sola. Fino al 13/09/2026 Contatti e PM sono
-- quelli scritti a mano nel Check del Giorno; dal 14/09/2026 (nascita della v4) contano le azioni registrate,
-- nel giorno dell'azione (ora di Roma), solo fino a oggi:
--   Contatto → azione «Contatto» non verso un Partner, dove si è parlato: PM Fissato · Appuntamento · Ordine · Richiamare ·
--              Relazione · No Interesse · Consult Prodotti. «Riordino» (etichetta di Glide) solo se la telefonata è completata.
--              Non contano No Risposta, Telefono OFF, Mai contattato e le azioni senza esito.
--   PM       → «Piano Marketing» avvenuto: Presentazione · Dare Seguito · Iscrizione · No BuonFine · Prodotti
--              (non Rimandato, non No Show, non senza esito). Vale anche il PM fatto all'ospite di un partner.
--
--   azioni_conti       → una riga per ogni azione che conta (`contatti` o `pm` = 1). La leggerà il Check del Giorno.
--   check_giorni_conti → Contatti e PM dei Check azzerati dal 14/09 + una riga per ogni azione che conta (`e_check` = false).
--   check_mesi         → invariata: somma check_giorni_conti.
-- ⚠️ La data d'inizio sta qui (3 volte) e in dashboard.js → INIZIO_AZIONI: si cambiano insieme.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create view public.azioni_conti with (security_invoker = true) as
select a.id, a.user_id, a.contatto_id, (a.inizio at time zone 'Europe/Rome')::date as giorno,
       a.tipo_azione, a.modalita, a.esito,
       (a.tipo_azione = 'Contatto')::integer        as contatti,
       (a.tipo_azione = 'Piano Marketing')::integer as pm
from public.azioni a
where (a.inizio at time zone 'Europe/Rome')::date between date '2026-09-14' and (now() at time zone 'Europe/Rome')::date
  and (
    (a.tipo_azione = 'Contatto' and coalesce(a.categoria, '') <> 'Partner'
      and (a.esito in ('PM Fissato', 'Appuntamento', 'Ordine', 'Richiamare', 'Relazione', 'No Interesse', 'Consult Prodotti')
           or (a.esito = 'Riordino' and coalesce(a.completata, false))))
    or
    (a.tipo_azione = 'Piano Marketing' and a.esito in ('Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'))
  );

grant select on public.azioni_conti to authenticated;

create or replace view public.check_giorni_conti with (security_invoker = true) as
select id, user_id, data, true as e_check,
       case when data >= date '2026-09-14' then 0 else contatti end as contatti,
       case when data >= date '2026-09-14' then 0 else pm end as pm,
       sponsor_personali, sponsor_gruppo,
       case when data >= date '2026-09-18' then 0 else vp_clienti end as vp_clienti,
       cep, bbs, wes, tracce, pagine
from public.check_giorno
union all
select v.id, v.user_id, v.conta_il, false, 0, 0, 0, 0, v.vp, 0, 0, 0, 0, 0
from public.vendite_conti v
where v.conta_il >= date '2026-09-18'
union all
select z.id, z.user_id, z.giorno, false, z.contatti, z.pm, 0, 0, 0, 0, 0, 0, 0, 0
from public.azioni_conti z;
