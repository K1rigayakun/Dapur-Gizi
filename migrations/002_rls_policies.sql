-- =====================================================================
-- DapurGizi — 002 Row Level Security
-- =====================================================================
-- Prinsip:
--   * RLS aktif pada SEMUA tabel public.
--   * Peran diambil dari public.app_users (bukan dari klaim yang bisa
--     dimanipulasi frontend).
--   * Hak akses ditegakkan di database, bukan hanya dengan menyembunyikan
--     tombol di UI.
--   * Service role key tidak dipakai aplikasi desktop/EXE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper peran (SECURITY DEFINER agar dapat membaca app_users tanpa rekursi)
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select role from public.app_users where id = auth.uid();
$$;

create or replace function public.has_app_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(
        (select role = any (allowed) from public.app_users where id = auth.uid()),
        false
    );
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.has_app_role(text[]) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_app_role(text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Izin dasar schema & tabel untuk PostgREST (baris tetap dikontrol oleh RLS)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all sequences in schema public to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;

-- ---------------------------------------------------------------------
-- Aktifkan RLS
-- ---------------------------------------------------------------------
alter table public.app_users                 enable row level security;
alter table public.app_settings              enable row level security;
alter table public.budget_parameters         enable row level security;
alter table public.budget_parameter_history  enable row level security;
alter table public.beneficiaries             enable row level security;
alter table public.food_compositions         enable row level security;
alter table public.menus                     enable row level security;
alter table public.menu_ingredients          enable row level security;
alter table public.production_batches        enable row level security;
alter table public.distribution_routes       enable row level security;
alter table public.hygiene_checklists        enable row level security;
alter table public.hygiene_items             enable row level security;
alter table public.slhs_certificates         enable row level security;
alter table public.food_safety_incidents     enable row level security;
alter table public.food_waste_records        enable row level security;
alter table public.notifications             enable row level security;
alter table public.audit_logs                enable row level security;

-- ---------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------
drop policy if exists app_users_select on public.app_users;
create policy app_users_select on public.app_users
    for select to authenticated
    using (id = auth.uid() or public.has_app_role(array['Kepala SPPG']));

drop policy if exists app_users_insert on public.app_users;
create policy app_users_insert on public.app_users
    for insert to authenticated
    with check (public.has_app_role(array['Kepala SPPG']));

drop policy if exists app_users_update on public.app_users;
create policy app_users_update on public.app_users
    for update to authenticated
    using (id = auth.uid() or public.has_app_role(array['Kepala SPPG']))
    with check (id = auth.uid() or public.has_app_role(array['Kepala SPPG']));

-- ---------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists app_settings_insert on public.app_settings;
create policy app_settings_insert on public.app_settings
    for insert to authenticated
    with check (public.has_app_role(array['Kepala SPPG']));

drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings
    for update to authenticated
    using (public.has_app_role(array['Kepala SPPG']))
    with check (public.has_app_role(array['Kepala SPPG']));

-- ---------------------------------------------------------------------
-- Parameter anggaran (baca untuk dashboard, tulis hanya Kepala/Keuangan)
-- ---------------------------------------------------------------------
drop policy if exists budget_parameters_select on public.budget_parameters;
create policy budget_parameters_select on public.budget_parameters
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists budget_parameters_write on public.budget_parameters;
create policy budget_parameters_write on public.budget_parameters
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Keuangan']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Keuangan']));

drop policy if exists budget_history_select on public.budget_parameter_history;
create policy budget_history_select on public.budget_parameter_history
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists budget_history_insert on public.budget_parameter_history;
create policy budget_history_insert on public.budget_parameter_history
    for insert to authenticated
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Keuangan']));

-- ---------------------------------------------------------------------
-- Penerima manfaat
-- ---------------------------------------------------------------------
drop policy if exists beneficiaries_select on public.beneficiaries;
create policy beneficiaries_select on public.beneficiaries
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists beneficiaries_write on public.beneficiaries;
create policy beneficiaries_write on public.beneficiaries
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']));

-- ---------------------------------------------------------------------
-- Menu, bahan, komposisi pangan
-- ---------------------------------------------------------------------
drop policy if exists menus_select on public.menus;
create policy menus_select on public.menus
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists menus_write on public.menus;
create policy menus_write on public.menus
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']));

drop policy if exists menu_ingredients_select on public.menu_ingredients;
create policy menu_ingredients_select on public.menu_ingredients
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists menu_ingredients_write on public.menu_ingredients;
create policy menu_ingredients_write on public.menu_ingredients
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']));

drop policy if exists food_compositions_select on public.food_compositions;
create policy food_compositions_select on public.food_compositions
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists food_compositions_write on public.food_compositions;
create policy food_compositions_write on public.food_compositions
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi']));

-- ---------------------------------------------------------------------
-- Produksi
-- ---------------------------------------------------------------------
drop policy if exists production_select on public.production_batches;
create policy production_select on public.production_batches
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists production_write on public.production_batches;
create policy production_write on public.production_batches
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Gizi', 'Pengawas Sanitasi']));

-- ---------------------------------------------------------------------
-- Distribusi
-- ---------------------------------------------------------------------
drop policy if exists distribution_select on public.distribution_routes;
create policy distribution_select on public.distribution_routes
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists distribution_write on public.distribution_routes;
create policy distribution_write on public.distribution_routes
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

-- ---------------------------------------------------------------------
-- Keamanan pangan
-- ---------------------------------------------------------------------
drop policy if exists hygiene_checklists_select on public.hygiene_checklists;
create policy hygiene_checklists_select on public.hygiene_checklists
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists hygiene_checklists_write on public.hygiene_checklists;
create policy hygiene_checklists_write on public.hygiene_checklists
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

drop policy if exists hygiene_items_select on public.hygiene_items;
create policy hygiene_items_select on public.hygiene_items
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists hygiene_items_write on public.hygiene_items;
create policy hygiene_items_write on public.hygiene_items
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

drop policy if exists slhs_select on public.slhs_certificates;
create policy slhs_select on public.slhs_certificates
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists slhs_write on public.slhs_certificates;
create policy slhs_write on public.slhs_certificates
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

drop policy if exists incidents_select on public.food_safety_incidents;
create policy incidents_select on public.food_safety_incidents
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists incidents_write on public.food_safety_incidents;
create policy incidents_write on public.food_safety_incidents
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

drop policy if exists food_waste_select on public.food_waste_records;
create policy food_waste_select on public.food_waste_records
    for select to authenticated
    using (auth.uid() is not null);

drop policy if exists food_waste_write on public.food_waste_records;
create policy food_waste_write on public.food_waste_records
    for all to authenticated
    using (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']))
    with check (public.has_app_role(array['Kepala SPPG', 'Pengawas Sanitasi']));

-- ---------------------------------------------------------------------
-- Notifikasi
-- ---------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
    for select to authenticated
    using (
        recipient_id is null
        or recipient_id = auth.uid()
        or public.has_app_role(array['Kepala SPPG'])
    );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
    for insert to authenticated
    with check (auth.uid() is not null);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
    for update to authenticated
    using (
        recipient_id is null
        or recipient_id = auth.uid()
        or public.has_app_role(array['Kepala SPPG'])
    )
    with check (auth.uid() is not null);

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
    for delete to authenticated
    using (public.has_app_role(array['Kepala SPPG']));

-- ---------------------------------------------------------------------
-- Audit (hanya baca untuk Kepala; penulisan lewat fungsi SECURITY DEFINER)
-- ---------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
    for select to authenticated
    using (public.has_app_role(array['Kepala SPPG']));

-- ---------------------------------------------------------------------
-- Fungsi audit parameter anggaran (SECURITY DEFINER, append-only)
-- ---------------------------------------------------------------------
create or replace function public.audit_budget_parameters()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.audit_logs (actor_id, actor_role, action, entity, entity_id, metadata)
    values (
        auth.uid(),
        public.current_app_role(),
        lower(tg_op),
        'budget_parameters',
        new.id::text,
        jsonb_build_object(
            'config_label', new.config_label,
            'effective_date', new.effective_date,
            'is_demo_config', new.is_demo_config
        )
    );
    return new;
end;
$$;

drop trigger if exists budget_parameters_audit on public.budget_parameters;
create trigger budget_parameters_audit
    after insert or update on public.budget_parameters
    for each row execute function public.audit_budget_parameters();
