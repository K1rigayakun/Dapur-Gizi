# Spesifikasi Kontrak Integrasi Backend Python Eel (`INTEGRATION.md`)

Dokumen ini mendefinisikan kontrak komunikasi antara frontend **DapurGizi** (`web/js/services/api.js`) dan backend Python 3.13 menggunakan [Eel 0.18.2](https://pypi.org/project/Eel/).

## 1. Arsitektur Komunikasi & Keamanan

1. **Alur Tunggal**: `Frontend (Vanilla JS) → Jembatan Eel (/eel.js) → Python 3.13 (@eel.expose) → Supabase PostgreSQL`.
2. **Isolasi Kredensial**: Frontend sama sekali tidak memuat pustaka `@supabase/supabase-js` dan tidak boleh menyimpan `SUPABASE_SERVICE_ROLE_KEY`, password database, atau rahasia JWT.
3. **Konvensi Pemanggilan JavaScript**:
   ```javascript
   // Di dalam web/js/services/api.js
   const rawResponse = await window.eel[functionName](payload)();
   ```
4. **Standar Amplop Respons Python (`Response Envelope`)**:
   Setiap fungsi Python yang didekorasi dengan `@eel.expose` **wajib** mengembalikan `dict` (yang diserialisasi menjadi JSON oleh [Eel 0.18.2](https://pypi.org/project/Eel/)) dengan struktur:
   ```json
   {
     "success": true,
     "data": {},
     "error": null
   }
   ```
   Apabila terjadi kegagalan validasi atau eksepsi database, kembalikan:
   ```json
   {
     "success": false,
     "data": null,
     "error": "Pesan kesalahan yang jelas dalam bahasa Indonesia"
   }
   ```
   *Catatan Penting*: `api.js` tidak pernah mengubah error dari Python menjadi respons sukses palsu.

## 2. Daftar Kontrak Fungsi `@eel.expose` per Modul

| Grup Modul | Nama Fungsi Python (`@eel.expose`) | Parameter Input (`payload: dict`) | Struktur `data` pada Respons Sukses | Modul Frontend Terkait |
| :--- | :--- | :--- | :--- | :--- |
| **A. Autentikasi** | `auth_login` | `{ email: str, password: str, remember: bool }` | `{ user: { id, name, email, role, unit, phone }, expiresAt: str, isDemo: false }` | `js/pages/login.js` |
| **A. Autentikasi** | `auth_logout` | `{}` | `{ loggedOut: true }` | `js/app.js`, `js/pages/login.js` |
| **A. Autentikasi** | `auth_get_session` | `{}` | `{ user: {...}, expiresAt: str } \| null` | `js/app.js` |
| **A. Autentikasi** | `auth_reset_password` | `{ email: str }` | `{ message: str }` | `js/pages/login.js` |
| **B. Beranda** | `dashboard_get_summary` | `{ date: str }` | `{ unitMeta, kpis, productionTrend, weeklyDistribution, distributionSummary, budgetComposition, operationalProgress, pendingApprovals, hygieneStatus, recentActivities }` | `js/pages/dashboard.js` |
| **C. Penerima Manfaat** | `beneficiaries_list` | `{ search?: str, category?: str, status?: str, sortBy?: str, sortDir?: str }` | `{ items: Array<Beneficiary>, totalCount: int, activeCount: int }` | `js/pages/beneficiaries.js` |
| **C. Penerima Manfaat** | `beneficiaries_create` | `{ nik: str, name: str, category: str, institution: str, gradeOrGroup: str, status: str, notes: str }` | `Beneficiary` (objek yang baru disimpan) | `js/pages/beneficiaries.js` |
| **C. Penerima Manfaat** | `beneficiaries_update` | `{ id: str, ...fields }` | `Beneficiary` (objek yang diperbarui) | `js/pages/beneficiaries.js` |
| **C. Penerima Manfaat** | `beneficiaries_delete` | `{ id: str }` | `{ deletedId: str, name: str }` | `js/pages/beneficiaries.js` |
| **C. Penerima Manfaat** | `beneficiaries_import` | `{ records: Array<BeneficiaryInput> }` | `{ importedCount: int, records: Array<Beneficiary> }` | `js/pages/beneficiaries.js` |
| **D. Menu & Gizi** | `menus_list` | `{ weekLabel?: str }` | `{ items: Array<Menu> }` | `js/pages/menus.js` |
| **D. Menu & Gizi** | `menus_create` | `{ dayName: str, date: str, name: str, plannedPortions: int, caloriesKcal: float, proteinGram: float, carbsGram: float, fatGram: float, costEstimatePerPortion: int, ingredients?: Array }` | `Menu` | `js/pages/menus.js` |
| **D. Menu & Gizi** | `menus_update` | `{ id: str, ...fields }` | `Menu` | `js/pages/menus.js` |
| **D. Menu & Gizi** | `menus_submit_for_review` | `{ id: str, notes?: str }` | `Menu` (`status = "Menunggu Persetujuan"`) | `js/pages/menus.js` |
| **D. Menu & Gizi** | `menus_review` | `{ id: str, decision: str, reviewNotes: str, reviewer: str }` | `Menu` (`status = "Disetujui" \| "Perlu Revisi" \| "Ditolak"`) | `js/pages/menus.js` |
| **D. Menu & Gizi** | `menus_reorder` | `{ orderedIds: Array<str> }` | `{ items: Array<Menu> }` | `js/pages/menus.js` |
| **E. Produksi Harian** | `production_list` | `{}` | `{ items: Array<ProductionBatch> }` | `js/pages/production.js` |
| **E. Produksi Harian** | `production_create` | `{ date: str, dayLabel: str, batchCode: str, menuName: str, plannedPortions: int, actualPortions: int, foodCostTotal: int, operationalCostTotal: int, isEffectiveServiceDay: bool, status: str, notes: str }` | `ProductionBatch` | `js/pages/production.js` |
| **E. Produksi Harian** | `production_update` | `{ id: str, ...fields }` | `ProductionBatch` | `js/pages/production.js` |
| **F. Anggaran & Insentif** | `budget_get_summary` | `{}` | `{ parameters: BudgetParams, summary: BudgetSummary, history: Array<BudgetHistoryRow> }` | `js/pages/budget.js` |
| **F. Anggaran & Insentif** | `budget_calculate` | `{ servedPortions: int, daysCount: int, foodCostPerPortion: int, opCostPerPortion: int, isEffectiveServiceDay: bool }` | `{ portions, effectiveDaysCount, foodUnit, opUnit, combinedUnitCost, ceilingUnitCost, overCeilingWarning, foodTotal, opTotal, incentiveTotal, grandTotal }` | `js/pages/budget.js` |
| **F. Anggaran & Insentif** | `budget_get_parameters` | `{}` | `BudgetParams` | `js/pages/budget.js` |
| **F. Anggaran & Insentif** | `budget_update_parameters` | `{ configLabel, referenceSource, effectiveDate, standardFoodCostCeilingPerPortion, standardOperationalCostCeilingPerPortion, dailyFacilityIncentiveRate, monthlyAllocationCeiling }` | `BudgetParams` | `js/pages/budget.js`, `js/pages/settings.js` |
| **G. Distribusi** | `distributions_list` | `{ date?: str }` | `{ items: Array<DistributionRoute> }` | `js/pages/distribution.js` |
| **G. Distribusi** | `distributions_create` | `{ routeCode: str, date: str, destinationName: str, destinationType: str, address: str, driverName: str, departureTime: str, etaTime: str, dispatchedPortions: int, status: str, notes: str }` | `DistributionRoute` | `js/pages/distribution.js` |
| **G. Distribusi** | `distributions_update` | `{ id: str, ...fields }` | `DistributionRoute` | `js/pages/distribution.js` |
| **G. Distribusi** | `distributions_confirm_receipt` | `{ id: str, receivedPortions: int, receivedTime: str, receiverName: str, notes: str }` | `DistributionRoute` (`status = "Diterima"`) | `js/pages/distribution.js` |
| **H. Keamanan Pangan** | `hygiene_get_checklist` | `{}` | `{ checklist: HygieneChecklist, slhsCertificates: Array, incidents: Array, foodWaste: Array }` | `js/pages/food-safety.js` |
| **H. Keamanan Pangan** | `hygiene_save_checklist` | `{ itemId?: str, checked?: bool, notes?: str, items?: Array }` | `HygieneChecklist` | `js/pages/food-safety.js` |
| **H. Keamanan Pangan** | `slhs_list` | `{}` | `{ items: Array<SLHSCertificate> }` | `js/pages/food-safety.js` |
| **H. Keamanan Pangan** | `incidents_create` | `{ title: str, location: str, severity: str, actionTaken: str }` | `IncidentRecord` | `js/pages/food-safety.js` |
| **H. Keamanan Pangan** | `food_waste_create` | `{ date: str, category: str, weightKg: float, notes: str }` | `FoodWasteRecord` | `js/pages/food-safety.js` |
| **I. Laporan & Ekspor** | `reports_generate` | `{ reportType: str, startDate: str, endDate: str }` | `{ reportType: str, title: str, period: str, headers: Array<str>, rows: Array<Array> }` | `js/pages/reports.js` |
| **I. Laporan & Ekspor** | `reports_export` | `{ reportType: str, startDate: str, endDate: str }` | `{ reportType: str, title: str, period: str, headers: Array<str>, rows: Array<Array> }` | `js/pages/reports.js` |
| **J. Pengguna** | `users_list` | `{}` | `{ items: Array<User> }` | `js/pages/users.js` |
| **J. Pengguna** | `users_create` | `{ name: str, email: str, role: str, phone: str, status: str }` | `User` | `js/pages/users.js` |
| **J. Pengguna** | `users_update` | `{ id: str, ...fields }` | `User` | `js/pages/users.js` |
| **J. Pengguna** | `users_change_password` | `{ currentPassword: str, newPassword: str }` | `{ updated: true, message: str }` | `js/pages/users.js` |
| **K. Notifikasi** | `notifications_list` | `{}` | `{ items: Array<Notification>, unreadCount: int }` | `js/components/topbar.js`, `js/pages/notifications.js` |
| **K. Notifikasi** | `notifications_mark_read` | `{ id?: str, markAll?: bool }` | `{ items: Array<Notification>, unreadCount: int }` | `js/components/topbar.js`, `js/pages/notifications.js` |
| **L. Pengaturan** | `settings_get` | `{}` | `{ settings: Object, budgetParameters: Object }` | `js/pages/settings.js` |
| **L. Pengaturan** | `settings_update` | `{ settings?: Object, budgetParameters?: Object }` | `{ settings: Object, budgetParameters: Object }` | `js/pages/settings.js` |

## 3. Contoh Implementasi Handler Python (`backend/handlers.py`)

```python
import eel

@eel.expose
def beneficiaries_list(payload=None):
    payload = payload or {}
    try:
        # Panggil repositori Supabase dari sisi Python
        records = supabase_repo.fetch_beneficiaries(payload)
        return {
            "success": True,
            "data": {
                "items": records,
                "totalCount": len(records),
                "activeCount": sum(1 for r in records if r.get("status") == "Aktif")
            },
            "error": None
        }
    except Exception as exc:
        return {
            "success": False,
            "data": None,
            "error": f"Gagal memuat data penerima manfaat dari database: {exc}"
        }
```
