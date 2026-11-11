/**
 * DapurGizi — Module C: Beneficiary Management (js/pages/beneficiaries.js)
 * Full CRUD + Search, Category Filter (6 MBG Categories), Status Filter, Sort, Pagination,
 * View Detail Drawer, Delete Confirmation, CSV Import with Validation & Duplicate Detection, and CSV Export.
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { store } from '../state.js';
import { paginateArray, renderPaginationHtml } from '../components/table.js';
import { openModal, openConfirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData, showFormErrors } from '../components/form.js';
import {
  BENEFICIARY_CATEGORIES,
  validateBeneficiaryPayload,
  parseAndValidateBeneficiaryCSV
} from '../utils/validation.js';
import { escapeHtml, formatDateID, downloadCsvFile, formatNumber } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons } from '../utils/motion.js';

const viewState = {
  search: '',
  category: 'ALL',
  status: 'ALL',
  sortBy: 'name',
  sortDir: 'asc',
  page: 1,
  pageSize: 6
};

export async function renderBeneficiariesPage(containerEl) {
  if (!containerEl) return;
  if (store.state.globalSearchQuery) {
    viewState.search = store.state.globalSearchQuery;
    store.state.globalSearchQuery = '';
  }

  const allRes = await callApi('beneficiaries_list', {});
  const allItems = allRes.success ? allRes.data.items : [];

  const filteredRes = await callApi('beneficiaries_list', {
    search: viewState.search,
    category: viewState.category,
    status: viewState.status,
    sortBy: viewState.sortBy,
    sortDir: viewState.sortDir
  });

  if (!filteredRes.success) {
    containerEl.innerHTML = `<div class="dg-state-box"><p class="text-danger">${escapeHtml(filteredRes.error)}</p></div>`;
    return;
  }

  const items = filteredRes.data.items || [];
  const pageData = paginateArray(items, viewState.page, viewState.pageSize);
  viewState.page = pageData.currentPage;

  // Category breakdown counts
  const catCounts = {};
  BENEFICIARY_CATEGORIES.forEach((c) => {
    catCounts[c] = allItems.filter((b) => b.category === c && b.status === 'Aktif').length;
  });

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('users', { size: 14 })} DATA PENERIMA MANFAAT MBG</span>
        <h1 class="page-header__title">Manajemen Penerima Manfaat</h1>
        <p class="page-header__subtitle">
          Kelola daftar penerima manfaat aktif lintas 6 kategori sasaran (Siswa SD, SMP, SMA, Ibu Hamil, Ibu Menyusui & Balita).
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-secondary btn-liquid" id="bnf-import-csv-btn">
          ${renderIcon('upload', { size: 16 })}
          <span>Impor & Validasi CSV</span>
        </button>
        <button type="button" class="btn btn-secondary btn-liquid" id="bnf-export-csv-btn">
          ${renderIcon('download', { size: 16 })}
          <span>Ekspor CSV</span>
        </button>
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="bnf-add-btn">
          ${renderIcon('plus', { size: 16 })}
          <span>Tambah Penerima Manfaat</span>
        </button>
      </div>
    </div>

    <!-- Category Summary Strip -->
    <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:20px;" class="anim-section">
      ${BENEFICIARY_CATEGORIES.map(
        (cat) => `
        <button
          type="button"
          class="glass-panel bnf-cat-card"
          data-cat-pill="${escapeHtml(cat)}"
          style="padding:12px 14px;text-align:left;cursor:pointer;border-color:${
            viewState.category === cat ? 'var(--color-primary)' : 'var(--border-subtle)'
          };"
        >
          <div style="font-size:11.5px;font-weight:700;color:var(--text-secondary);">${escapeHtml(cat)}</div>
          <div style="font-size:20px;font-weight:800;color:var(--text-primary);margin-top:4px;">
            ${formatNumber(catCounts[cat] || 0)} <span style="font-size:11px;font-weight:600;color:var(--color-primary);">Aktif</span>
          </div>
        </button>
      `
      ).join('')}
    </div>

    <!-- Main Table Glass Panel -->
    <div class="glass-panel anim-section">
      <div class="dg-table-toolbar">
        <div class="dg-table-filters">
          <div style="position:relative;width:270px;">
            <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);">
              ${renderIcon('search', { size: 15 })}
            </span>
            <input
              type="search"
              id="bnf-search-input"
              class="form-input"
              style="padding-left:34px;"
              placeholder="Cari nama, NIK/NISN, sekolah..."
              value="${escapeHtml(viewState.search)}"
              aria-label="Cari penerima manfaat"
            />
          </div>

          <select id="bnf-cat-filter" class="form-select" style="width:180px;" aria-label="Filter Kategori">
            <option value="ALL" ${viewState.category === 'ALL' ? 'selected' : ''}>Semua Kategori (6)</option>
            ${BENEFICIARY_CATEGORIES.map(
              (c) => `<option value="${escapeHtml(c)}" ${viewState.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>

          <select id="bnf-status-filter" class="form-select" style="width:150px;" aria-label="Filter Status">
            <option value="ALL" ${viewState.status === 'ALL' ? 'selected' : ''}>Semua Status</option>
            <option value="Aktif" ${viewState.status === 'Aktif' ? 'selected' : ''}>Status: Aktif</option>
            <option value="Nonaktif" ${viewState.status === 'Nonaktif' ? 'selected' : ''}>Status: Nonaktif</option>
          </select>

          <select id="bnf-sort-select" class="form-select" style="width:175px;" aria-label="Urutkan Data">
            <option value="name:asc" ${viewState.sortBy === 'name' && viewState.sortDir === 'asc' ? 'selected' : ''}>Nama (A → Z)</option>
            <option value="name:desc" ${viewState.sortBy === 'name' && viewState.sortDir === 'desc' ? 'selected' : ''}>Nama (Z → A)</option>
            <option value="category:asc" ${viewState.sortBy === 'category' ? 'selected' : ''}>Kategori MBG</option>
            <option value="institution:asc" ${viewState.sortBy === 'institution' ? 'selected' : ''}>Sekolah / Posyandu</option>
          </select>
        </div>

        <div style="font-size:12.5px;color:var(--text-secondary);">
          Total Terfilter: <strong>${items.length}</strong> penerima manfaat
        </div>
      </div>

      ${
        pageData.items.length === 0
          ? `
        <div class="dg-state-box">
          <div style="color:var(--text-muted);">${renderIcon('users', { size: 32 })}</div>
          <strong>Tidak Ada Penerima Manfaat yang Cocok</strong>
          <p style="font-size:12.5px;color:var(--text-secondary);">Ubah kata kunci pencarian atau reset filter kategori.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="bnf-reset-filter-btn">Reset Filter</button>
        </div>
      `
          : `
        <div class="dg-table-wrapper">
          <table class="dg-table">
            <thead>
              <tr>
                <th>ID & NIK/NISN</th>
                <th>Nama Lengkap</th>
                <th>Kategori</th>
                <th>Sekolah / Posyandu</th>
                <th>Kelas / Kelompok</th>
                <th>Catatan Gizi / Alergi</th>
                <th>Status</th>
                <th class="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.items
                .map(
                  (b) => `
                <tr>
                  <td>
                    <div class="font-mono font-bold" style="font-size:12px;">${escapeHtml(b.nik)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(b.id)}</div>
                  </td>
                  <td class="font-bold">${escapeHtml(b.name)}</td>
                  <td><span class="badge badge-info">${escapeHtml(b.category)}</span></td>
                  <td>${escapeHtml(b.institution)}</td>
                  <td>${escapeHtml(b.gradeOrGroup)}</td>
                  <td style="max-width:200px;font-size:12px;color:var(--text-secondary);">${escapeHtml(b.notes)}</td>
                  <td>
                    <span class="badge ${b.status === 'Aktif' ? 'badge-success' : 'badge-neutral'}">
                      ${escapeHtml(b.status)}
                    </span>
                  </td>
                  <td class="text-right">
                    <div style="display:inline-flex;gap:6px;">
                      <button type="button" class="btn btn-secondary btn-sm bnf-view-btn" data-id="${escapeHtml(b.id)}" title="Lihat Detail">
                        ${renderIcon('eye', { size: 14 })}
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm bnf-edit-btn" data-id="${escapeHtml(b.id)}" title="Ubah Data">
                        ${renderIcon('edit', { size: 14 })}
                      </button>
                      <button type="button" class="btn btn-danger btn-sm bnf-del-btn" data-id="${escapeHtml(b.id)}" title="Hapus Data">
                        ${renderIcon('trash', { size: 14 })}
                      </button>
                    </div>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationHtml({ ...pageData, idPrefix: 'bnf' })}
      `
      }
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  // Filter & Search Event Listeners
  const searchEl = containerEl.querySelector('#bnf-search-input');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      viewState.search = e.target.value;
      viewState.page = 1;
      renderBeneficiariesPage(containerEl);
    });
  }

  containerEl.querySelector('#bnf-cat-filter')?.addEventListener('change', (e) => {
    viewState.category = e.target.value;
    viewState.page = 1;
    renderBeneficiariesPage(containerEl);
  });

  containerEl.querySelectorAll('.bnf-cat-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-cat-pill');
      viewState.category = viewState.category === cat ? 'ALL' : cat;
      viewState.page = 1;
      renderBeneficiariesPage(containerEl);
    });
  });

  containerEl.querySelector('#bnf-status-filter')?.addEventListener('change', (e) => {
    viewState.status = e.target.value;
    viewState.page = 1;
    renderBeneficiariesPage(containerEl);
  });

  containerEl.querySelector('#bnf-sort-select')?.addEventListener('change', (e) => {
    const [sortBy, sortDir] = e.target.value.split(':');
    viewState.sortBy = sortBy;
    viewState.sortDir = sortDir || 'asc';
    renderBeneficiariesPage(containerEl);
  });

  containerEl.querySelector('#bnf-reset-filter-btn')?.addEventListener('click', () => {
    viewState.search = '';
    viewState.category = 'ALL';
    viewState.status = 'ALL';
    viewState.page = 1;
    renderBeneficiariesPage(containerEl);
  });

  // Pagination buttons
  containerEl.querySelectorAll('[data-page-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-page-action');
      viewState.page += act === 'next' ? 1 : -1;
      renderBeneficiariesPage(containerEl);
    });
  });

  // Add Beneficiary Modal
  const addBtn = containerEl.querySelector('#bnf-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openBeneficiaryFormModal(null, allItems, addBtn, () => renderBeneficiariesPage(containerEl));
    });
  }

  // View Detail Drawer
  containerEl.querySelectorAll('.bnf-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = allItems.find((x) => x.id === id);
      if (!item) return;
      openModal({
        title: `Profil Penerima Manfaat • ${item.id}`,
        size: 'drawer',
        triggerEl: btn,
        bodyHtml: `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="padding:14px;border-radius:12px;background:var(--bg-surface-muted);border:1px solid var(--border-subtle);">
              <span class="badge badge-info">${escapeHtml(item.category)}</span>
              <h3 style="font-size:18px;font-weight:800;margin-top:8px;">${escapeHtml(item.name)}</h3>
              <p class="font-mono" style="font-size:12.5px;color:var(--text-secondary);margin-top:2px;">NIK/NISN: ${escapeHtml(item.nik)}</p>
            </div>
            <div class="glass-panel" style="padding:14px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
                <div><span class="text-muted">Sekolah / Posyandu:</span><br/><strong>${escapeHtml(item.institution)}</strong></div>
                <div><span class="text-muted">Kelas / Kelompok:</span><br/><strong>${escapeHtml(item.gradeOrGroup)}</strong></div>
                <div><span class="text-muted">Status Kepesertaan:</span><br/><strong>${escapeHtml(item.status)}</strong></div>
                <div><span class="text-muted">Tanggal Terdaftar:</span><br/><strong>${formatDateID(item.registeredAt)}</strong></div>
              </div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);font-size:13px;">
                <span class="text-muted">Catatan Diet / Alergi Khusus:</span>
                <p style="font-weight:600;margin-top:4px;">${escapeHtml(item.notes)}</p>
              </div>
            </div>
          </div>
        `,
        footerHtml: `<button type="button" class="btn btn-primary btn-liquid" data-modal-close>Tutup Panel</button>`
      });
    });
  });

  // Edit Beneficiary Modal
  containerEl.querySelectorAll('.bnf-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = allItems.find((x) => x.id === id);
      if (item) {
        openBeneficiaryFormModal(item, allItems, btn, () => renderBeneficiariesPage(containerEl));
      }
    });
  });

  // Delete Beneficiary with Confirmation
  containerEl.querySelectorAll('.bnf-del-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = allItems.find((x) => x.id === id);
      if (!item) return;
      openConfirmDialog({
        title: 'Hapus Data Penerima Manfaat',
        message: `Apakah Anda yakin ingin menghapus "${item.name}" (NIK: ${item.nik}) dari daftar penerima manfaat SPPG?`,
        confirmLabel: 'Hapus Permanen',
        danger: true,
        triggerEl: btn,
        async onConfirm() {
          const delRes = await callApi('beneficiaries_delete', { id: item.id });
          if (delRes.success) {
            showToast({
              title: 'Data Dihapus',
              message: `${item.name} telah dihapus dari daftar penerima manfaat.`,
              type: 'warning'
            });
            renderBeneficiariesPage(containerEl);
          }
        }
      });
    });
  });

  // Export CSV
  containerEl.querySelector('#bnf-export-csv-btn')?.addEventListener('click', () => {
    downloadCsvFile(
      `DapurGizi_Penerima_Manfaat_${new Date().toISOString().slice(0, 10)}.csv`,
      ['ID', 'NIK_NISN', 'Nama_Lengkap', 'Kategori_MBG', 'Sekolah_Posyandu', 'Kelas_Kelompok', 'Status', 'Catatan_Alergi'],
      items.map((b) => [b.id, b.nik, b.name, b.category, b.institution, b.gradeOrGroup, b.status, b.notes])
    );
    showToast({
      title: 'Ekspor CSV Berhasil',
      message: `${items.length} baris data penerima manfaat telah diunduh (kompatibel dengan Microsoft Excel).`,
      type: 'success'
    });
  });

  // Import CSV with Duplicate & Schema Validation
  const importBtn = containerEl.querySelector('#bnf-import-csv-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      openCsvImportModal(allItems, importBtn, () => renderBeneficiariesPage(containerEl));
    });
  }
}

function openBeneficiaryFormModal(editingItem, existingItems, triggerEl, onSuccess) {
  const isEdit = Boolean(editingItem);
  const item = editingItem || {
    nik: '',
    name: '',
    category: 'Siswa SD',
    institution: 'SDN 060812 Medan Baru',
    gradeOrGroup: 'Kelas 4A',
    status: 'Aktif',
    notes: 'Tidak ada alergi'
  };

  openModal({
    title: isEdit ? `Ubah Penerima Manfaat • ${item.name}` : 'Tambah Penerima Manfaat Baru',
    triggerEl,
    bodyHtml: `
      <form id="bnf-crud-form" class="form-grid" novalidate>
        <div class="form-group">
          <label class="form-label" for="f-nik">NIK / NISN (10–16 Digit Angka) *</label>
          <input type="text" id="f-nik" name="nik" class="form-input font-mono" value="${escapeHtml(item.nik)}" placeholder="1271042105160099" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-name">Nama Lengkap Penerima *</label>
          <input type="text" id="f-name" name="name" class="form-input" value="${escapeHtml(item.name)}" placeholder="Contoh: Dimas Anggara" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-category">Kategori Sasaran MBG *</label>
          <select id="f-category" name="category" class="form-select">
            ${BENEFICIARY_CATEGORIES.map(
              (c) => `<option value="${escapeHtml(c)}" ${item.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-status">Status Kepesertaan *</label>
          <select id="f-status" name="status" class="form-select">
            <option value="Aktif" ${item.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${item.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-inst">Sekolah / Posyandu / Institusi *</label>
          <input type="text" id="f-inst" name="institution" class="form-input" value="${escapeHtml(item.institution)}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-grade">Kelas / Kelompok Usia / Trimester</label>
          <input type="text" id="f-grade" name="gradeOrGroup" class="form-input" value="${escapeHtml(item.gradeOrGroup)}" />
        </div>
        <div class="form-group form-group--full">
          <label class="form-label" for="f-notes">Catatan Alergi / Kebutuhan Gizi Khusus</label>
          <textarea id="f-notes" name="notes" class="form-textarea">${escapeHtml(item.notes)}</textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="bnf-save-submit">
        ${renderIcon('check', { size: 16 })}
        <span>${isEdit ? 'Simpan Perubahan' : 'Daftarkan Penerima'}</span>
      </button>
    `,
    onMount(dialog, close) {
      const formEl = dialog.querySelector('#bnf-crud-form');
      const saveBtn = dialog.querySelector('#bnf-save-submit');
      saveBtn.addEventListener('click', async () => {
        const data = extractFormData(formEl);
        const validation = validateBeneficiaryPayload(data, existingItems, isEdit ? editingItem.id : null);
        if (!validation.valid) {
          showFormErrors(formEl, validation.errors);
          return;
        }
        saveBtn.disabled = true;
        const apiFn = isEdit ? 'beneficiaries_update' : 'beneficiaries_create';
        const payload = isEdit ? { ...data, id: editingItem.id } : data;
        const res = await callApi(apiFn, payload);
        saveBtn.disabled = false;
        if (res.success) {
          showToast({
            title: isEdit ? 'Data Penerima Diperbarui' : 'Penerima Manfaat Ditambahkan',
            message: `${data.name} (${data.category}) berhasil disimpan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          showToast({ title: 'Gagal Menyimpan', message: res.error, type: 'danger' });
        }
      });
    }
  });
}

function openCsvImportModal(existingItems, triggerEl, onSuccess) {
  const sampleCsv = [
    'NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan',
    '1271042809160021,Zahra Putri Ramadhani,Siswa SD,SDN 060812 Medan Baru,Aktif,Tidak ada alergi',
    '1271041502230022,Rafaizan Alfarizqi,Balita,Posyandu Anggrek Bulan II,Aktif,Bubur saring halus',
    '1271042105160001,Aditya Pratama Putra,Siswa SD,SDN 060812 Medan Baru,Aktif,Duplikat NIK contoh',
    'ABC123,Data Invalid Contoh,Kategori Salah,SDN Contoh,Aktif,-'
  ].join('\n');

  let validatedBatch = [];

  openModal({
    title: 'Impor & Validasi CSV Penerima Manfaat (Deteksi Duplikat)',
    size: 'lg',
    triggerEl,
    bodyHtml: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <p style="font-size:13px;color:var(--text-secondary);">
          Unggah file <code>.csv</code> atau uji langsung menggunakan data CSV di bawah. Sistem secara otomatis memvalidasi format NIK (10–16 digit), kategori sasaran MBG, dan mendeteksi duplikasi NIK.
        </p>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="file" id="csv-file-picker" accept=".csv,text/csv" class="form-input" style="padding:6px;" />
          <button type="button" class="btn btn-secondary btn-liquid" id="csv-validate-btn">
            ${renderIcon('shield-check', { size: 16 })} Periksa & Validasi CSV
          </button>
        </div>
        <div class="form-group">
          <label class="form-label" for="csv-raw-textarea">Isi Data CSV (Kolom: NIK, Nama, Kategori, Sekolah_Posyandu, Status, Catatan)</label>
          <textarea id="csv-raw-textarea" class="form-textarea font-mono" style="min-height:115px;font-size:12px;">${escapeHtml(sampleCsv)}</textarea>
        </div>
        <div id="csv-validation-result"></div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="csv-commit-import-btn" disabled>
        ${renderIcon('upload', { size: 16 })} Impor Baris Valid (0)
      </button>
    `,
    onMount(dialog, close) {
      const filePicker = dialog.querySelector('#csv-file-picker');
      const textarea = dialog.querySelector('#csv-raw-textarea');
      const validateBtn = dialog.querySelector('#csv-validate-btn');
      const resultBox = dialog.querySelector('#csv-validation-result');
      const commitBtn = dialog.querySelector('#csv-commit-import-btn');

      filePicker.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          textarea.value = String(reader.result || '');
          runValidation();
        };
        reader.readAsText(file);
      });

      const runValidation = () => {
        const report = parseAndValidateBeneficiaryCSV(textarea.value, existingItems);
        validatedBatch = report.validRows;
        commitBtn.disabled = validatedBatch.length === 0;
        commitBtn.innerHTML = `${renderIcon('upload', { size: 16 })} Impor Baris Valid (${validatedBatch.length})`;

        resultBox.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">
            <div style="padding:10px;border-radius:8px;background:rgba(34,197,94,0.14);color:#15803D;font-weight:700;font-size:12.5px;">
              ✓ Baris Valid Siap Impor: ${report.validRows.length}
            </div>
            <div style="padding:10px;border-radius:8px;background:rgba(245,158,11,0.16);color:#B45309;font-weight:700;font-size:12.5px;">
              ⚠ Duplikat Terdeteksi: ${report.duplicateRows.length}
            </div>
            <div style="padding:10px;border-radius:8px;background:rgba(239,68,68,0.14);color:#B91C1C;font-weight:700;font-size:12.5px;">
              ✕ Format Tidak Valid: ${report.invalidRows.length}
            </div>
          </div>
          ${
            report.duplicateRows.length || report.invalidRows.length
              ? `
            <div style="max-height:130px;overflow-y:auto;padding:10px;border-radius:8px;background:var(--bg-surface-muted);font-size:12px;">
              ${report.duplicateRows
                .map((d) => `<div style="color:var(--color-warning);margin-bottom:4px;">• Baris ${d.line} [Duplikat]: ${escapeHtml(d.reason)}</div>`)
                .join('')}
              ${report.invalidRows
                .map((inv) => `<div style="color:var(--color-danger);margin-bottom:4px;">• Baris ${inv.line} [Invalid]: ${escapeHtml(inv.reason)}</div>`)
                .join('')}
            </div>
          `
              : ''
          }
        `;
      };

      validateBtn.addEventListener('click', runValidation);
      runValidation();

      commitBtn.addEventListener('click', async () => {
        if (!validatedBatch.length) return;
        commitBtn.disabled = true;
        const res = await callApi('beneficiaries_import', { records: validatedBatch });
        if (res.success) {
          showToast({
            title: 'Impor CSV Selesai',
            message: `${res.data.importedCount} penerima manfaat valid berhasil ditambahkan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}
