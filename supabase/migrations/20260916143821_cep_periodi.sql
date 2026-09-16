-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 · CEP a periodi (Ignazio 16/09: capita che qualcuno esca dal CEP e poi rientri)
-- Prima una sola riga per contatto; ora una riga per periodo (dal / uscito il).
-- Al massimo un periodo aperto (uscito_il vuoto) per contatto. Le sovrapposizioni le controlla la pagina.
-- Le righe già inserite restano come primo periodo.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.cep add column id uuid not null default gen_random_uuid();
alter table public.cep drop constraint cep_pkey;
alter table public.cep add primary key (id);

create index cep_contatto on public.cep (contatto_id);
create unique index cep_un_solo_aperto on public.cep (contatto_id) where uscito_il is null;
