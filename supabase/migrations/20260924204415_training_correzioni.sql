-- ═══════════════════════════════════════════════════════════
-- Cantiere 45 · Training — le correzioni delle carte, solo per l'Admin (Ignazio 24/09/2026 sera: «se io vedo le risposte, non mi posso
-- allenare… dobbiamo fare la pagina Training con due variabili: nella mia ci deve essere anche la cosa di poter fare gli aggiustamenti,
-- mentre gli utenti normali non vedono questo passaggio»).
--   training_correzioni → una riga per ogni «Correggi questa carta» toccato dall'Admin mentre si allena: la carta (id nel mazzo privato),
--                         il motivo a un tocco (la risposta non è giusta · non si capisce · altro), cosa cambiare (se lo scrive) e cosa
--                         c'era sullo schermo (la domanda, la risposta scelta, dove: impara · ripassa · test). Claude le legge, corregge
--                         il mazzo nell'archivio (coach_batterie) e segna `risolta_il`.
-- Solo l'Admin la legge e la scrive (anche nel database: i partner non la vedono e non possono scriverla).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.training_correzioni (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.utenti(id) on delete cascade,
  carta      text not null check (char_length(carta) between 1 and 40),
  motivo     text check (motivo in ('risposta', 'non_chiara', 'altro')),
  testo      text check (char_length(testo) <= 1000),
  visto      jsonb not null default '{}'::jsonb check (jsonb_typeof(visto) = 'object'),   -- { dove, domanda, scelta, giusta }
  creata_il  timestamptz not null default now(),
  risolta_il timestamptz,                                                                  -- quando Claude l'ha corretta
  constraint training_correzioni_qualcosa check (motivo is not null or char_length(coalesce(testo, '')) > 0)
);
create index training_correzioni_aperte on public.training_correzioni (creata_il) where risolta_il is null;

alter table public.training_correzioni enable row level security;
create policy "training_correzioni_admin" on public.training_correzioni
  for all using (public.is_admin()) with check (public.is_admin() and user_id = public.utente_corrente());

comment on table public.training_correzioni is 'Cantiere 45: le carte del Training da correggere, segnate dall''Admin mentre si allena (Claude corregge il mazzo e segna risolta_il).';
