-- ═══════════════════════════════════════════════════════════
-- Cantiere 18 · COMPAGNO/A COLLEGATO A UNA SCHEDA (Ignazio 16/09, esempio Tonya Abela e Filippo Arcoraci)
-- Quando il compagno/a ha già la sua scheda nella lista, le due schede si collegano nei due sensi.
-- I segni vitali della coppia si leggono da tutte e due le schede e si contano una volta sola.
-- Il nome/telefono scritti a mano restano per chi non è in lista.
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

alter table public.contatti
  add column compagno_id uuid references public.contatti(id) on delete set null;

-- Collega (o scollega, con p_compagno vuoto) due schede in tutti e due i sensi.
-- Sgancia prima i vecchi collegamenti di tutte e due. Gira con i permessi di chi chiama:
-- se una delle due schede non si può modificare, non cambia niente.
create or replace function public.collega_compagno(p_contatto uuid, p_compagno uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare n int;
begin
  if p_compagno = p_contatto then raise exception 'Un contatto non può essere compagno di sé stesso'; end if;

  update public.contatti set compagno_id = null
   where compagno_id is not null
     and (id in (p_contatto, p_compagno) or compagno_id in (p_contatto, p_compagno));

  if p_compagno is null then return; end if;

  update public.contatti
     set compagno_id = case when id = p_contatto then p_compagno else p_contatto end,
         compagno_nome = null, compagno_telefono = null
   where id in (p_contatto, p_compagno);
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'Scheda del compagno non modificabile'; end if;
end $$;
