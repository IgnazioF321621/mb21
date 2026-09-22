-- ═══════════════════════════════════════════════════════════
-- Cantiere 40 · BSM N21 — Lavoro 2, la biblioteca (Ignazio 22/09/2026)
--   materiali → un catalogo solo per tracce audio, pack, libri e Manuale di Network 21.
--   Non è una pagina da sfogliare: è il motore del consiglio («prossima traccia per Mario»)
--   e la base del registro delle condivisioni (lavoro 3) e del percorso del partner (lavoro 6).
--
-- Chi riempie la tabella: `scripts/import_materiali.py` (legge il rilievo, il PDF «Media Sharing V2»
-- sul Mac di Ignazio e l'elenco dei libri del Check). I testi di Network 21 stanno solo qui nel
-- database, mai nel repo (è pubblico). Dopo, l'Admin aggiunge e corregge dall'app.
--
-- Scelte di Ignazio (21-22/09): l'unità del percorso è la traccia, il pack è solo «dove si compra»
-- (un pack può avere tracce di fasi diverse) · il PDF resta l'autorità per le 40 tracce, le 9 nuove
-- del sito entrano senza fase · «Tempo e denaro» per prima è il passo consigliato, non obbligatorio ·
-- il consiglio salta da solo le tracce solo per donne e non propone due oratori stranieri di fila ·
-- i libri fuori commercio hanno il segno «solo da N21» · i pack non condivisibili entrano interi,
-- le loro tracce si potranno aggiungere più avanti (pack_id).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create table public.materiali (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('traccia', 'pack', 'libro', 'manuale', 'altro')),
  titolo         text not null check (char_length(titolo) between 1 and 120),
  autore         text check (char_length(autore) <= 80),
  pack_id        uuid references public.materiali(id) on delete set null,   -- la traccia sta in questo pack
  per_chi        text check (per_chi in ('ospite', 'utente', 'studio', 'avanzato')),
                 -- ospite/utente = condivisibile (Media Sharing) · studio = non condivisibile · avanzato = Training avanzato · vuoto per i libri
  fase           smallint check (fase between 1 and 4),   -- #1 Interesse · #2 Sopravvivenza · #3 Consapevolezza · #4 Convinzione (PDF); vuoto = senza fase
  ordine         smallint,                                -- posto nella fase (ordine del PDF; 0 = «Tempo e denaro», il passo consigliato per primo)
  straniero      boolean not null default false,          -- oratore straniero: si diluisce tra gli italiani
  solo_donne     boolean not null default false,          -- «per chi è indicata»: pubblico femminile → il consiglio la salta per gli uomini
  solo_n21       boolean not null default false,          -- libro che si trova solo da Network 21 (non in libreria né online)
  fuori_catalogo boolean not null default false,          -- non più venduto sul sito, ma resta (Ignazio 21/09)
  ordine_libro   smallint,                                -- percorso dei libri: 0 Manuale · 1 Carnegie/Littauer · 2 «È semplice, non ovvia» · 3 i tre solo N21
  minuti         smallint check (minuti > 0),
  riassunto      text,                                    -- dal PDF «Media Sharing V2» (solo nel database)
  punti_chiave   text,
  per_chi_testo  text,                                    -- «Per chi è indicata questa traccia» (PDF)
  argomenti      text[] not null default '{}',            -- gli argomenti del sito (Avvio, Azione, Dare Seguito…)
  link           text,                                    -- network21.it/bsm/product/…
  glide_indice   smallint,                                -- IndiceBSM del CSV di Glide (per l'import delle condivisioni)
  note           text,
  da_import      boolean not null default false,          -- riga scritta dallo script: rilanciandolo si rifanno solo queste
  creato_il      timestamptz not null default now()
);

create unique index materiali_titolo_autore on public.materiali (tipo, titolo, coalesce(autore, ''));
create index materiali_fase on public.materiali (fase, ordine) where tipo = 'traccia';
create index materiali_pack on public.materiali (pack_id) where pack_id is not null;

alter table public.materiali enable row level security;
create policy "materiali_select" on public.materiali
  for select using (public.utente_corrente() is not null);
create policy "materiali_write" on public.materiali
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.materiali is 'Cantiere 40: biblioteca N21 (tracce, pack, libri, Manuale). L''unità del percorso è la traccia.';
