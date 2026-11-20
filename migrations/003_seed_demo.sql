-- =====================================================================
-- DapurGizi — 003 Seed DEMO 
-- =====================================================================
-- PERINGATAN:
--   * Seluruh baris di sini adalah data SINTETIS untuk pengembangan/DEMO.
--   * Nama, institusi, NIK, nominal, dan tanggal BUKAN data operasional
--     dan BUKAN ketentuan resmi BGN.
--   * Jangan menjalankan file ini pada database production.
--   * akun login tidak di-seed di sini karena kredensial dikelola
--     Supabase Auth (lihat docs/BACKEND-ARCHITECTURE.md bagian provisioning).
--
-- Cara menjalankan (psql / SQL editor yang mendukung SET):
--   set dapurgizi.allow_demo_seed = 'on';
--   \i migrations/003_seed_demo.sql
-- =====================================================================

do $$
begin
    if coalesce(current_setting('dapurgizi.allow_demo_seed', true), '') <> 'on' then
        raise exception
            'Seed DEMO dinonaktifkan. Jalankan "set dapurgizi.allow_demo_seed = ''on'';" lebih dulu.';
    end if;

    if exists (
        select 1 from public.app_settings
        where id = '00000000-0000-4000-8000-00000000d001'::uuid
    ) then
        raise notice 'Seed DEMO sudah pernah dijalankan; dilewati.';
        return;
    end if;

    -- -------------------------------------------------------------
    -- Pengaturan unit DEMO
    -- -------------------------------------------------------------
    insert into public.app_settings (
        id, unit_code, unit_name, head_name, city,
        enable_sound_alerts, enable_desktop_toast,
        auto_refresh_interval_sec, default_shift_start
    ) values (
        '00000000-0000-4000-8000-00000000d001',
        'DEMO-SPPG-001',
        'DEMO — Unit SPPG Pengembangan',
        null,
        null,
        true, true, 60, '03:00 WIB'
    );

    -- -------------------------------------------------------------
    -- Parameter anggaran DEMO (bukan ketentuan resmi)
    -- -------------------------------------------------------------
    insert into public.budget_parameters (
        id, config_label, reference_source, effective_date,
        monthly_allocation_ceiling,
        standard_food_cost_ceiling_per_portion,
        standard_operational_cost_ceiling_per_portion,
        daily_facility_incentive_rate,
        target_daily_portions_baseline,
        effective_service_days_in_month,
        warning_threshold_percent,
        is_demo_config, is_active
    ) values (
        '00000000-0000-4000-8000-00000000d002',
        'DEMO — Parameter Simulasi Pengembangan',
        'DEMO-SEED: nilai simulasi internal, BUKAN ketentuan resmi BGN',
        '2026-11-01',
        1150000000,
        10000,
        2100,
        6000000,
        3000,
        22,
        92,
        true, true
    );

    -- -------------------------------------------------------------
    -- Komposisi pangan (referensi contoh, sumber ditandai DEMO)
    -- -------------------------------------------------------------
    insert into public.food_compositions (
        id, food_name, edition, source_reference,
        energy_kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g
    ) values
        ('00000000-0000-4000-8000-00000000d101', 'Beras putih masak', 'DEMO-1',
         'DEMO-SEED: contoh komposisi, bukan TKPI resmi', 180, 3.0, 39.8, 0.3),
        ('00000000-0000-4000-8000-00000000d102', 'Ayam broiler', 'DEMO-1',
         'DEMO-SEED: contoh komposisi, bukan TKPI resmi', 298, 18.2, 0, 25.0),
        ('00000000-0000-4000-8000-00000000d103', 'Tempe kedelai', 'DEMO-1',
         'DEMO-SEED: contoh komposisi, bukan TKPI resmi', 201, 20.8, 13.5, 8.8),
        ('00000000-0000-4000-8000-00000000d104', 'Bayam segar', 'DEMO-1',
         'DEMO-SEED: contoh komposisi, bukan TKPI resmi', 36, 3.5, 6.5, 0.5);

    -- -------------------------------------------------------------
    -- Penerima manfaat DEMO (NIK sengaja fiktif dan berurutan)
    -- -------------------------------------------------------------
    insert into public.beneficiaries (
        id, nik, full_name, category, institution, grade_or_group,
        status, notes, registered_at, source_reference
    ) values
        ('00000000-0000-4000-8000-00000000d201', '0000000000000001', 'Penerima Demo 01',
         'Siswa SD', 'Sekolah Demo 01', 'Kelas 4A', 'Aktif', 'Tidak ada alergi', '2026-09-01', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d202', '0000000000000002', 'Penerima Demo 02',
         'Siswa SMP', 'Sekolah Demo 01', 'Kelas 8C', 'Aktif', 'Tidak ada alergi', '2026-09-01', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d203', '0000000000000003', 'Penerima Demo 03',
         'Siswa SMA', 'Sekolah Demo 02', 'Kelas 11', 'Aktif', 'Tidak ada alergi', '2026-09-02', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d204', '0000000000000004', 'Penerima Demo 04',
         'Ibu Hamil', 'Posyandu Demo', 'Trimester 2', 'Aktif', 'Catatan gizi contoh', '2026-09-03', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d205', '0000000000000005', 'Penerima Demo 05',
         'Ibu Menyusui', 'Posyandu Demo', 'ASI Eksklusif', 'Aktif', 'Tidak ada alergi', '2026-09-03', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d206', '0000000000000006', 'Penerima Demo 06',
         'Balita', 'Posyandu Demo', 'Usia 30 bulan', 'Nonaktif', 'Tekstur lunak', '2026-09-04', 'DEMO-SEED');

    -- -------------------------------------------------------------
    -- Menu DEMO
    -- -------------------------------------------------------------
    insert into public.menus (
        id, week_label, day_name, menu_date, order_index, name, target_category,
        planned_portions, calories_kcal, protein_gram, carbs_gram, fat_gram,
        cost_estimate_per_portion, status, reviewed_by, review_notes, source_reference
    ) values
        ('00000000-0000-4000-8000-00000000d301', 'Minggu Demo', 'Senin', '2026-11-10', 1,
         'Menu Demo Senin', 'Semua Kategori', 300, 640, 28, 82, 19, 11800,
         'Disetujui', null, 'Data DEMO-SEED', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d302', 'Minggu Demo', 'Selasa', '2026-11-11', 2,
         'Menu Demo Selasa', 'Semua Kategori', 300, 630, 27, 80, 18, 12100,
         'Disetujui', null, 'Data DEMO-SEED', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d303', 'Minggu Demo', 'Rabu', '2026-11-12', 3,
         'Menu Demo Rabu', 'Semua Kategori', 300, 655, 29, 83, 20, 11950,
         'Menunggu Persetujuan', null, 'Data DEMO-SEED', 'DEMO-SEED');

    insert into public.menu_ingredients (menu_id, name, amount_gr, role)
    values
        ('00000000-0000-4000-8000-00000000d303', 'Beras putih masak', 150, 'Karbohidrat Utama'),
        ('00000000-0000-4000-8000-00000000d303', 'Ayam broiler', 80, 'Protein Hewani'),
        ('00000000-0000-4000-8000-00000000d303', 'Bayam segar', 90, 'Sayuran & Serat');

    -- -------------------------------------------------------------
    -- Produksi DEMO
    -- -------------------------------------------------------------
    insert into public.production_batches (
        id, production_date, day_label, menu_id, menu_name, batch_code,
        planned_portions, actual_portions, qc_passed_portions, rejected_portions,
        food_cost_total, operational_cost_total, is_effective_service_day,
        status, lead_chef, notes, timeline, source_reference
    ) values
        ('00000000-0000-4000-8000-00000000d401', '2026-11-10', 'Senin',
         '00000000-0000-4000-8000-00000000d301', 'Menu Demo Senin', 'DEMO-BATCH-1110',
         300, 298, 298, 0, 3550000, 630000, true, 'Selesai', null, 'Data DEMO-SEED',
         '[{"time":"03:00 WIB","stage":"Penerimaan bahan","done":true},
           {"time":"06:00 WIB","stage":"Pemorsian","done":true}]'::jsonb, 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d402', '2026-11-11', 'Selasa',
         '00000000-0000-4000-8000-00000000d302', 'Menu Demo Selasa', 'DEMO-BATCH-1111',
         300, 300, 300, 0, 3630000, 636000, true, 'Selesai', null, 'Data DEMO-SEED',
         '[{"time":"03:00 WIB","stage":"Penerimaan bahan","done":true},
           {"time":"06:00 WIB","stage":"Pemorsian","done":true}]'::jsonb, 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d403', '2026-11-12', 'Rabu',
         '00000000-0000-4000-8000-00000000d303', 'Menu Demo Rabu', 'DEMO-BATCH-1112',
         300, 295, 295, 0, 3585000, 615000, true, 'Sedang Berjalan', null, 'Data DEMO-SEED',
         '[{"time":"03:00 WIB","stage":"Penerimaan bahan","done":true},
           {"time":"06:00 WIB","stage":"Pemorsian","done":false}]'::jsonb, 'DEMO-SEED');

    -- -------------------------------------------------------------
    -- Distribusi DEMO
    -- -------------------------------------------------------------
    insert into public.distribution_routes (
        id, route_code, distribution_date, destination_name, destination_type,
        address, driver_name, departure_time, eta_time, received_time,
        dispatched_portions, received_portions, status, receiver_name, notes,
        production_id, source_reference
    ) values
        ('00000000-0000-4000-8000-00000000d501', 'DEMO-RUTE-1', '2026-11-12',
         'Sekolah Demo 01', 'Sekolah Dasar', null, null, '06:45 WIB', '07:15 WIB', '07:12 WIB',
         150, 150, 'Diterima', 'Penerima Demo', 'Data DEMO-SEED',
         '00000000-0000-4000-8000-00000000d403', 'DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d502', 'DEMO-RUTE-2', '2026-11-12',
         'Posyandu Demo', 'Posyandu', null, null, '08:00 WIB', '08:30 WIB', null,
         145, 0, 'Siap Kirim', null, 'Data DEMO-SEED',
         '00000000-0000-4000-8000-00000000d403', 'DEMO-SEED');

    -- -------------------------------------------------------------
    -- Keamanan pangan DEMO
    -- -------------------------------------------------------------
    insert into public.hygiene_checklists (
        id, checklist_date, inspector_name, score_percent, status
    ) values (
        '00000000-0000-4000-8000-00000000d601', '2026-11-12',
        'Petugas Demo', 66.67, 'Perlu Verifikasi'
    );

    insert into public.hygiene_items (
        id, checklist_id, item_code, area, parameter, checked, notes
    ) values
        ('00000000-0000-4000-8000-00000000d611', '00000000-0000-4000-8000-00000000d601',
         'HYG-01', 'Personel', 'APD lengkap digunakan', true, 'Data DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d612', '00000000-0000-4000-8000-00000000d601',
         'HYG-02', 'Pengolahan', 'Suhu inti minimal 75 derajat Celsius', true, 'Data DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d613', '00000000-0000-4000-8000-00000000d601',
         'HYG-03', 'Armada', 'Desinfeksi boks distribusi', false, 'Data DEMO-SEED');

    insert into public.slhs_certificates (
        id, certificate_number, document_name, issued_by, issue_date, expiry_date,
        status, source_reference
    ) values (
        '00000000-0000-4000-8000-00000000d621', 'DEMO-SLHS-001',
        'Sertifikat Demo (bukan dokumen resmi)', 'Penerbit Demo',
        '2026-01-01', '2026-12-31', 'Aktif', 'DEMO-SEED'
    );

    insert into public.food_safety_incidents (
        id, incident_date, title, severity, location, reported_by, status, action_taken
    ) values (
        '00000000-0000-4000-8000-00000000d631', '2026-11-11',
        'Insiden Demo: segel boks longgar', 'Rendah', 'Titik Demo',
        'Petugas Demo', 'Terselesaikan', 'Porsi cadangan digunakan.'
    );

    insert into public.food_waste_records (
        id, waste_date, category, weight_kg, percentage_of_batch, handling_method, notes
    ) values
        ('00000000-0000-4000-8000-00000000d641', '2026-11-11', 'Sisa konsumsi', 1.2, 0.4,
         'Kompos', 'Data DEMO-SEED'),
        ('00000000-0000-4000-8000-00000000d642', '2026-11-12', 'Sisa konsumsi', 0.9, 0.3,
         'Kompos', 'Data DEMO-SEED');

    -- -------------------------------------------------------------
    -- Notifikasi DEMO
    -- -------------------------------------------------------------
    insert into public.notifications (
        id, title, message, category, related_route, unit_code, is_read, occurred_at
    ) values
        ('00000000-0000-4000-8000-00000000d701',
         'Menu Demo menunggu persetujuan',
         'Data DEMO-SEED: menu contoh memerlukan peninjauan.',
         'Menu & Gizi', 'menus', 'DEMO-SPPG-001', false, '2026-11-12T04:55:00+07:00'),
        ('00000000-0000-4000-8000-00000000d702',
         'Checklist sanitasi belum lengkap',
         'Data DEMO-SEED: satu item belum diverifikasi.',
         'Keamanan Pangan', 'food-safety', 'DEMO-SPPG-001', false, '2026-11-12T05:05:00+07:00');

    raise notice 'Seed DEMO selesai. Data ini bukan data operasional.';
end;
$$;
