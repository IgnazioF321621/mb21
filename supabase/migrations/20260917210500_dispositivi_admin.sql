-- Cantiere 24 (Ignazio 17/09 sera): in Admin → Utenti si vede chi ha gli avvisi accesi. L'Admin legge tutti i dispositivi.
create policy "dispositivi: l'Admin vede tutti" on avvisi_dispositivi for select using (is_admin());
