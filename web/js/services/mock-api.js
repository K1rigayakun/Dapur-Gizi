/**
 * DapurGizi — Demo Mode Mock API Layer (js/services/mock-api.js)
 *
 * Provides realistic Indonesian SPPG (Satuan Pelayanan Pemenuhan Gizi) sample data,
 * full CRUD persistence in localStorage (strictly labeled as DEMO), dynamic KPI calculations,
 * budget/incentive modeling, distribution tracking, hygiene checklists, and report generation.
 *
 * SECURITY NOTE:
 * Never stores real passwords, JWT secrets, or Supabase keys in localStorage.
 */

const DEMO_DB_KEY = 'dapurgizi_demo_db_v1';
const DEMO_SESSION_KEY = 'dapurgizi_demo_session_v1';

function createInitialDemoDataset() {
  return {
    meta: {
      isDemoData: true,
      sppgUnitName: 'SPPG Kota Medan Baru — Unit 04',
      sppgCode: 'SPPG-SUMUT-MDN-004',
      province: 'Sumatera Utara',
      city: 'Kota Medan',
      address: 'Jl. Iskandar Muda No. 118, Kec. Medan Baru, Kota Medan',
      effectiveDate: '2026-11-12'
    },
    users: [
      {
        id: 'USR-001',
        name: 'Dr. Hendra Wijaya, M.Gz',
        email: 'kepala@dapurgizi.id',
        role: 'Kepala SPPG',
        status: 'Aktif',
        phone: '0812-6501-4410',
        unit: 'SPPG Kota Medan Baru — Unit 04',
        lastLogin: '2026-11-12T05:05:00+07:00'
      },
      {
        id: 'USR-002',
        name: 'Siti Rahmawati, S.Gz, RD',
        email: 'gizi@dapurgizi.id',
        role: 'Pengawas Gizi',
        status: 'Aktif',
        phone: '0813-7720-1988',
        unit: 'SPPG Kota Medan Baru — Unit 04',
        lastLogin: '2026-11-12T04:50:00+07:00'
      },
      {
        id: 'USR-003',
        name: 'Budi Santoso, S.E., Ak.',
        email: 'keuangan@dapurgizi.id',
        role: 'Pengawas Keuangan',
        status: 'Aktif',
        phone: '0811-6091-3321',
        unit: 'SPPG Kota Medan Baru — Unit 04',
        lastLogin: '2026-11-11T17:15:00+07:00'
      },
      {
        id: 'USR-004',
        name: 'Rina Kartika, S.KM',
        email: 'sanitasi@dapurgizi.id',
        role: 'Pengawas Sanitasi',
        status: 'Aktif',
        phone: '0852-9604-8812',
        unit: 'SPPG Kota Medan Baru — Unit 04',
        lastLogin: '2026-11-12T04:30:00+07:00'
      },
      {
        id: 'USR-005',
        name: 'Ahmad Fauzi, S.Tr.Gz',
        email: 'ahmad.fauzi@dapurgizi.id',
        role: 'Pengawas Gizi',
        status: 'Nonaktif',
        phone: '0821-6400-5199',
        unit: 'SPPG Kota Medan Baru — Unit 04',
        lastLogin: '2026-10-28T09:12:00+07:00'
      }
    ],
    beneficiaries: [
      {
        id: 'BNF-1001',
        nik: '1271042105160001',
        name: 'Aditya Pratama Putra',
        category: 'Siswa SD',
        institution: 'SDN 060812 Medan Baru',
        gradeOrGroup: 'Kelas 4A',
        status: 'Aktif',
        notes: 'Tidak ada alergi',
        registeredAt: '2026-09-01'
      },
      {
        id: 'BNF-1002',
        nik: '1271045508170002',
        name: 'Nabila Azzahra Lubis',
        category: 'Siswa SD',
        institution: 'SDN 060812 Medan Baru',
        gradeOrGroup: 'Kelas 3B',
        status: 'Aktif',
        notes: 'Alergi udang / seafood bercangkang',
        registeredAt: '2026-09-01'
      },
      {
        id: 'BNF-1003',
        nik: '1271041203120003',
        name: 'Rizky Ramadhan Siregar',
        category: 'Siswa SMP',
        institution: 'SMP Negeri 1 Medan',
        gradeOrGroup: 'Kelas 8C',
        status: 'Aktif',
        notes: 'Tidak ada alergi',
        registeredAt: '2026-09-03'
      },
      {
        id: 'BNF-1004',
        nik: '1271046211110004',
        name: 'Putri Maharani Nasution',
        category: 'Siswa SMP',
        institution: 'SMP Negeri 1 Medan',
        gradeOrGroup: 'Kelas 9A',
        status: 'Aktif',
        notes: 'Intoleransi laktosa ringan',
        registeredAt: '2026-09-03'
      },
      {
        id: 'BNF-1005',
        nik: '1271040907090005',
        name: 'Fajar Siddiq Harahap',
        category: 'Siswa SMA',
        institution: 'SMA Negeri 1 Medan',
        gradeOrGroup: 'Kelas 11 IPA 2',
        status: 'Aktif',
        notes: 'Tidak ada alergi',
        registeredAt: '2026-09-05'
      },
      {
        id: 'BNF-1006',
        nik: '1271044402960006',
        name: 'Ny. Dewi Sartika Sembiring',
        category: 'Ibu Hamil',
        institution: 'Posyandu Melati Putih IV',
        gradeOrGroup: 'Trimester 2 (24 Minggu)',
        status: 'Aktif',
        notes: 'Butuh tambahan zat besi & protein tinggi',
        registeredAt: '2026-09-10'
      },
      {
        id: 'BNF-1007',
        nik: '1271045109980007',
        name: 'Ny. Lestari Handayani Ginting',
        category: 'Ibu Menyusui',
        institution: 'Posyandu Melati Putih IV',
        gradeOrGroup: 'ASI Eksklusif (Bayi 4 bln)',
        status: 'Aktif',
        notes: 'Tidak ada alergi',
        registeredAt: '2026-09-12'
      },
      {
        id: 'BNF-1008',
        nik: '1271041901230008',
        name: 'Arkaiyan Alvaro Tarigan',
        category: 'Balita',
        institution: 'Posyandu Anggrek Bulan II',
        gradeOrGroup: 'Usia 38 Bulan',
        status: 'Aktif',
        notes: 'Tekstur makanan lunak / cincang halus',
        registeredAt: '2026-09-14'
      },
      {
        id: 'BNF-1009',
        nik: '1271042904150009',
        name: 'Kevin Immanuel Sinaga',
        category: 'Siswa SD',
        institution: 'SDN 060815 Padang Bulan',
        gradeOrGroup: 'Kelas 5A',
        status: 'Aktif',
        notes: 'Tidak ada alergi',
        registeredAt: '2026-09-15'
      },
      {
        id: 'BNF-1010',
        nik: '1271046712080010',
        name: 'Alya Zahra Hasibuan',
        category: 'Siswa SMA',
        institution: 'SMA Negeri 1 Medan',
        gradeOrGroup: 'Kelas 12 IPS 1',
        status: 'Nonaktif',
        notes: 'Pindah domisili sekolah',
        registeredAt: '2026-09-05'
      }
    ],
    menus: [
      {
        id: 'MNU-W46-01',
        weekLabel: 'Minggu 46 (09–13 Nov 2026)',
        dayName: 'Senin',
        date: '2026-11-09',
        orderIndex: 1,
        name: 'Nasi Putih, Ayam Bumbu Kuning Lengkuas, Sayur Bening Bayam Jagung & Pisang Barangan',
        targetCategory: 'Semua Kategori (Disesuaikan Gramasi)',
        plannedPortions: 2850,
        caloriesKcal: 645,
        proteinGram: 28.4,
        carbsGram: 84.0,
        fatGram: 19.2,
        costEstimatePerPortion: 11800,
        status: 'Disetujui',
        reviewedBy: 'Dr. Hendra Wijaya, M.Gz',
        reviewNotes: 'Komposisi protein hewani dan mikronutrien seimbang.',
        ingredients: [
          { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
          { name: 'Dada & Paha Ayam Tanpa Tulang', amountGr: 85, role: 'Protein Hewani' },
          { name: 'Tahu Putih Kukus', amountGr: 40, role: 'Protein Nabati' },
          { name: 'Bayam Hijau & Jagung Manis', amountGr: 85, role: 'Sayuran & Serat' },
          { name: 'Pisang Barangan Medan', amountGr: 100, role: 'Buah Segar' }
        ]
      },
      {
        id: 'MNU-W46-02',
        weekLabel: 'Minggu 46 (09–13 Nov 2026)',
        dayName: 'Selasa',
        date: '2026-11-10',
        orderIndex: 2,
        name: 'Nasi Putih, Ikan Dori Fillet Asam Manis, Tempe Bacem, Capcay Sayur Segar & Jeruk Berastagi',
        targetCategory: 'Semua Kategori (Disesuaikan Gramasi)',
        plannedPortions: 2900,
        caloriesKcal: 630,
        proteinGram: 27.6,
        carbsGram: 82.5,
        fatGram: 18.0,
        costEstimatePerPortion: 12100,
        status: 'Disetujui',
        reviewedBy: 'Dr. Hendra Wijaya, M.Gz',
        reviewNotes: 'Pastikan fillet ikan bebas duri untuk Siswa SD dan Balita.',
        ingredients: [
          { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
          { name: 'Fillet Ikan Dori Tanpa Duri', amountGr: 80, role: 'Protein Hewani' },
          { name: 'Tempe Kedelai Lokal', amountGr: 45, role: 'Protein Nabati' },
          { name: 'Wortel, Brokoli & Sawi Putih', amountGr: 90, role: 'Sayuran & Serat' },
          { name: 'Jeruk Manis Berastagi', amountGr: 110, role: 'Buah Segar' }
        ]
      },
      {
        id: 'MNU-W46-03',
        weekLabel: 'Minggu 46 (09–13 Nov 2026)',
        dayName: 'Rabu',
        date: '2026-11-11',
        orderIndex: 3,
        name: 'Nasi Putih, Daging Sapi Semur Nusantara, Perkedel Tahu, Tumis Buncis Wortel & Pepaya Kalifornia',
        targetCategory: 'Semua Kategori (Disesuaikan Gramasi)',
        plannedPortions: 2920,
        caloriesKcal: 670,
        proteinGram: 30.2,
        carbsGram: 85.0,
        fatGram: 21.4,
        costEstimatePerPortion: 12650,
        status: 'Disetujui',
        reviewedBy: 'Dr. Hendra Wijaya, M.Gz',
        reviewNotes: 'Tinggi zat besi untuk Ibu Hamil & Remaja Putri.',
        ingredients: [
          { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
          { name: 'Daging Sapi Has Dalam', amountGr: 75, role: 'Protein Hewani' },
          { name: 'Tahu & Telur Ayam', amountGr: 50, role: 'Protein Campuran' },
          { name: 'Buncis Muda & Wortel', amountGr: 85, role: 'Sayuran & Serat' },
          { name: 'Pepaya Kalifornia Potong', amountGr: 110, role: 'Buah Segar' }
        ]
      },
      {
        id: 'MNU-W46-04',
        weekLabel: 'Minggu 46 (09–13 Nov 2026)',
        dayName: 'Kamis',
        date: '2026-11-12',
        orderIndex: 4,
        name: 'Nasi Putih, Ayam Panggang Kecap Rempah, Telur Rebus Utuh, Sup Kimlo Sayur & Semangka Merah',
        targetCategory: 'Semua Kategori (Disesuaikan Gramasi)',
        plannedPortions: 2960,
        caloriesKcal: 655,
        proteinGram: 29.5,
        carbsGram: 83.0,
        fatGram: 19.8,
        costEstimatePerPortion: 11950,
        status: 'Disetujui',
        reviewedBy: 'Dr. Hendra Wijaya, M.Gz',
        reviewNotes: 'Menu aktif produksi hari ini (Kamis, 12 Nov 2026).',
        ingredients: [
          { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
          { name: 'Ayam Potong Segar', amountGr: 80, role: 'Protein Hewani' },
          { name: 'Telur Ayam Negeri', amountGr: 55, role: 'Protein Hewani Tambahan' },
          { name: 'Wortel, Jamur Kuping & Kembang Kol', amountGr: 90, role: 'Sayuran & Serat' },
          { name: 'Semangka Merah Tanpa Biji', amountGr: 120, role: 'Buah Segar' }
        ]
      },
      {
        id: 'MNU-W46-05',
        weekLabel: 'Minggu 46 (09–13 Nov 2026)',
        dayName: 'Jumat',
        date: '2026-11-13',
        orderIndex: 5,
        name: 'Nasi Putih, Ikan Kembung Pesmol Kuning, Tempe Orek Manis, Sayur Lodeh Labu Siam & Melon Hijau',
        targetCategory: 'Semua Kategori (Disesuaikan Gramasi)',
        plannedPortions: 2960,
        caloriesKcal: 640,
        proteinGram: 28.8,
        carbsGram: 81.5,
        fatGram: 19.0,
        costEstimatePerPortion: 11750,
        status: 'Menunggu Persetujuan',
        reviewedBy: '-',
        reviewNotes: 'Diajukan oleh Pengawas Gizi untuk verifikasi Kepala SPPG.',
        ingredients: [
          { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
          { name: 'Ikan Kembung Segar Fillet', amountGr: 85, role: 'Protein Hewani Omega-3' },
          { name: 'Tempe Kedelai', amountGr: 45, role: 'Protein Nabati' },
          { name: 'Labu Siam & Kacang Panjang', amountGr: 90, role: 'Sayuran & Serat' },
          { name: 'Melon Hijau Segar', amountGr: 110, role: 'Buah Segar' }
        ]
      }
    ],
    productions: [
      {
        id: 'PRD-20261106',
        date: '2026-11-06',
        dayLabel: 'Jumat',
        isEffectiveServiceDay: true,
        menuId: 'MNU-W45-05',
        menuName: 'Nasi Putih, Ayam Teriyaki, Tahu Kukus, Tumis Brokoli & Pisang',
        batchCode: 'BATCH-MDN04-1106',
        plannedPortions: 2800,
        actualPortions: 2800,
        qcPassedPortions: 2796,
        rejectedPortions: 4,
        foodCostTotal: 27160000,
        operationalCostTotal: 5880000,
        status: 'Selesai',
        leadChef: 'Chef Surya Darma',
        notes: '4 porsi dikarantina karena kemasan penyok saat penyegelan.',
        timeline: [
          { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: true },
          { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: true },
          { time: '05:45 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: true },
          { time: '06:30 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: true },
          { time: '07:15 WIB', stage: 'Serah Terima ke Armada Distribusi', done: true }
        ]
      },
      {
        id: 'PRD-20261109',
        date: '2026-11-09',
        dayLabel: 'Senin',
        isEffectiveServiceDay: true,
        menuId: 'MNU-W46-01',
        menuName: 'Nasi Putih, Ayam Bumbu Kuning Lengkuas, Sayur Bening Bayam Jagung & Pisang Barangan',
        batchCode: 'BATCH-MDN04-1109',
        plannedPortions: 2850,
        actualPortions: 2850,
        qcPassedPortions: 2850,
        rejectedPortions: 0,
        foodCostTotal: 27930000,
        operationalCostTotal: 5985000,
        status: 'Selesai',
        leadChef: 'Chef Surya Darma',
        notes: 'Seluruh batch memenuhi standar suhu dan gramasi.',
        timeline: [
          { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: true },
          { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: true },
          { time: '05:45 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: true },
          { time: '06:30 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: true },
          { time: '07:15 WIB', stage: 'Serah Terima ke Armada Distribusi', done: true }
        ]
      },
      {
        id: 'PRD-20261110',
        date: '2026-11-10',
        dayLabel: 'Selasa',
        isEffectiveServiceDay: true,
        menuId: 'MNU-W46-02',
        menuName: 'Nasi Putih, Ikan Dori Fillet Asam Manis, Tempe Bacem, Capcay Sayur Segar & Jeruk Berastagi',
        batchCode: 'BATCH-MDN04-1110',
        plannedPortions: 2900,
        actualPortions: 2890,
        qcPassedPortions: 2888,
        rejectedPortions: 2,
        foodCostTotal: 28900000,
        operationalCostTotal: 6069000,
        status: 'Selesai',
        leadChef: 'Chef Surya Darma',
        notes: 'Selisih 10 porsi dari rencana karena absensi siswa kelas 6 kegiatan luar sekolah.',
        timeline: [
          { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: true },
          { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: true },
          { time: '05:45 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: true },
          { time: '06:30 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: true },
          { time: '07:15 WIB', stage: 'Serah Terima ke Armada Distribusi', done: true }
        ]
      },
      {
        id: 'PRD-20261111',
        date: '2026-11-11',
        dayLabel: 'Rabu',
        isEffectiveServiceDay: true,
        menuId: 'MNU-W46-03',
        menuName: 'Nasi Putih, Daging Sapi Semur Nusantara, Perkedel Tahu, Tumis Buncis Wortel & Pepaya Kalifornia',
        batchCode: 'BATCH-MDN04-1111',
        plannedPortions: 2920,
        actualPortions: 2920,
        qcPassedPortions: 2918,
        rejectedPortions: 2,
        foodCostTotal: 30660000,
        operationalCostTotal: 6132000,
        status: 'Selesai',
        leadChef: 'Chef Surya Darma',
        notes: 'Produksi lancar 100% sesuai target rencana.',
        timeline: [
          { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: true },
          { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: true },
          { time: '05:45 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: true },
          { time: '06:30 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: true },
          { time: '07:15 WIB', stage: 'Serah Terima ke Armada Distribusi', done: true }
        ]
      },
      {
        id: 'PRD-20261112',
        date: '2026-11-12',
        dayLabel: 'Kamis',
        isEffectiveServiceDay: true,
        menuId: 'MNU-W46-04',
        menuName: 'Nasi Putih, Ayam Panggang Kecap Rempah, Telur Rebus Utuh, Sup Kimlo Sayur & Semangka Merah',
        batchCode: 'BATCH-MDN04-1112',
        plannedPortions: 2960,
        actualPortions: 2945,
        qcPassedPortions: 2945,
        rejectedPortions: 0,
        foodCostTotal: 29155500,
        operationalCostTotal: 6184500,
        status: 'Sedang Berjalan',
        leadChef: 'Chef Surya Darma',
        notes: 'Batch pagi telah selesai diporsikan (2.945 porsi). Selisih 15 porsi menunggu konfirmasi kloter Posyandu siang.',
        timeline: [
          { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: true },
          { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: true },
          { time: '05:30 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: true },
          { time: '06:15 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: true },
          { time: '07:00 WIB', stage: 'Serah Terima ke Armada Distribusi', done: false }
        ]
      }
    ],
    budgetParameters: {
      isDemoConfig: true,
      configLabel: 'DEMO — Parameter Simulasi Internal SPPG',
      referenceSource: 'Simulasi Konfigurasi Akademik DapurGizi (Dapat Disesuaikan Sesuai Juknis Resmi BGN)',
      effectiveDate: '2026-11-01',
      monthlyAllocationCeiling: 1150000000,
      standardFoodCostCeilingPerPortion: 10000,
      standardOperationalCostCeilingPerPortion: 2100,
      dailyFacilityIncentiveRate: 6000000,
      targetDailyPortionsBaseline: 3000,
      effectiveServiceDaysInMonth: 22,
      warningThresholdPercent: 92
    },
    distributions: [
      {
        id: 'DST-20261112-01',
        date: '2026-11-12',
        routeCode: 'RUTE-A1',
        destinationName: 'SDN 060812 Medan Baru',
        destinationType: 'Sekolah Dasar',
        address: 'Jl. Sei Babura No. 14, Medan Baru',
        driverName: 'Rahmat Hidayat (BK 8821 MN)',
        departureTime: '06:45 WIB',
        etaTime: '07:15 WIB',
        receivedTime: '07:12 WIB',
        dispatchedPortions: 820,
        receivedPortions: 820,
        status: 'Diterima',
        receiverName: 'Dra. Hj. Nurhayati (Kepala Sekolah)',
        notes: 'Seluruh ompreng diterima dalam keadaan tersegel hangat.'
      },
      {
        id: 'DST-20261112-02',
        date: '2026-11-12',
        routeCode: 'RUTE-A2',
        destinationName: 'SMP Negeri 1 Medan',
        destinationType: 'Sekolah Menengah Pertama',
        address: 'Jl. Bunga Asoka No. 6, Medan',
        driverName: 'Dedi Kurniawan (BK 8824 MN)',
        departureTime: '06:50 WIB',
        etaTime: '07:25 WIB',
        receivedTime: '07:22 WIB',
        dispatchedPortions: 940,
        receivedPortions: 938,
        status: 'Diterima',
        receiverName: 'Drs. Taufik Lubis, M.Pd (Wakasek Kesiswaan)',
        notes: 'Selisih 2 porsi karena tutup ompreng longgar saat bongkar muat (diganti cadangan).'
      },
      {
        id: 'DST-20261112-03',
        date: '2026-11-12',
        routeCode: 'RUTE-B1',
        destinationName: 'SMA Negeri 1 Medan',
        destinationType: 'Sekolah Menengah Atas',
        address: 'Jl. Teuku Cik Ditiro No. 1, Medan',
        driverName: 'Heri Syahputra (BK 8829 MN)',
        departureTime: '07:05 WIB',
        etaTime: '07:40 WIB',
        receivedTime: '-',
        dispatchedPortions: 760,
        receivedPortions: 0,
        status: 'Dalam Perjalanan',
        receiverName: '-',
        notes: 'Armada sedang menuju titik serah terima sekolah.'
      },
      {
        id: 'DST-20261112-04',
        date: '2026-11-12',
        routeCode: 'RUTE-C1',
        destinationName: 'Posyandu Melati Putih IV & Anggrek Bulan II',
        destinationType: 'Posyandu (Ibu Hamil, Menyusui & Balita)',
        address: 'Kelurahan Babura, Kec. Medan Baru',
        driverName: 'Rahmat Hidayat (BK 8821 MN)',
        departureTime: '08:00 WIB',
        etaTime: '08:30 WIB',
        receivedTime: '-',
        dispatchedPortions: 425,
        receivedPortions: 0,
        status: 'Siap Kirim',
        receiverName: '-',
        notes: 'Menunggu pemuatan kloter khusus porsi Ibu Hamil & Balita.'
      }
    ],
    hygieneChecklist: {
      date: '2026-11-12',
      inspectorName: 'Rina Kartika, S.KM',
      lastUpdated: '2026-11-12T05:00:00+07:00',
      items: [
        {
          id: 'HYG-01',
          area: 'Personel Penjamah Makanan',
          parameter: 'Penggunaan APD lengkap (celemek bersih, hairnet, masker, sarung tangan food-grade & sepatu anti-slip)',
          checked: true,
          notes: '18 juru masak & asisten telah diperiksa pukul 03:00 WIB.'
        },
        {
          id: 'HYG-02',
          area: 'Penerimaan Bahan Baku',
          parameter: 'Pemeriksaan suhu bahan pangan dingin (<5°C) dan kesegaran organoleptik daging/ikan/sayur',
          checked: true,
          notes: 'Ayam segar diterima pada suhu 3.4°C.'
        },
        {
          id: 'HYG-03',
          area: 'Pengolahan Termal',
          parameter: 'Verifikasi suhu inti pemasakan protein hewani mencapai minimal 75°C selama ≥2 menit',
          checked: true,
          notes: 'Suhu inti ayam panggang tercatat 81.2°C.'
        },
        {
          id: 'HYG-04',
          area: 'Penyimpanan Sampel Bank Makanan (Food Sample)',
          parameter: 'Pengambilan dan pelabelan sampel arsip setiap menu (2x24 jam pada chiller 0–4°C)',
          checked: true,
          notes: 'Sampel BATCH-MDN04-1112 tersimpan di rak Chiller B-02.'
        },
        {
          id: 'HYG-05',
          area: 'Sanitasi Ompreng & Peralatan Makan',
          parameter: 'Pencucian ompreng stainless steel dengan air panas (>80°C) dan pengeringan steril',
          checked: true,
          notes: 'Mesin dishwasher industri beroperasi normal.'
        },
        {
          id: 'HYG-06',
          area: 'Armada & Boks Distribusi',
          parameter: 'Desinfeksi kabin pengangkut makanan dan pengecekan segel termal sebelum keberangkatan',
          checked: false,
          notes: 'Menunggu verifikasi akhir untuk armada RUTE-C1 pukul 07:45 WIB.'
        }
      ],
      history: [
        { date: '2026-11-11', inspector: 'Rina Kartika, S.KM', scorePercent: 100, status: 'Memenuhi Syarat' },
        { date: '2026-11-10', inspector: 'Rina Kartika, S.KM', scorePercent: 100, status: 'Memenuhi Syarat' },
        { date: '2026-11-09', inspector: 'Rina Kartika, S.KM', scorePercent: 100, status: 'Memenuhi Syarat' }
      ]
    },
    slhsCertificates: [
      {
        id: 'SLHS-01',
        certificateNumber: 'SLHS/440.12/DINKES-MDN/II/2026',
        documentName: 'Sertifikat Laik Higiene Sanitasi (SLHS) Dapur Utama SPPG',
        issuedBy: 'Dinas Kesehatan Kota Medan',
        issueDate: '2026-02-15',
        expiryDate: '2027-02-15',
        status: 'Aktif'
      },
      {
        id: 'SLHS-02',
        certificateNumber: 'LAB-AIR/089/BTKLPP/X/2026',
        documentName: 'Sertifikat Uji Kualitas Air Bersih & Air Minum Produksi',
        issuedBy: 'Balai Lab Kesehatan Masyarakat Medan',
        issueDate: '2026-05-20',
        expiryDate: '2026-11-28',
        status: 'Segera Berakhir (16 Hari)'
      }
    ],
    incidents: [
      {
        id: 'INC-20261110-01',
        date: '2026-11-10',
        title: 'Segel Termal Boks Pengiriman Longgar pada 2 Ompreng',
        severity: 'Rendah',
        location: 'Titik Bongkar Muat SMP Negeri 1 Medan',
        reportedBy: 'Rina Kartika, S.KM',
        status: 'Terselesaikan',
        actionTaken: '2 ompreng langsung diganti dengan porsi cadangan bersegel penuh; pengunci boks diganti baru.'
      }
    ],
    foodWaste: [
      {
        id: 'WST-20261111',
        date: '2026-11-11',
        category: 'Sisa Konsumsi Sekolah (Plate Waste)',
        weightKg: 14.2,
        percentageOfBatch: 1.1,
        handlingMethod: 'Pengolahan Kompos Organik Mitra Bank Sampah Medan',
        notes: 'Mayoritas sisa berupa kulit buah pepaya dan sedikit sayur buncis.'
      },
      {
        id: 'WST-20261110',
        date: '2026-11-10',
        category: 'Sisa Konsumsi Sekolah (Plate Waste)',
        weightKg: 16.8,
        percentageOfBatch: 1.3,
        handlingMethod: 'Pengolahan Kompos Organik Mitra Bank Sampah Medan',
        notes: 'Sisa nasi dari siswa kelas 1 SD.'
      }
    ],
    notifications: [
      {
        id: 'NTF-001',
        title: 'Menu Jumat (13 Nov) Menunggu Persetujuan',
        message: 'Pengawas Gizi telah mengajukan siklus menu Jumat (Ikan Kembung Pesmol Kuning) untuk 2.960 porsi.',
        category: 'Menu & Gizi',
        relatedRoute: 'menus',
        timestamp: '2026-11-12T04:55:00+07:00',
        read: false
      },
      {
        id: 'NTF-002',
        title: 'Pengingat Masa Berlaku Uji Kualitas Air (SLHS)',
        message: 'Sertifikat Uji Kualitas Air Bersih (LAB-AIR/089) akan berakhir pada 28 Nov 2026 (16 hari lagi).',
        category: 'Keamanan Pangan',
        relatedRoute: 'food-safety',
        timestamp: '2026-11-12T04:30:00+07:00',
        read: false
      },
      {
        id: 'NTF-003',
        title: 'Armada RUTE-A1 & RUTE-A2 Tiba di Tujuan',
        message: 'Pengiriman 1.758 porsi ke SDN 060812 dan SMPN 1 Medan telah dikonfirmasi diterima tepat waktu.',
        category: 'Distribusi',
        relatedRoute: 'distribution',
        timestamp: '2026-11-12T07:24:00+07:00',
        read: false
      },
      {
        id: 'NTF-004',
        title: 'Daftar Periksa Sanitasi Kloter Posyandu Belum Lengkap',
        message: 'Item HYG-06 (Verifikasi akhir armada RUTE-C1) menunggu tanda tangan Pengawas Sanitasi.',
        category: 'Keamanan Pangan',
        relatedRoute: 'food-safety',
        timestamp: '2026-11-12T05:05:00+07:00',
        read: true
      }
    ],
    settings: {
      unitName: 'SPPG Kota Medan Baru — Unit 04',
      unitCode: 'SPPG-SUMUT-MDN-004',
      headName: 'Dr. Hendra Wijaya, M.Gz',
      city: 'Kota Medan, Sumatera Utara',
      enableSoundAlerts: true,
      enableDesktopToast: true,
      autoRefreshIntervalSec: 60,
      defaultShiftStart: '03:00 WIB'
    }
  };
}

let inMemoryDbCache = null;

export function getDemoDatabase() {
  try {
    const raw = localStorage.getItem(DEMO_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.meta && parsed.beneficiaries) {
        inMemoryDbCache = parsed;
        return parsed;
      }
    }
  } catch (_) {
    if (inMemoryDbCache) return inMemoryDbCache;
  }
  if (!inMemoryDbCache) {
    inMemoryDbCache = createInitialDemoDataset();
    saveDemoDatabase(inMemoryDbCache);
  }
  return inMemoryDbCache;
}

export function saveDemoDatabase(db) {
  inMemoryDbCache = db;
  try {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  } catch (_) {
    // In-memory cache already updated for sandboxed/about:blank environments
  }
}

export function resetDemoDatabase() {
  const fresh = createInitialDemoDataset();
  inMemoryDbCache = fresh;
  saveDemoDatabase(fresh);
  return fresh;
}

function ok(data) {
  return {
    success: true,
    data,
    error: null,
    meta: { source: 'DEMO_MODE', timestamp: new Date().toISOString() }
  };
}

function fail(errorMsg) {
  return {
    success: false,
    data: null,
    error: errorMsg,
    meta: { source: 'DEMO_MODE', timestamp: new Date().toISOString() }
  };
}

export const mockApiHandlers = {
  // ─── A. AUTHENTICATION ───
  async auth_login(payload = {}) {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const remember = Boolean(payload.remember);

    if (!email || !password) {
      return fail('Email dan kata sandi wajib diisi.');
    }

    const db = getDemoDatabase();
    const user = db.users.find((u) => u.email.toLowerCase() === email);

    // Demo credential check: accept demo123 or sppg2026 for active accounts
    if (!user || (password !== 'demo123' && password !== 'sppg2026')) {
      return fail('Kredensial tidak valid. Untuk Mode Demo, gunakan kata sandi: demo123');
    }

    if (user.status !== 'Aktif') {
      return fail('Akun pengguna ini sedang berstatus Nonaktif. Hubungi Kepala SPPG.');
    }

    const sessionObj = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unit: user.unit,
        phone: user.phone
      },
      isDemo: true,
      remember,
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
    };

    try {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(sessionObj));
    } catch (_) {}

    return ok(sessionObj);
  },

  async auth_logout() {
    try {
      localStorage.removeItem(DEMO_SESSION_KEY);
    } catch (_) {}
    return ok({ loggedOut: true });
  },

  async auth_get_session() {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user) return ok(parsed);
      }
    } catch (_) {}
    return ok(null);
  },

  async auth_reset_password(payload = {}) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) return fail('Masukkan alamat email terdaftar.');
    const db = getDemoDatabase();
    const found = db.users.find((u) => u.email.toLowerCase() === email);
    if (!found) {
      return fail('Email tidak ditemukan pada daftar pengguna SPPG.');
    }
    return ok({
      message: `[DEMO] Instruksi pemulihan kata sandi telah dicatat untuk ${found.name} (${found.email}). Hubungi Kepala SPPG untuk otorisasi reset lokal.`
    });
  },

  // ─── B. DASHBOARD (Dynamically Computed from Data Layer) ───
  async dashboard_get_summary(payload = {}) {
    const db = getDemoDatabase();
    const targetDate = payload.date || '2026-11-12';
    const todayProd = db.productions.find((p) => p.date === targetDate) || db.productions[db.productions.length - 1];
    const activeBeneficiaries = db.beneficiaries.filter((b) => b.status === 'Aktif').length;
    const params = db.budgetParameters;

    const totalPortionsToday = todayProd ? todayProd.actualPortions : 0;
    const plannedPortionsToday = todayProd ? todayProd.plannedPortions : 0;
    const todayIncentive = todayProd && todayProd.isEffectiveServiceDay ? params.dailyFacilityIncentiveRate : 0;
    const operationalCostPerPortion =
      todayProd && todayProd.actualPortions > 0
        ? Math.round((todayProd.foodCostTotal + todayProd.operationalCostTotal) / todayProd.actualPortions)
        : 0;

    // Production line chart from productions records
    const productionTrend = db.productions.map((p) => ({
      date: p.date,
      dayLabel: p.dayLabel,
      planned: p.plannedPortions,
      actual: p.actualPortions,
      qcPassed: p.qcPassedPortions
    }));

    // Distribution breakdown today
    const todayDistributions = db.distributions.filter((d) => d.date === targetDate);
    const totalDispatched = todayDistributions.reduce((acc, d) => acc + Number(d.dispatchedPortions || 0), 0);
    const totalReceived = todayDistributions.reduce((acc, d) => acc + Number(d.receivedPortions || 0), 0);

    // Total monthly expenditures from production records
    const totalFoodSpent = db.productions.reduce((s, p) => s + Number(p.foodCostTotal || 0), 0);
    const totalOpSpent = db.productions.reduce((s, p) => s + Number(p.operationalCostTotal || 0), 0);
    const effectiveDaysCount = db.productions.filter((p) => p.isEffectiveServiceDay).length;
    const totalIncentiveAccrued = effectiveDaysCount * Number(params.dailyFacilityIncentiveRate || 0);

    // Hygiene status
    const hygieneItems = db.hygieneChecklist.items || [];
    const checkedCount = hygieneItems.filter((i) => i.checked).length;
    const uncheckedWarnings = hygieneItems.filter((i) => !i.checked);

    // Pending menu approvals
    const pendingMenus = db.menus.filter((m) => m.status === 'Menunggu Persetujuan' || m.status === 'Perlu Revisi');

    return ok({
      unitMeta: db.meta,
      kpis: {
        totalPortionsToday,
        plannedPortionsToday,
        portionFulfillmentPct: plannedPortionsToday > 0 ? (totalPortionsToday / plannedPortionsToday) * 100 : 0,
        activeBeneficiaries,
        totalRegisteredBeneficiaries: db.beneficiaries.length,
        todayIncentive,
        isEffectiveServiceDay: Boolean(todayProd && todayProd.isEffectiveServiceDay),
        operationalCostPerPortion,
        costCeilingPerPortion:
          Number(params.standardFoodCostCeilingPerPortion) + Number(params.standardOperationalCostCeilingPerPortion)
      },
      productionTrend,
      weeklyDistribution: todayDistributions.map((d) => ({
        id: d.id,
        routeCode: d.routeCode,
        destinationName: d.destinationName,
        dispatchedPortions: d.dispatchedPortions,
        receivedPortions: d.receivedPortions,
        status: d.status,
        etaTime: d.etaTime
      })),
      distributionSummary: {
        totalRoutes: todayDistributions.length,
        totalDispatched,
        totalReceived,
        completedRoutes: todayDistributions.filter((d) => d.status === 'Diterima').length
      },
      budgetComposition: {
        foodSpent: totalFoodSpent,
        operationalSpent: totalOpSpent,
        incentiveAccrued: totalIncentiveAccrued,
        totalSpent: totalFoodSpent + totalOpSpent + totalIncentiveAccrued,
        monthlyCeiling: params.monthlyAllocationCeiling
      },
      operationalProgress: todayProd ? todayProd.timeline : [],
      pendingApprovals: pendingMenus,
      hygieneStatus: {
        checkedCount,
        totalCount: hygieneItems.length,
        scorePct: hygieneItems.length > 0 ? Math.round((checkedCount / hygieneItems.length) * 100) : 100,
        warnings: uncheckedWarnings,
        expiringCertificates: db.slhsCertificates.filter((c) => c.status !== 'Aktif')
      },
      recentActivities: [
        {
          id: 'ACT-1',
          time: '07:22 WIB',
          actor: 'Dedi Kurniawan (Armada RUTE-A2)',
          action: 'Konfirmasi serah terima 938 porsi di SMP Negeri 1 Medan',
          type: 'success'
        },
        {
          id: 'ACT-2',
          time: '07:12 WIB',
          actor: 'Rahmat Hidayat (Armada RUTE-A1)',
          action: 'Konfirmasi serah terima 820 porsi di SDN 060812 Medan Baru',
          type: 'success'
        },
        {
          id: 'ACT-3',
          time: '06:15 WIB',
          actor: 'Chef Surya Darma',
          action: 'Penyelesaian pemorsian 2.945 ompreng stainless BATCH-MDN04-1112',
          type: 'info'
        },
        {
          id: 'ACT-4',
          time: '04:55 WIB',
          actor: 'Siti Rahmawati, S.Gz, RD',
          action: 'Mengajukan persetujuan Menu Jumat (13 Nov 2026)',
          type: 'warning'
        }
      ]
    });
  },

  // ─── C. BENEFICIARY MANAGEMENT ───
  async beneficiaries_list(payload = {}) {
    const db = getDemoDatabase();
    let list = [...db.beneficiaries];

    if (payload.search) {
      const q = String(payload.search).toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.nik.toLowerCase().includes(q) ||
          b.institution.toLowerCase().includes(q)
      );
    }
    if (payload.category && payload.category !== 'ALL') {
      list = list.filter((b) => b.category === payload.category);
    }
    if (payload.status && payload.status !== 'ALL') {
      list = list.filter((b) => b.status === payload.status);
    }
    if (payload.sortBy) {
      const dir = payload.sortDir === 'desc' ? -1 : 1;
      const key = payload.sortBy;
      list.sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || ''), 'id') * dir);
    }

    return ok({
      items: list,
      totalCount: db.beneficiaries.length,
      activeCount: db.beneficiaries.filter((b) => b.status === 'Aktif').length
    });
  },

  async beneficiaries_create(payload = {}) {
    const db = getDemoDatabase();
    const newId = `BNF-${1001 + db.beneficiaries.length + Math.floor(Math.random() * 90)}`;
    const record = {
      id: newId,
      nik: String(payload.nik || '').trim(),
      name: String(payload.name || '').trim(),
      category: payload.category || 'Siswa SD',
      institution: String(payload.institution || '').trim(),
      gradeOrGroup: String(payload.gradeOrGroup || '-').trim(),
      status: payload.status || 'Aktif',
      notes: String(payload.notes || 'Tidak ada alergi').trim(),
      registeredAt: payload.registeredAt || '2026-11-12'
    };
    db.beneficiaries.unshift(record);
    saveDemoDatabase(db);
    return ok(record);
  },

  async beneficiaries_update(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.beneficiaries.findIndex((b) => b.id === payload.id);
    if (idx === -1) return fail('Data penerima manfaat tidak ditemukan.');
    db.beneficiaries[idx] = {
      ...db.beneficiaries[idx],
      ...payload
    };
    saveDemoDatabase(db);
    return ok(db.beneficiaries[idx]);
  },

  async beneficiaries_delete(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.beneficiaries.findIndex((b) => b.id === payload.id);
    if (idx === -1) return fail('Data penerima manfaat tidak ditemukan.');
    const removed = db.beneficiaries.splice(idx, 1)[0];
    saveDemoDatabase(db);
    return ok({ deletedId: removed.id, name: removed.name });
  },

  async beneficiaries_import(payload = {}) {
    const db = getDemoDatabase();
    const records = Array.isArray(payload.records) ? payload.records : [];
    if (!records.length) return fail('Tidak ada baris valid untuk diimpor.');
    const inserted = [];
    records.forEach((r, i) => {
      const rec = {
        id: `BNF-IMP-${Date.now().toString().slice(-4)}-${i + 1}`,
        nik: String(r.nik).trim(),
        name: String(r.name).trim(),
        category: r.category,
        institution: String(r.institution).trim(),
        gradeOrGroup: String(r.gradeOrGroup || 'Reguler').trim(),
        status: r.status || 'Aktif',
        notes: r.notes || 'Tidak ada alergi',
        registeredAt: '2026-11-12'
      };
      db.beneficiaries.unshift(rec);
      inserted.push(rec);
    });
    saveDemoDatabase(db);
    return ok({ importedCount: inserted.length, records: inserted });
  },

  // ─── D. MENU & NUTRITION ───
  async menus_list(payload = {}) {
    const db = getDemoDatabase();
    let items = [...db.menus].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    if (payload.weekLabel && payload.weekLabel !== 'ALL') {
      items = items.filter((m) => m.weekLabel === payload.weekLabel);
    }
    return ok({ items });
  },

  async menus_create(payload = {}) {
    const db = getDemoDatabase();
    const newMenu = {
      id: `MNU-W46-0${db.menus.length + 1}`,
      weekLabel: payload.weekLabel || 'Minggu 46 (09–13 Nov 2026)',
      dayName: payload.dayName || 'Sabtu (Khusus)',
      date: payload.date || '2026-11-14',
      orderIndex: db.menus.length + 1,
      name: String(payload.name || '').trim(),
      targetCategory: payload.targetCategory || 'Semua Kategori (Disesuaikan Gramasi)',
      plannedPortions: Number(payload.plannedPortions) || 2900,
      caloriesKcal: Number(payload.caloriesKcal) || 640,
      proteinGram: Number(payload.proteinGram) || 28,
      carbsGram: Number(payload.carbsGram) || 82,
      fatGram: Number(payload.fatGram) || 19,
      costEstimatePerPortion: Number(payload.costEstimatePerPortion) || 11800,
      status: payload.status || 'Draft',
      reviewedBy: '-',
      reviewNotes: payload.reviewNotes || 'Draft menu baru.',
      ingredients: Array.isArray(payload.ingredients) && payload.ingredients.length
        ? payload.ingredients
        : [
            { name: 'Beras Medium Segar', amountGr: 150, role: 'Karbohidrat Utama' },
            { name: 'Lauk Protein Hewani Utama', amountGr: 85, role: 'Protein Hewani' },
            { name: 'Sayur Segar Musiman', amountGr: 90, role: 'Sayuran & Serat' },
            { name: 'Buah Lokal Segar', amountGr: 100, role: 'Buah Segar' }
          ]
    };
    db.menus.push(newMenu);
    saveDemoDatabase(db);
    return ok(newMenu);
  },

  async menus_update(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.menus.findIndex((m) => m.id === payload.id);
    if (idx === -1) return fail('Menu tidak ditemukan.');
    db.menus[idx] = { ...db.menus[idx], ...payload };
    saveDemoDatabase(db);
    return ok(db.menus[idx]);
  },

  async menus_submit_for_review(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.menus.findIndex((m) => m.id === payload.id);
    if (idx === -1) return fail('Menu tidak ditemukan.');
    db.menus[idx].status = 'Menunggu Persetujuan';
    db.menus[idx].reviewNotes = payload.notes || 'Diajukan untuk peninjauan Kepala SPPG.';
    saveDemoDatabase(db);
    return ok(db.menus[idx]);
  },

  async menus_review(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.menus.findIndex((m) => m.id === payload.id);
    if (idx === -1) return fail('Menu tidak ditemukan.');
    db.menus[idx].status = payload.decision || 'Disetujui'; // 'Disetujui' | 'Perlu Revisi' | 'Ditolak'
    db.menus[idx].reviewedBy = payload.reviewer || 'Dr. Hendra Wijaya, M.Gz';
    db.menus[idx].reviewNotes = payload.reviewNotes || 'Telah diverifikasi.';
    saveDemoDatabase(db);
    return ok(db.menus[idx]);
  },

  async menus_reorder(payload = {}) {
    const db = getDemoDatabase();
    const orderedIds = Array.isArray(payload.orderedIds) ? payload.orderedIds : [];
    orderedIds.forEach((id, i) => {
      const m = db.menus.find((item) => item.id === id);
      if (m) m.orderIndex = i + 1;
    });
    saveDemoDatabase(db);
    return ok({ items: db.menus });
  },

  // ─── E. DAILY PRODUCTION ───
  async production_list() {
    const db = getDemoDatabase();
    return ok({ items: db.productions });
  },

  async production_create(payload = {}) {
    const db = getDemoDatabase();
    const newProd = {
      id: `PRD-${String(payload.date || '2026-11-13').replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      date: payload.date || '2026-11-13',
      dayLabel: payload.dayLabel || 'Jumat',
      isEffectiveServiceDay: payload.isEffectiveServiceDay !== false,
      menuId: payload.menuId || 'MNU-W46-05',
      menuName: payload.menuName || 'Nasi Putih, Ikan Kembung Pesmol Kuning & Sayur Lodeh',
      batchCode: payload.batchCode || `BATCH-MDN04-${String(payload.date || '1113').slice(-4)}`,
      plannedPortions: Number(payload.plannedPortions) || 2960,
      actualPortions: Number(payload.actualPortions) || 2960,
      qcPassedPortions: Number(payload.qcPassedPortions ?? payload.actualPortions) || 2960,
      rejectedPortions: Number(payload.rejectedPortions) || 0,
      foodCostTotal: Number(payload.foodCostTotal) || 29000000,
      operationalCostTotal: Number(payload.operationalCostTotal) || 6100000,
      status: payload.status || 'Terjadwal',
      leadChef: payload.leadChef || 'Chef Surya Darma',
      notes: payload.notes || 'Jadwal produksi baru.',
      timeline: payload.timeline || [
        { time: '03:00 WIB', stage: 'Penerimaan & QC Bahan Baku Segar', done: false },
        { time: '04:00 WIB', stage: 'Pengolahan & Pemasakan Utama', done: false },
        { time: '05:30 WIB', stage: 'Uji Organoleptik & Suhu Inti (>75°C)', done: false },
        { time: '06:15 WIB', stage: 'Pemorsian & Penyegelan Ompreng Stainless', done: false },
        { time: '07:00 WIB', stage: 'Serah Terima ke Armada Distribusi', done: false }
      ]
    };
    db.productions.push(newProd);
    saveDemoDatabase(db);
    return ok(newProd);
  },

  async production_update(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.productions.findIndex((p) => p.id === payload.id);
    if (idx === -1) return fail('Data produksi tidak ditemukan.');
    db.productions[idx] = { ...db.productions[idx], ...payload };
    saveDemoDatabase(db);
    return ok(db.productions[idx]);
  },

  // ─── F. BUDGET & INCENTIVES ───
  async budget_get_summary() {
    const db = getDemoDatabase();
    const params = db.budgetParameters;
    const productions = db.productions;

    const totalActualPortions = productions.reduce((s, p) => s + Number(p.actualPortions || 0), 0);
    const totalPlannedPortions = productions.reduce((s, p) => s + Number(p.plannedPortions || 0), 0);
    const effectiveServiceDays = productions.filter((p) => p.isEffectiveServiceDay).length;
    const foodExpenditure = productions.reduce((s, p) => s + Number(p.foodCostTotal || 0), 0);
    const operationalExpenditure = productions.reduce((s, p) => s + Number(p.operationalCostTotal || 0), 0);
    const totalIncentive = effectiveServiceDays * Number(params.dailyFacilityIncentiveRate || 0);
    const totalExpenditure = foodExpenditure + operationalExpenditure + totalIncentive;

    const avgFoodCostPerPortion = totalActualPortions > 0 ? Math.round(foodExpenditure / totalActualPortions) : 0;
    const avgOpCostPerPortion = totalActualPortions > 0 ? Math.round(operationalExpenditure / totalActualPortions) : 0;
    const avgTotalUnitCost = avgFoodCostPerPortion + avgOpCostPerPortion;

    const history = productions.map((p) => {
      const incentive = p.isEffectiveServiceDay ? Number(params.dailyFacilityIncentiveRate || 0) : 0;
      const totalDay = Number(p.foodCostTotal || 0) + Number(p.operationalCostTotal || 0) + incentive;
      const perPortion =
        p.actualPortions > 0
          ? Math.round((Number(p.foodCostTotal || 0) + Number(p.operationalCostTotal || 0)) / p.actualPortions)
          : 0;
      return {
        id: p.id,
        date: p.date,
        dayLabel: p.dayLabel,
        batchCode: p.batchCode,
        isEffectiveServiceDay: p.isEffectiveServiceDay,
        actualPortions: p.actualPortions,
        foodCostTotal: p.foodCostTotal,
        operationalCostTotal: p.operationalCostTotal,
        incentive,
        totalDay,
        perPortion
      };
    });

    return ok({
      parameters: params,
      summary: {
        totalActualPortions,
        totalPlannedPortions,
        effectiveServiceDays,
        foodExpenditure,
        operationalExpenditure,
        totalIncentive,
        totalExpenditure,
        avgFoodCostPerPortion,
        avgOpCostPerPortion,
        avgTotalUnitCost,
        remainingMonthlyBudget: Math.max(0, Number(params.monthlyAllocationCeiling) - totalExpenditure)
      },
      history
    });
  },

  async budget_calculate(payload = {}) {
    const db = getDemoDatabase();
    const params = db.budgetParameters;
    const portions = Math.max(0, Number(payload.servedPortions ?? 2960));
    const foodUnit = Math.max(0, Number(payload.foodCostPerPortion ?? params.standardFoodCostCeilingPerPortion));
    const opUnit = Math.max(0, Number(payload.opCostPerPortion ?? params.standardOperationalCostCeilingPerPortion));
    const isEffectiveDay = payload.isEffectiveServiceDay !== false;
    const effectiveDaysCount = Math.max(1, Number(payload.daysCount ?? 1));

    const foodTotal = portions * foodUnit * effectiveDaysCount;
    const opTotal = portions * opUnit * effectiveDaysCount;
    const incentiveTotal = isEffectiveDay ? Number(params.dailyFacilityIncentiveRate) * effectiveDaysCount : 0;
    const grandTotal = foodTotal + opTotal + incentiveTotal;
    const combinedUnitCost = foodUnit + opUnit;
    const ceilingUnitCost =
      Number(params.standardFoodCostCeilingPerPortion) + Number(params.standardOperationalCostCeilingPerPortion);

    return ok({
      portions,
      effectiveDaysCount,
      isEffectiveDay,
      foodUnit,
      opUnit,
      combinedUnitCost,
      ceilingUnitCost,
      overCeilingWarning: combinedUnitCost > ceilingUnitCost,
      foodTotal,
      opTotal,
      incentiveTotal,
      grandTotal
    });
  },

  async budget_get_parameters() {
    const db = getDemoDatabase();
    return ok(db.budgetParameters);
  },

  async budget_update_parameters(payload = {}) {
    const db = getDemoDatabase();
    db.budgetParameters = {
      ...db.budgetParameters,
      ...payload
    };
    saveDemoDatabase(db);
    return ok(db.budgetParameters);
  },

  // ─── G. DISTRIBUTION ───
  async distributions_list(payload = {}) {
    const db = getDemoDatabase();
    let items = [...db.distributions];
    if (payload.date && payload.date !== 'ALL') {
      items = items.filter((d) => d.date === payload.date);
    }
    return ok({ items });
  },

  async distributions_create(payload = {}) {
    const db = getDemoDatabase();
    const newDist = {
      id: `DST-20261112-0${db.distributions.length + 1}`,
      date: payload.date || '2026-11-12',
      routeCode: payload.routeCode || `RUTE-D${db.distributions.length + 1}`,
      destinationName: String(payload.destinationName || '').trim(),
      destinationType: payload.destinationType || 'Sekolah Dasar',
      address: String(payload.address || 'Kota Medan').trim(),
      driverName: String(payload.driverName || 'Armada SPPG').trim(),
      departureTime: payload.departureTime || '07:15 WIB',
      etaTime: payload.etaTime || '07:45 WIB',
      receivedTime: '-',
      dispatchedPortions: Number(payload.dispatchedPortions) || 300,
      receivedPortions: 0,
      status: payload.status || 'Siap Kirim',
      receiverName: '-',
      notes: payload.notes || 'Pengiriman terjadwal.'
    };
    db.distributions.push(newDist);
    saveDemoDatabase(db);
    return ok(newDist);
  },

  async distributions_update(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.distributions.findIndex((d) => d.id === payload.id);
    if (idx === -1) return fail('Jadwal distribusi tidak ditemukan.');
    db.distributions[idx] = { ...db.distributions[idx], ...payload };
    saveDemoDatabase(db);
    return ok(db.distributions[idx]);
  },

  async distributions_confirm_receipt(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.distributions.findIndex((d) => d.id === payload.id);
    if (idx === -1) return fail('Data pengiriman tidak ditemukan.');
    const item = db.distributions[idx];
    item.status = 'Diterima';
    item.receivedPortions = Number(payload.receivedPortions ?? item.dispatchedPortions);
    item.receiverName = String(payload.receiverName || 'Petugas Penerima Sekolah').trim();
    item.receivedTime = payload.receivedTime || '07:35 WIB';
    item.notes = String(payload.notes || item.notes).trim();
    saveDemoDatabase(db);
    return ok(item);
  },

  // ─── H. FOOD SAFETY (Hygiene, SLHS, Incidents, Food Waste) ───
  async hygiene_get_checklist() {
    const db = getDemoDatabase();
    return ok({
      checklist: db.hygieneChecklist,
      slhsCertificates: db.slhsCertificates,
      incidents: db.incidents,
      foodWaste: db.foodWaste
    });
  },

  async hygiene_save_checklist(payload = {}) {
    const db = getDemoDatabase();
    if (Array.isArray(payload.items)) {
      db.hygieneChecklist.items = payload.items;
    } else if (payload.itemId) {
      const target = db.hygieneChecklist.items.find((i) => i.id === payload.itemId);
      if (target) {
        target.checked = Boolean(payload.checked);
        if (payload.notes !== undefined) target.notes = payload.notes;
      }
    }
    db.hygieneChecklist.lastUpdated = new Date().toISOString();
    saveDemoDatabase(db);
    return ok(db.hygieneChecklist);
  },

  async slhs_list() {
    const db = getDemoDatabase();
    return ok({ items: db.slhsCertificates });
  },

  async incidents_create(payload = {}) {
    const db = getDemoDatabase();
    const newInc = {
      id: `INC-20261112-0${db.incidents.length + 1}`,
      date: payload.date || '2026-11-12',
      title: String(payload.title || '').trim(),
      severity: payload.severity || 'Sedang',
      location: String(payload.location || 'Dapur Utama SPPG').trim(),
      reportedBy: payload.reportedBy || 'Rina Kartika, S.KM',
      status: payload.status || 'Investigasi',
      actionTaken: String(payload.actionTaken || '').trim()
    };
    db.incidents.unshift(newInc);
    saveDemoDatabase(db);
    return ok(newInc);
  },

  async food_waste_create(payload = {}) {
    const db = getDemoDatabase();
    const newWaste = {
      id: `WST-20261112-0${db.foodWaste.length + 1}`,
      date: payload.date || '2026-11-12',
      category: payload.category || 'Sisa Konsumsi Sekolah (Plate Waste)',
      weightKg: Number(payload.weightKg) || 0,
      percentageOfBatch: Number(payload.percentageOfBatch) || 0.8,
      handlingMethod: payload.handlingMethod || 'Pengolahan Kompos Organik Mitra Bank Sampah Medan',
      notes: String(payload.notes || '').trim()
    };
    db.foodWaste.unshift(newWaste);
    saveDemoDatabase(db);
    return ok(newWaste);
  },

  // ─── I. REPORTS & EXPORT ───
  async reports_generate(payload = {}) {
    const db = getDemoDatabase();
    const type = payload.reportType || 'production';
    const startDate = payload.startDate || '2026-11-01';
    const endDate = payload.endDate || '2026-11-30';

    if (type === 'production') {
      const rows = db.productions.filter((p) => p.date >= startDate && p.date <= endDate);
      return ok({
        reportType: 'production',
        title: 'Laporan Operasional Produksi Harian SPPG',
        period: `${startDate} s/d ${endDate}`,
        headers: ['Tanggal', 'Kode Batch', 'Menu Harian', 'Hari Layanan Efektif', 'Target Porsi', 'Realisasi Porsi', 'Lolos QC', 'Status'],
        rows: rows.map((p) => [
          p.date,
          p.batchCode,
          p.menuName,
          p.isEffectiveServiceDay ? 'Ya' : 'Tidak',
          p.plannedPortions,
          p.actualPortions,
          p.qcPassedPortions,
          p.status
        ])
      });
    }

    if (type === 'beneficiaries') {
      return ok({
        reportType: 'beneficiaries',
        title: 'Laporan Rekapitulasi Penerima Manfaat MBG',
        period: `${startDate} s/d ${endDate}`,
        headers: ['ID', 'NIK / NISN', 'Nama Lengkap', 'Kategori MBG', 'Sekolah / Posyandu', 'Kelas / Kelompok', 'Status', 'Catatan Gizi/Alergi'],
        rows: db.beneficiaries.map((b) => [
          b.id,
          b.nik,
          b.name,
          b.category,
          b.institution,
          b.gradeOrGroup,
          b.status,
          b.notes
        ])
      });
    }

    if (type === 'financial') {
      const params = db.budgetParameters;
      return ok({
        reportType: 'financial',
        title: 'Laporan Realisasi Anggaran & Insentif Layanan SPPG',
        period: `${startDate} s/d ${endDate}`,
        headers: ['Tanggal', 'Kode Batch', 'Porsi Aktual', 'Belanja Bahan Pangan (Rp)', 'Biaya Operasional (Rp)', 'Insentif Fasilitas (Rp)', 'Total Harian (Rp)'],
        rows: db.productions.map((p) => {
          const inc = p.isEffectiveServiceDay ? Number(params.dailyFacilityIncentiveRate || 0) : 0;
          const tot = Number(p.foodCostTotal || 0) + Number(p.operationalCostTotal || 0) + inc;
          return [p.date, p.batchCode, p.actualPortions, p.foodCostTotal, p.operationalCostTotal, inc, tot];
        })
      });
    }

    if (type === 'distribution') {
      return ok({
        reportType: 'distribution',
        title: 'Laporan Distribusi & Konfirmasi Serah Terima Porsi',
        period: `${startDate} s/d ${endDate}`,
        headers: ['Tanggal', 'Kode Rute', 'Tujuan Sekolah/Posyandu', 'Pengemudi & Armada', 'Dikirim (Porsi)', 'Diterima (Porsi)', 'Selisih', 'Status', 'Penerima'],
        rows: db.distributions.map((d) => [
          d.date,
          d.routeCode,
          d.destinationName,
          d.driverName,
          d.dispatchedPortions,
          d.receivedPortions,
          d.status === 'Diterima' ? d.dispatchedPortions - d.receivedPortions : 0,
          d.status,
          d.receiverName
        ])
      });
    }

    // food-safety
    return ok({
      reportType: 'food-safety',
      title: 'Laporan Keamanan Pangan, Higienitas & Food Waste',
      period: `${startDate} s/d ${endDate}`,
      headers: ['Kode Item', 'Area Pengawasan', 'Parameter Standar Sanitasi', 'Status Verifikasi', 'Catatan Inspeksi'],
      rows: db.hygieneChecklist.items.map((i) => [
        i.id,
        i.area,
        i.parameter,
        i.checked ? 'Memenuhi Syarat' : 'Menunggu Verifikasi',
        i.notes
      ])
    });
  },

  async reports_export(payload = {}) {
    return this.reports_generate(payload);
  },

  // ─── J. USER MANAGEMENT ───
  async users_list() {
    const db = getDemoDatabase();
    return ok({ items: db.users });
  },

  async users_create(payload = {}) {
    const db = getDemoDatabase();
    const newUser = {
      id: `USR-00${db.users.length + 1}`,
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      role: payload.role || 'Pengawas Gizi',
      status: payload.status || 'Aktif',
      phone: String(payload.phone || '-').trim(),
      unit: payload.unit || db.meta.sppgUnitName,
      lastLogin: 'Belum pernah masuk'
    };
    db.users.push(newUser);
    saveDemoDatabase(db);
    return ok(newUser);
  },

  async users_update(payload = {}) {
    const db = getDemoDatabase();
    const idx = db.users.findIndex((u) => u.id === payload.id);
    if (idx === -1) return fail('Pengguna tidak ditemukan.');
    db.users[idx] = { ...db.users[idx], ...payload };
    saveDemoDatabase(db);
    return ok(db.users[idx]);
  },

  async users_change_password(payload = {}) {
    if (!payload.newPassword || String(payload.newPassword).length < 6) {
      return fail('Kata sandi baru minimal 6 karakter.');
    }
    return ok({
      updated: true,
      message: '[DEMO] Simulasi perubahan kata sandi berhasil diverifikasi (tidak disimpan ke localStorage demi keamanan).'
    });
  },

  // ─── K. NOTIFICATIONS ───
  async notifications_list() {
    const db = getDemoDatabase();
    const unreadCount = db.notifications.filter((n) => !n.read).length;
    return ok({
      items: db.notifications,
      unreadCount
    });
  },

  async notifications_mark_read(payload = {}) {
    const db = getDemoDatabase();
    if (payload.markAll) {
      db.notifications.forEach((n) => {
        n.read = true;
      });
    } else if (payload.id) {
      const target = db.notifications.find((n) => n.id === payload.id);
      if (target) target.read = true;
    }
    saveDemoDatabase(db);
    return ok({
      items: db.notifications,
      unreadCount: db.notifications.filter((n) => !n.read).length
    });
  },

  // ─── L. SETTINGS ───
  async settings_get() {
    const db = getDemoDatabase();
    return ok({
      settings: db.settings,
      budgetParameters: db.budgetParameters
    });
  },

  async settings_update(payload = {}) {
    const db = getDemoDatabase();
    if (payload.settings) {
      db.settings = { ...db.settings, ...payload.settings };
      db.meta.sppgUnitName = db.settings.unitName || db.meta.sppgUnitName;
    }
    if (payload.budgetParameters) {
      db.budgetParameters = { ...db.budgetParameters, ...payload.budgetParameters };
    }
    saveDemoDatabase(db);
    return ok({
      settings: db.settings,
      budgetParameters: db.budgetParameters
    });
  }
};
