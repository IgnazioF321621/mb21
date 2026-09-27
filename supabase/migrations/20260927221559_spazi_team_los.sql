-- MB Plan · «Prepara la settimana» (Ignazio 27/09/2026): anche gli incontri di gruppo, senza nome e senza giorno fisso,
-- scelti ogni settimana con giorno e ora come i Piani Marketing: «Team» (incontro di Team) e «LOS» (linea di sponsorizzazione).
alter table public.spazi drop constraint spazi_tipo_check;
alter table public.spazi add constraint spazi_tipo_check check (tipo in ('Piano Marketing', 'Consulenza PRD', 'SdS/OPEN', 'Team', 'LOS'));
