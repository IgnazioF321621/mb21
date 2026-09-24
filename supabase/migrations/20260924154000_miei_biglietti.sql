-- ═══════════════════════════════════════════════════════════
-- I MIEI BIGLIETTI (e le mie tracce): leggerli dalla propria scheda, ovunque sia
-- 24 settembre 2026 · segnalazione di Ignazio (biglietti BBS/WES di Isabella)
-- ═══════════════════════════════════════════════════════════
-- Il problema: la scheda che porta il codice Amway di un partner sta quasi sempre nella lista
-- dell'upline (su 9 partner dell'app, tutti e 9). Il Check del Giorno (riga 9 «OPEN · BBS · WES») e il
-- Modulo Core la cercavano con una select diretta su `contatti`, che le regole di sicurezza fermano:
-- il biglietto c'era ma non si vedeva, e le targhette restavano spente. Scriverlo funzionava già
-- (`segna_mio_biglietto`, che passa da `_scheda_segni`): mancava solo la strada per rileggerlo.
--
-- 1. miei_biglietti(p_dal): i biglietti della mia scheda (e di quella del compagno/a collegato),
--    dagli eventi da `p_dal` in poi. `io` = il biglietto è per me (sulla mia scheda come «contatto»,
--    o su quella del compagno/a come «compagno»).
-- 2. mie_tracce(p_dal, p_a): le tracce del percorso segnate «ascoltata» sulla mia scheda nel periodo
--    (stesso difetto, stessa cura: servono al Modulo Core).
--
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create or replace function public.miei_biglietti(p_dal date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u public.utenti; sc public.contatti;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then return '[]'::jsonb; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'tipo', b.tipo, 'evento', b.evento, 'ospiti', b.ospiti,
             'io', (b.contatto_id = sc.id and coalesce(b.contatto, false))
                or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id and coalesce(b.compagno, false)))
             order by b.evento)
      from public.biglietti b
     where (b.contatto_id = sc.id or (sc.compagno_id is not null and b.contatto_id = sc.compagno_id))
       and (p_dal is null or b.evento >= p_dal)), '[]'::jsonb);
end;
$$;

create or replace function public.mie_tracce(p_dal date, p_a date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u public.utenti; sc public.contatti;
begin
  select * into u from public.utenti where id = public.utente_corrente();
  if u.id is null or u.partner_id is null then return '[]'::jsonb; end if;
  sc := public._scheda_segni(u.partner_id, u.id);
  if sc.id is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('giorno', c.ascoltata_il, 'titolo', m.titolo) order by c.ascoltata_il)
      from public.condivisioni c join public.materiali m on m.id = c.materiale_id
     where c.contatto_id = sc.id and coalesce(c.ascoltata, false)
       and c.ascoltata_il >= p_dal and c.ascoltata_il < p_a), '[]'::jsonb);
end;
$$;

revoke all on function public.miei_biglietti(date) from public;
revoke all on function public.mie_tracce(date, date) from public;
grant execute on function public.miei_biglietti(date) to authenticated;
grant execute on function public.mie_tracce(date, date) to authenticated;
