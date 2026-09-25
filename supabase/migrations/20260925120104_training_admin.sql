-- ═══════════════════════════════════════════════════════════
-- Admin → Training (Ignazio 25/09): chi si allena e dove è arrivato.
-- I progressi del Training restano «ognuno i suoi» (regole del 24/09, senza eccezione per l'Admin). Questa funzione è
-- l'unica eccezione, decisa da Ignazio: SOLO l'Admin, SOLO lettura, SOLO il riassunto per calcolare livello e percorso
-- (per ogni carta la scatola e il prossimo ripasso; i test con giuste/totale; i giorni). Le risposte date NON escono.
-- Progetto: exwgjlhbhlgebkgxtanq (mb21). Si applica con `supabase db push`.
-- ═══════════════════════════════════════════════════════════

create function public.training_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo Admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', u.id,
      'carte', coalesce((select jsonb_agg(jsonb_build_object('carta', c.carta, 'scatola', c.scatola, 'prossima', c.prossima))
                           from training_carte c where c.user_id = u.id), '[]'::jsonb),
      'test', coalesce((select jsonb_agg(jsonb_build_object('percorso', t.percorso, 'giuste', t.giuste, 'totale', t.totale, 'fatto_il', t.fatto_il) order by t.fatto_il)
                          from training_test t where t.user_id = u.id), '[]'::jsonb),
      'giorni', coalesce((select jsonb_agg(g.giorno order by g.giorno) from training_giorni g where g.user_id = u.id), '[]'::jsonb),
      'ultima', (select max(c.risposta_il) from training_carte c where c.user_id = u.id)))
    from utenti u
    where u.eliminato_il is null
      and (exists (select 1 from training_carte c where c.user_id = u.id)
           or exists (select 1 from training_giorni g where g.user_id = u.id))), '[]'::jsonb);
end $$;
revoke all on function public.training_admin() from public, anon;
grant execute on function public.training_admin() to authenticated;
