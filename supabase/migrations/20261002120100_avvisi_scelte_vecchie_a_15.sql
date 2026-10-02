-- ═══════════════════════════════════════════════════════════
-- Lista «Avvisi» (Evernote, MB - Avvisi, nota 010, punto 3) · le scelte vecchie «prima di» passano a 15 minuti
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Ignazio (02/10, «sì»): chi aveva scelto «all'ora», 5 o 10 minuti per appuntamenti, telefonate, cose o modelli passa a 15
-- (la scelta più vicina rimasta). Oggi riguarda solo Ignazio (cose, telefonate, appuntamenti = 0); nessun altro ha 0, 5 o 10 (controllato il 02/10).
-- DATI VERI: copia fatta prima in ~/mb21-copie/2026-10-02/utenti_avvisi_quando.json. Va DOPO 20261002115607_avvisi_scelte_da_15.sql.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`, al rilascio.
-- ═══════════════════════════════════════════════════════════

update public.utenti u set avvisi_quando = (
  select jsonb_object_agg(e.key, case when e.key in ('appuntamenti', 'telefonate', 'cose', 'modelli') and e.value::text::int < 15 then to_jsonb(15) else e.value end)
  from jsonb_each(u.avvisi_quando) e)
where exists (select 1 from jsonb_each(u.avvisi_quando) e where e.key in ('appuntamenti', 'telefonate', 'cose', 'modelli') and e.value::text::int < 15);
