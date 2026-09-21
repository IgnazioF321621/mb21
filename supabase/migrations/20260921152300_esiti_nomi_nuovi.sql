-- ═══════════════════════════════════════════════════════════
-- Cantiere 39 · GLI ESITI — Lavoro 4: due nomi nuovi (decisione di Ignazio del 21/09, strada «B»: si rinomina davvero)
--   «Consult Prodotti» → «Consulenza Prodotti»   (in Glide la scritta intera non ci stava)
--   «Telefono OFF»     → «Telefono spento»
-- Un nome solo ovunque: `sequenze.fase` e `azioni.esito` (le due colonne `chiave` sono calcolate e si rifanno da sole),
-- e la vista `azioni_conti`, che decide cosa conta come Contatto (stessa regola di report.js → CONTATTO_PARLATO:
-- ⚠️ si cambiano insieme). Dati del 21/09: 13 azioni «Consult Prodotti», 23 «Telefono OFF».
-- ⚠️ Si applica INSIEME alla pubblicazione dell'app: l'app vecchia salverebbe ancora i nomi vecchi.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

update public.sequenze set fase = 'Consulenza Prodotti' where fase = 'Consult Prodotti';
update public.sequenze set fase = 'Telefono spento'     where fase = 'Telefono OFF';
update public.azioni   set esito = 'Consulenza Prodotti' where esito = 'Consult Prodotti';
update public.azioni   set esito = 'Telefono spento'     where esito = 'Telefono OFF';

create or replace view public.azioni_conti with (security_invoker = true) as
select a.id, a.user_id, a.contatto_id, (a.inizio at time zone 'Europe/Rome')::date as giorno,
       a.tipo_azione, a.modalita, a.esito,
       (a.tipo_azione = 'Contatto')::integer        as contatti,
       (a.tipo_azione = 'Piano Marketing')::integer as pm
from public.azioni a
where (a.inizio at time zone 'Europe/Rome')::date between date '2026-09-14' and (now() at time zone 'Europe/Rome')::date
  and (
    (a.tipo_azione = 'Contatto' and coalesce(a.categoria, '') <> 'Partner'
      and (a.esito in ('PM Fissato', 'Appuntamento', 'Ordine', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti')
           or (a.esito = 'Riordino' and coalesce(a.completata, false))))
    or
    (a.tipo_azione = 'Piano Marketing' and a.esito in ('Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'))
  );
