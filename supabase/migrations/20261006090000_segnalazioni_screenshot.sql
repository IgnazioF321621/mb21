-- ════════════════════════════════════════════════════════════════════════════
-- «Segnala»: allegare uno screenshot (nota Pagine 014, Ignazio 06/10/2026). Il partner fa lo screenshot come sempre e lo sceglie dalle foto
-- nel foglio Segnala; l'app lo riduce sul telefono (lato lungo 1200 px, JPEG 0,7: 150-250 KB) e lo carica nel bucket PRIVATO `segnalazioni`
-- al percorso `<user_id>/<id segnalazione>.jpg`; nella riga resta solo il percorso (`immagine`). Chi legge (Admin, Regia) apre l'immagine
-- con un link firmato a tempo (createSignedUrl). Pulizia: alla risoluzione (pagina Admin 005) o a mano dalla Regia.
-- AGGIUNTA (campo facoltativo + bucket nuovo + regole del bucket): la applica la Regia al rilascio. Niente anon.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.segnalazioni add column if not exists immagine text;
comment on column public.segnalazioni.immagine is 'Nota Pagine 014: percorso dello screenshot nel bucket privato segnalazioni (<user_id>/<id>.jpg), null se non allegato';

-- il bucket: privato, solo JPEG, al massimo 1 MB a file (l'app li manda a 150-250 KB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('segnalazioni', 'segnalazioni', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- Le regole del bucket (storage.objects ha già RLS): la cartella è il `user_id` di chi segnala (utenti.id, non auth.uid()).
-- Il partner scrive e legge solo nella sua cartella; l'Admin legge e cancella tutto; `anon` non ha regole → niente.
drop policy if exists "segnalazioni_img_leggi" on storage.objects;
create policy "segnalazioni_img_leggi" on storage.objects for select to authenticated
  using (bucket_id = 'segnalazioni' and ((storage.foldername(name))[1] = public.utente_corrente()::text or public.is_admin()));
drop policy if exists "segnalazioni_img_scrivi" on storage.objects;
create policy "segnalazioni_img_scrivi" on storage.objects for insert to authenticated
  with check (bucket_id = 'segnalazioni' and (storage.foldername(name))[1] = public.utente_corrente()::text);
-- l'upload con `upsert` (se il partner ritocca «Invia» dopo una rete caduta) passa da update: stessa regola della scrittura
drop policy if exists "segnalazioni_img_rifai" on storage.objects;
create policy "segnalazioni_img_rifai" on storage.objects for update to authenticated
  using (bucket_id = 'segnalazioni' and (storage.foldername(name))[1] = public.utente_corrente()::text)
  with check (bucket_id = 'segnalazioni' and (storage.foldername(name))[1] = public.utente_corrente()::text);
drop policy if exists "segnalazioni_img_cancella" on storage.objects;
create policy "segnalazioni_img_cancella" on storage.objects for delete to authenticated
  using (bucket_id = 'segnalazioni' and public.is_admin());
