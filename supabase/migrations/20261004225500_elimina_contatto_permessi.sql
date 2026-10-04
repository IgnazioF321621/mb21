-- Permessi di elimina_contatto e annulla_elimina_contatto (regola del 03/10, CLAUDE.md § 4): la migrazione del 19/09 dava il grant ad authenticated e
-- service_role ma non toglieva PUBLIC e anon, che Supabase mette da solo: visto il 04/10 sera controllando i permessi dopo la nota 046.
-- La RLS (invoker) non lasciava fare niente ad anon: nessun danno, ma la regola dice «solo chi è entrato». MODIFICA di permessi: con l'ok di Ignazio.
revoke execute on function public.elimina_contatto(uuid, boolean) from public, anon;
revoke execute on function public.annulla_elimina_contatto(uuid) from public, anon;
grant execute on function public.elimina_contatto(uuid, boolean) to authenticated, service_role;
grant execute on function public.annulla_elimina_contatto(uuid) to authenticated, service_role;
