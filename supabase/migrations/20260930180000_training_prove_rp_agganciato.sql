-- Training · prove della telefonata a scelte: campo facoltativo «agganciato» (Ignazio 30/09/2026): il candidato esce dalla chiacchierata e tu
-- lo riagganci con «quando posso richiamarti?». Aggiunta nuova (default false), la tabella è ancora vuota e l'app online non la usa.
alter table public.training_prove_rp add column agganciato boolean not null default false;
comment on column public.training_prove_rp.agganciato is 'true se, all''uscita del candidato, la risposta di aggancio ha tenuto il contatto (esito resta «chiusa»).';
