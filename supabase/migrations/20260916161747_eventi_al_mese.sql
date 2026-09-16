-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 lavoro 4 · EVENTI AL MESE (Ignazio 16/09)
-- Il BBS cade in giorni diversi nelle varie città (Messina il 20/09, altrove no):
-- gli eventi dei biglietti si indicano col mese, «BBS 09/2026», «WES 10/2026».
--   bbs.data        → primo giorno del mese dell'evento
--   biglietti.evento → primo giorno del mese (BBS e WES)
-- La tabella `wes` resta con i giorni veri: serve ai periodi Wes del Report e del Check.
-- Conta l'evento in vendita: l'ultimo caricato (data più alta); per i mesi chiusi la fotografia
-- a fine mese usa `creato_il` di eventi e biglietti (la calcola la pagina).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

update public.bbs set data = date_trunc('month', data)::date;
update public.biglietti set evento = date_trunc('month', evento)::date;

alter table public.bbs add constraint bbs_primo_del_mese check (extract(day from data) = 1);
alter table public.biglietti add constraint biglietti_evento_mese check (extract(day from evento) = 1);
