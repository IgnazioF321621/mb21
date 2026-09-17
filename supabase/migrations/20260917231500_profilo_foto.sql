-- Cantiere 25 · passo 2: foto del profilo, piccola, dentro il database (decisione di Ignazio 17/09: niente spazio immagini).
-- L'app la rimpicciolisce a 200×200 (JPEG) prima di mandarla: 15-30 KB. Qui il tetto è 80.000 caratteri (~60 KB).
-- Si salva in `utenti.foto`, che esisteva già (era l'indirizzo della foto in Glide).

create function public.imposta_foto(p_foto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_foto is not null and (char_length(p_foto) > 80000 or p_foto !~ '^data:image/jpeg;base64,') then
    raise exception 'Foto non valida o troppo grande';
  end if;
  update public.utenti set foto = p_foto where auth_id = auth.uid();
  if not found then raise exception 'Utente non abilitato'; end if;
end $$;

revoke all on function public.imposta_foto(text) from public;
grant execute on function public.imposta_foto(text) to authenticated;
