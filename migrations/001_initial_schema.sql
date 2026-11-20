-- =====================================================================
-- DapurGizi — 001 Initial Schema (Supabase PostgreSQL)
-- =====================================================================
-- Owner  : Gabriel (Backend, Database & Integration Engineer)
-- Scope  : tabel domain yang benar-benar dipakai frontend + kontrak service.
-- Catatan:
--   * Kolom memakai snake_case; batas API frontend tetap camelCase.
--   * Data pribadi diminimalkan. NIK hanya disimpan pada beneficiaries dan
--     tidak pernah ditulis ke log (lihat backend/core/logging_setup.py).
--   * Tidak ada seed pada file ini. Seed DEMO terpisah di 003.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Util: updated_at otomatis
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profil pengguna (terhubung ke Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.app_users (
    id           uuid primary key references auth.users (id) on delete cascade,
    email        text        not null,
    full_name    text        not null,
    role         text        not null
        check (role in ('Kepala SPPG', 'Pengawas Gizi', 'Pengawas Keuangan', 'Pengawas Sanitasi')),
    phone        text,
    unit_code    text,
    status       text        not null default 'Aktif'
        check (status in ('Aktif', 'Nonaktif', 'Menunggu Aktivasi')),
    last_login   timestamptz,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    created_by   uuid references auth.users (id) on delete set null,
    updated_by   uuid references auth.users (id) on delete set null
);

create unique index if not exists app_users_email_lower_idx
    on public.app_users (lower(email));
create index if not exists app_users_role_idx on public.app_users (role);

-- ---------------------------------------------------------------------
-- Pengaturan unit SPPG
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
    id                       uuid primary key default gen_random_uuid(),
    unit_code                text        not null unique,
    unit_name                text        not null,
    head_name                text,
    city                     text,
    enable_sound_alerts      boolean     not null default true,
    enable_desktop_toast     boolean     not null default true,
    auto_refresh_interval_sec integer    not null default 60
        check (auto_refresh_interval_sec between 5 and 3600),
    default_shift_start      text        default '03:00 WIB',
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    created_by               uuid references auth.users (id) on delete set null,
    updated_by               uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------
-- Parameter anggaran + riwayat perubahan
-- ---------------------------------------------------------------------
create table if not exists public.budget_parameters (
    id                                            uuid primary key default gen_random_uuid(),
    config_label                                  text        not null,
    reference_source                              text        not null,
    effective_date                                date        not null,
    monthly_allocation_ceiling                    numeric(18, 2) not null check (monthly_allocation_ceiling > 0),
    standard_food_cost_ceiling_per_portion        numeric(14, 2) not null check (standard_food_cost_ceiling_per_portion >= 0),
    standard_operational_cost_ceiling_per_portion numeric(14, 2) not null check (standard_operational_cost_ceiling_per_portion >= 0),
    daily_facility_incentive_rate                 numeric(14, 2) not null check (daily_facility_incentive_rate >= 0),
    target_daily_portions_baseline                integer     not null default 0 check (target_daily_portions_baseline >= 0),
    effective_service_days_in_month               integer     not null default 0 check (effective_service_days_in_month between 0 and 31),
    warning_threshold_percent                     integer     not null default 90 check (warning_threshold_percent between 0 and 100),
    is_demo_config                                boolean     not null default true,
    is_active                                     boolean     not null default true,
    created_at                                    timestamptz not null default now(),
    updated_at                                    timestamptz not null default now(),
    created_by                                    uuid references auth.users (id) on delete set null,
    updated_by                                    uuid references auth.users (id) on delete set null
);

-- Hanya satu parameter aktif pada satu waktu.
create unique index if not exists budget_parameters_single_active_idx
    on public.budget_parameters (is_active)
    where is_active;
create index if not exists budget_parameters_effective_idx
    on public.budget_parameters (effective_date desc);

create table if not exists public.budget_parameter_history (
    id              uuid primary key default gen_random_uuid(),
    parameter_id    uuid references public.budget_parameters (id) on delete cascade,
    snapshot        jsonb       not null default '{}'::jsonb,
    config_label    text        not null,
    reference_source text       not null,
    effective_date  date        not null,
    changed_by      uuid references auth.users (id) on delete set null,
    changed_at      timestamptz not null default now(),
    change_type     text        not null default 'update'
        check (change_type in ('create', 'update', 'activate')),
    notes           text
);

create index if not exists budget_history_parameter_idx
    on public.budget_parameter_history (parameter_id, changed_at desc);

-- ---------------------------------------------------------------------
-- Penerima manfaat
-- ---------------------------------------------------------------------
create table if not exists public.beneficiaries (
    id               uuid primary key default gen_random_uuid(),
    nik              text unique,
    full_name        text        not null,
    category         text        not null
        check (category in ('Siswa SD', 'Siswa SMP', 'Siswa SMA', 'Ibu Hamil', 'Ibu Menyusui', 'Balita')),
    institution      text        not null,
    grade_or_group   text,
    status           text        not null default 'Aktif'
        check (status in ('Aktif', 'Nonaktif')),
    notes            text,
    registered_at    date        not null default current_date,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    created_by       uuid references auth.users (id) on delete set null,
    updated_by       uuid references auth.users (id) on delete set null,
    source_reference text,
    constraint beneficiaries_nik_format
        check (nik is null or nik ~ '^[0-9]{10,16}$')
);

create index if not exists beneficiaries_status_idx on public.beneficiaries (status);
create index if not exists beneficiaries_category_idx on public.beneficiaries (category);
create index if not exists beneficiaries_institution_idx on public.beneficiaries (institution);

-- ---------------------------------------------------------------------
-- Referensi komposisi pangan (sumber & edisi wajib tercatat)
-- ---------------------------------------------------------------------
create table if not exists public.food_compositions (
    id                    uuid primary key default gen_random_uuid(),
    food_name             text        not null,
    edition               text,
    source_reference      text        not null,
    energy_kcal_per_100g  numeric(10, 2) check (energy_kcal_per_100g >= 0),
    protein_g_per_100g    numeric(10, 2) check (protein_g_per_100g >= 0),
    carbs_g_per_100g      numeric(10, 2) check (carbs_g_per_100g >= 0),
    fat_g_per_100g        numeric(10, 2) check (fat_g_per_100g >= 0),
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create unique index if not exists food_compositions_name_edition_idx
    on public.food_compositions (lower(food_name), coalesce(edition, ''));

-- ---------------------------------------------------------------------
-- Menu & bahan
-- ---------------------------------------------------------------------
create table if not exists public.menus (
    id                        uuid primary key default gen_random_uuid(),
    week_label                text,
    day_name                  text        not null,
    menu_date                 date        not null,
    order_index               integer     not null default 0,
    name                      text        not null,
    target_category           text,
    planned_portions          integer     not null default 0 check (planned_portions >= 0),
    calories_kcal             numeric(10, 2) check (calories_kcal >= 0),
    protein_gram              numeric(10, 2) check (protein_gram >= 0),
    carbs_gram                numeric(10, 2) check (carbs_gram >= 0),
    fat_gram                  numeric(10, 2) check (fat_gram >= 0),
    cost_estimate_per_portion numeric(14, 2) check (cost_estimate_per_portion >= 0),
    status                    text        not null default 'Draft'
        check (status in ('Draft', 'Menunggu Persetujuan', 'Disetujui', 'Perlu Revisi', 'Ditolak')),
    reviewed_by               text,
    review_notes              text,
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now(),
    created_by                uuid references auth.users (id) on delete set null,
    updated_by                uuid references auth.users (id) on delete set null,
    source_reference          text
);

create index if not exists menus_date_idx on public.menus (menu_date);
create index if not exists menus_status_idx on public.menus (status);
create index if not exists menus_order_idx on public.menus (order_index);

create table if not exists public.menu_ingredients (
    id                  uuid primary key default gen_random_uuid(),
    menu_id             uuid        not null references public.menus (id) on delete cascade,
    food_composition_id uuid references public.food_compositions (id) on delete set null,
    name                text        not null,
    amount_gr           numeric(10, 2) not null default 0 check (amount_gr >= 0),
    role                text,
    created_at          timestamptz not null default now()
);

create index if not exists menu_ingredients_menu_idx
    on public.menu_ingredients (menu_id);

-- ---------------------------------------------------------------------
-- Produksi harian
-- ---------------------------------------------------------------------
create table if not exists public.production_batches (
    id                        uuid primary key default gen_random_uuid(),
    production_date           date        not null,
    day_label                 text,
    menu_id                   uuid references public.menus (id) on delete set null,
    menu_name                 text        not null,
    batch_code                text        not null unique,
    planned_portions          integer     not null default 0 check (planned_portions >= 0),
    actual_portions           integer     not null default 0 check (actual_portions >= 0),
    qc_passed_portions        integer     not null default 0 check (qc_passed_portions >= 0),
    rejected_portions         integer     not null default 0 check (rejected_portions >= 0),
    food_cost_total           numeric(18, 2) not null default 0 check (food_cost_total >= 0),
    operational_cost_total    numeric(18, 2) not null default 0 check (operational_cost_total >= 0),
    is_effective_service_day  boolean     not null default true,
    status                    text        not null default 'Terjadwal'
        check (status in ('Terjadwal', 'Sedang Berjalan', 'Selesai', 'Dibatalkan')),
    lead_chef                 text,
    notes                     text,
    timeline                  jsonb       not null default '[]'::jsonb,
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now(),
    created_by                uuid references auth.users (id) on delete set null,
    updated_by                uuid references auth.users (id) on delete set null,
    source_reference          text
);

create index if not exists production_batches_date_idx
    on public.production_batches (production_date);
create index if not exists production_batches_status_idx
    on public.production_batches (status);

-- ---------------------------------------------------------------------
-- Distribusi
-- ---------------------------------------------------------------------
create table if not exists public.distribution_routes (
    id                  uuid primary key default gen_random_uuid(),
    route_code          text        not null,
    distribution_date   date        not null,
    destination_name    text        not null,
    destination_type    text,
    address             text,
    driver_name         text,
    departure_time      text,
    eta_time            text,
    received_time       text,
    dispatched_portions integer     not null default 0 check (dispatched_portions >= 0),
    received_portions   integer     not null default 0 check (received_portions >= 0),
    status              text        not null default 'Siap Kirim'
        check (status in ('Siap Kirim', 'Dalam Perjalanan', 'Diterima', 'Gagal')),
    receiver_name       text,
    notes               text,
    production_id       uuid references public.production_batches (id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    created_by          uuid references auth.users (id) on delete set null,
    updated_by          uuid references auth.users (id) on delete set null,
    source_reference    text,
    constraint distribution_received_lte_dispatched
        check (received_portions <= dispatched_portions)
);

create unique index if not exists distribution_date_route_idx
    on public.distribution_routes (distribution_date, route_code);
create index if not exists distribution_status_idx
    on public.distribution_routes (status);

-- ---------------------------------------------------------------------
-- Keamanan pangan: checklist, SLHS, insiden, food waste
-- ---------------------------------------------------------------------
create table if not exists public.hygiene_checklists (
    id              uuid primary key default gen_random_uuid(),
    checklist_date  date        not null unique,
    inspector_name  text,
    score_percent   numeric(5, 2) check (score_percent between 0 and 100),
    status          text        default 'Memenuhi Syarat',
    last_updated    timestamptz not null default now(),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    created_by      uuid references auth.users (id) on delete set null,
    updated_by      uuid references auth.users (id) on delete set null
);

create table if not exists public.hygiene_items (
    id            uuid primary key default gen_random_uuid(),
    checklist_id  uuid        not null references public.hygiene_checklists (id) on delete cascade,
    item_code     text        not null,
    area          text        not null,
    parameter     text        not null,
    checked       boolean     not null default false,
    notes         text,
    updated_at    timestamptz not null default now(),
    unique (checklist_id, item_code)
);

create index if not exists hygiene_items_checklist_idx
    on public.hygiene_items (checklist_id);

create table if not exists public.slhs_certificates (
    id                 uuid primary key default gen_random_uuid(),
    certificate_number text        not null unique,
    document_name      text        not null,
    issued_by          text,
    issue_date         date,
    expiry_date        date,
    status             text        not null default 'Aktif',
    source_reference   text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    created_by         uuid references auth.users (id) on delete set null,
    updated_by         uuid references auth.users (id) on delete set null,
    constraint slhs_expiry_after_issue
        check (expiry_date is null or issue_date is null or expiry_date >= issue_date)
);

create index if not exists slhs_expiry_idx on public.slhs_certificates (expiry_date);

create table if not exists public.food_safety_incidents (
    id           uuid primary key default gen_random_uuid(),
    incident_date date       not null default current_date,
    title        text        not null,
    severity     text        not null default 'Sedang'
        check (severity in ('Rendah', 'Sedang', 'Tinggi', 'Kritis')),
    location     text,
    reported_by  text,
    status       text        not null default 'Investigasi'
        check (status in ('Investigasi', 'Terselesaikan', 'Ditutup')),
    action_taken text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    created_by   uuid references auth.users (id) on delete set null,
    updated_by   uuid references auth.users (id) on delete set null
);

create index if not exists incidents_date_idx
    on public.food_safety_incidents (incident_date desc);

create table if not exists public.food_waste_records (
    id                  uuid primary key default gen_random_uuid(),
    waste_date          date        not null default current_date,
    category            text        not null,
    weight_kg           numeric(10, 2) not null default 0 check (weight_kg >= 0),
    percentage_of_batch numeric(5, 2) check (percentage_of_batch between 0 and 100),
    handling_method     text,
    notes               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    created_by          uuid references auth.users (id) on delete set null,
    updated_by          uuid references auth.users (id) on delete set null
);

create index if not exists food_waste_date_idx
    on public.food_waste_records (waste_date desc);

-- ---------------------------------------------------------------------
-- Notifikasi
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
    id            uuid primary key default gen_random_uuid(),
    title         text        not null,
    message       text        not null,
    category      text,
    related_route text,
    recipient_id  uuid references auth.users (id) on delete cascade,
    unit_code     text,
    is_read       boolean     not null default false,
    occurred_at   timestamptz not null default now(),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists notifications_occurred_idx
    on public.notifications (occurred_at desc);
create index if not exists notifications_unread_idx
    on public.notifications (is_read) where not is_read;

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
    id          bigserial primary key,
    actor_id    uuid references auth.users (id) on delete set null,
    actor_role  text,
    action      text        not null,
    entity      text,
    entity_id   text,
    metadata    jsonb       not null default '{}'::jsonb,
    occurred_at timestamptz not null default now()
);

create index if not exists audit_logs_occurred_idx
    on public.audit_logs (occurred_at desc);

-- ---------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------
do $$
declare
    target text;
begin
    foreach target in array array[
        'app_users',
        'app_settings',
        'budget_parameters',
        'beneficiaries',
        'food_compositions',
        'menus',
        'production_batches',
        'distribution_routes',
        'hygiene_checklists',
        'slhs_certificates',
        'food_safety_incidents',
        'food_waste_records',
        'notifications'
    ]
    loop
        execute format('drop trigger if exists set_updated_at on public.%I', target);
        execute format(
            'create trigger set_updated_at before update on public.%I '
            'for each row execute function public.set_updated_at()', target
        );
    end loop;
end;
$$;
