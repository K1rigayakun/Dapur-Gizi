/**
 * DapurGizi — Module G: Distribution & Delivery Tracking (js/pages/distribution.js)
 * Implements:
 * - Distribution overview & status cards
 * - Delivery schedules & destination list (Schools & Posyandu)
 * - Create & Edit delivery modal
 * - Delivery timeline & status transitions (Siap Kirim → Dalam Perjalanan → Diterima)
 * - Received confirmation modal (received quantity, receiver name, notes, discrepancy calculation)
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { formatNumber, escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindGlassCards, bindInteractiveButtons } from '../utils/motion.js';

export async function renderDistributionPage(containerEl) {
  if (!containerEl) return;
  const res = await callApi('distributions_list', { date: 'ALL' });
  const items = res.success ? res.data.items : [];

  const totalDispatched = items.reduce((s, d) => s + Number(d.dispatchedPortions || 0), 0);
  const totalReceived = items.reduce((s, d) => s + Number(d.receivedPortions || 0), 0);
  const inTransitCount = items.filter((d) => d.status === 'Dalam Perjalanan').length;
  const completedCount = items.filter((d) => d.status === 'Diterima').length;
  const discrepancyItems = items.filter(
    (d) => d.status === 'Diterima' && Number(d.receivedPortions) !== Number(d.dispatchedPortions)
  );

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('truck', { size: 14 })} LOGISTIK & SERAH TERIMA SEKOLAH/POSYANDU</span>
        <h1 class="page-header__title">Manajemen Distribusi & Armada Pengiriman</h1>
        <p class="page-header__subtitle">
          Pantau jadwal pengiriman, status armada (Siap Kirim, Dalam Perjalanan, Diterima), bukti serah terima, dan selisih porsi.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="dist-create-btn">
          ${renderIcon('plus', { size: 16 })}
          <span>Jadwalkan Pengiriman Baru</span>
        </button>
      </div>
    </div>

    <!-- 4 Distribution KPI Cards -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Total Porsi Dikirim</span>
          <span class="kpi-glass-card__icon">${renderIcon('package', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatNumber(totalDispatched)}</div>
        <div class="kpi-glass-card__meta"><span>${items.length} Rute Terjadwal</span></div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Terkonfirmasi Diterima</span>
          <span class="kpi-glass-card__icon">${renderIcon('check-circle', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatNumber(totalReceived)}</div>
        <div class="kpi-glass-card__meta"><span class="badge badge-success">${completedCount} Titik Selesai</span></div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Armada Dalam Perjalanan</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--gold">${renderIcon('truck', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${inTransitCount} Armada</div>
        <div class="kpi-glass-card__meta"><span class="badge badge-info">GPS & Segel Termal Aktif</span></div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Catatan Selisih Kuantitas</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--warm">${renderIcon('alert-triangle', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${discrepancyItems.length} Rute</div>
        <div class="kpi-glass-card__meta"><span>${discrepancyItems.length ? 'Perlu Verifikasi Berita Acara' : '0 Selisih'}</span></div>
      </div>
    </div>

    <!-- Delivery Schedules Table & Timeline -->
    <div class="glass-panel anim-section">
      <div class="glass-panel__header">
        <div>
          <h2 class="glass-panel__title">${renderIcon('map-pin', { size: 18 })} Jadwal Rute Pengiriman & Konfirmasi Penerimaan</h2>
          <p class="glass-panel__subtitle">Klik tombol aksi untuk memberangkatkan armada atau mengonfirmasi berita acara serah terima</p>
        </div>
      </div>

      <div class="dg-table-wrapper">
        <table class="dg-table">
          <thead>
            <tr>
              <th>Kode Rute</th>
              <th>Sekolah / Posyandu Tujuan</th>
              <th>Pengemudi & Armada</th>
              <th>Berangkat / ETA</th>
              <th class="text-right">Dikirim</th>
              <th class="text-right">Diterima</th>
              <th>Status Pengiriman</th>
              <th>Pejabat Penerima & Catatan</th>
              <th class="text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((d) => {
                const badgeClass =
                  d.status === 'Diterima'
                    ? 'badge-success'
                    : d.status === 'Dalam Perjalanan'
                    ? 'badge-info'
                    : 'badge-warning';
                const hasDiff = d.status === 'Diterima' && Number(d.receivedPortions) !== Number(d.dispatchedPortions);
                return `
                  <tr>
                    <td>
                      <div class="font-mono font-bold">${escapeHtml(d.routeCode)}</div>
                      <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(d.date)}</div>
                    </td>
                    <td>
                      <div class="font-bold">${escapeHtml(d.destinationName)}</div>
                      <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(d.destinationType)} • ${escapeHtml(d.address)}</div>
                    </td>
                    <td>${escapeHtml(d.driverName)}</td>
                    <td>
                      <div>Berangkat: <strong>${escapeHtml(d.departureTime)}</strong></div>
                      <div style="font-size:11.5px;color:var(--text-secondary);">ETA: ${escapeHtml(d.etaTime)}</div>
                    </td>
                    <td class="text-right font-mono font-bold">${formatNumber(d.dispatchedPortions)}</td>
                    <td class="text-right font-mono ${hasDiff ? 'text-warning font-bold' : ''}">
                      ${d.status === 'Diterima' ? formatNumber(d.receivedPortions) : '-'}
                      ${hasDiff ? `<div style="font-size:10.5px;">(Selisih ${d.receivedPortions - d.dispatchedPortions})</div>` : ''}
                    </td>
                    <td><span class="badge ${badgeClass}">${escapeHtml(d.status)}</span></td>
                    <td style="max-width:210px;">
                      <div style="font-weight:600;font-size:12px;">${escapeHtml(d.receiverName)}</div>
                      <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(d.notes)}</div>
                    </td>
                    <td class="text-right">
                      <div style="display:inline-flex;gap:6px;">
                        ${
                          d.status === 'Siap Kirim'
                            ? `
                          <button type="button" class="btn btn-secondary btn-sm dist-dispatch-btn" data-id="${escapeHtml(d.id)}" title="Berangkatkan Armada">
                            ${renderIcon('send', { size: 14 })} Kirim
                          </button>
                        `
                            : ''
                        }
                        ${
                          d.status !== 'Diterima'
                            ? `
                          <button type="button" class="btn btn-primary btn-sm dist-confirm-btn" data-id="${escapeHtml(d.id)}" title="Konfirmasi Diterima">
                            ${renderIcon('check-circle', { size: 14 })} Terima
                          </button>
                        `
                            : ''
                        }
                        <button type="button" class="btn btn-secondary btn-sm dist-edit-btn" data-id="${escapeHtml(d.id)}" title="Ubah Rute">
                          ${renderIcon('edit', { size: 14 })}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindGlassCards(containerEl);
  bindInteractiveButtons(containerEl);

  // Dispatch button (Siap Kirim -> Dalam Perjalanan)
  containerEl.querySelectorAll('.dist-dispatch-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const resUpd = await callApi('distributions_update', {
        id,
        status: 'Dalam Perjalanan',
        notes: 'Armada telah diberangkatkan dari Dapur Utama SPPG.'
      });
      if (resUpd.success) {
        showToast({
          title: 'Armada Diberangkatkan',
          message: `Status rute ${resUpd.data.routeCode} diperbarui menjadi Dalam Perjalanan.`,
          type: 'info'
        });
        renderDistributionPage(containerEl);
      }
    });
  });

  // Confirm Receipt modal
  containerEl.querySelectorAll('.dist-confirm-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((x) => x.id === btn.getAttribute('data-id'));
      if (item) openConfirmReceiptModal(item, btn, () => renderDistributionPage(containerEl));
    });
  });

  // Create Delivery modal
  const createBtn = containerEl.querySelector('#dist-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openDeliveryFormModal(null, createBtn, () => renderDistributionPage(containerEl));
    });
  }

  // Edit Delivery modal
  containerEl.querySelectorAll('.dist-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((x) => x.id === btn.getAttribute('data-id'));
      if (item) openDeliveryFormModal(item, btn, () => renderDistributionPage(containerEl));
    });
  });
}

function openConfirmReceiptModal(item, triggerEl, onSuccess) {
  openModal({
    title: `Konfirmasi Serah Terima • ${item.routeCode}`,
    triggerEl,
    bodyHtml: `
      <form id="dist-receipt-form" class="form-grid">
        <div class="form-group form-group--full" style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
          <strong>Tujuan: ${escapeHtml(item.destinationName)}</strong>
          <div style="font-size:12px;color:var(--text-secondary);">Jumlah Dikirim dari Dapur: <strong>${formatNumber(item.dispatchedPortions)} porsi</strong></div>
        </div>
        <div class="form-group">
          <label class="form-label">Jumlah Porsi Diterima Aktual *</label>
          <input type="number" name="receivedPortions" class="form-input" value="${item.dispatchedPortions}" min="0" required />
        </div>
        <div class="form-group">
          <label class="form-label">Waktu Diterima *</label>
          <input type="text" name="receivedTime" class="form-input" value="07:35 WIB" required />
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Nama & Jabatan Pejabat Penerima di Sekolah / Posyandu *</label>
          <input type="text" name="receiverName" class="form-input" value="${escapeHtml(item.receiverName !== '-' ? item.receiverName : 'Koordinator UKS / Kepala Sekolah')}" required />
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Catatan Penerimaan / Keterangan Selisih</label>
          <textarea name="notes" class="form-textarea">Seluruh ompreng diterima dalam kondisi segel utuh dan suhu hangat.</textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="dist-receipt-submit">
        ${renderIcon('check-circle', { size: 16 })} Konfirmasi Berita Acara
      </button>
    `,
    onMount(dialog, close) {
      const btn = dialog.querySelector('#dist-receipt-submit');
      const formEl = dialog.querySelector('#dist-receipt-form');
      btn.addEventListener('click', async () => {
        const data = extractFormData(formEl);
        btn.disabled = true;
        const res = await callApi('distributions_confirm_receipt', {
          id: item.id,
          receivedPortions: Number(data.receivedPortions),
          receivedTime: data.receivedTime,
          receiverName: data.receiverName,
          notes: data.notes
        });
        if (res.success) {
          showToast({
            title: 'Serah Terima Dikonfirmasi',
            message: `${res.data.receivedPortions} porsi diterima di ${item.destinationName}.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}

function openDeliveryFormModal(editingItem, triggerEl, onSuccess) {
  const isEdit = Boolean(editingItem);
  const d = editingItem || {
    routeCode: 'RUTE-C2',
    date: '2026-11-12',
    destinationName: 'SDN 060815 Padang Bulan',
    destinationType: 'Sekolah Dasar',
    address: 'Jl. Jamin Ginting No. 45, Medan',
    driverName: 'Bambang Supriadi (BK 8832 MN)',
    departureTime: '07:10 WIB',
    etaTime: '07:40 WIB',
    dispatchedPortions: 540,
    status: 'Siap Kirim',
    notes: 'Pengiriman reguler kloter pagi.'
  };

  openModal({
    title: isEdit ? `Ubah Jadwal Distribusi • ${d.routeCode}` : 'Buat Jadwal Pengiriman Baru',
    triggerEl,
    bodyHtml: `
      <form id="dist-crud-form" class="form-grid">
        <div class="form-group">
          <label class="form-label">Kode Rute *</label>
          <input type="text" name="routeCode" class="form-input font-mono" value="${escapeHtml(d.routeCode)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Pengiriman *</label>
          <input type="date" name="date" class="form-input" value="${escapeHtml(d.date)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Nama Sekolah / Posyandu Tujuan *</label>
          <input type="text" name="destinationName" class="form-input" value="${escapeHtml(d.destinationName)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Jenis Institusi</label>
          <select name="destinationType" class="form-select">
            ${['Sekolah Dasar', 'Sekolah Menengah Pertama', 'Sekolah Menengah Atas', 'Posyandu (Ibu Hamil, Menyusui & Balita)']
              .map((t) => `<option value="${t}" ${d.destinationType === t ? 'selected' : ''}>${t}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Alamat Titik Serah Terima</label>
          <input type="text" name="address" class="form-input" value="${escapeHtml(d.address)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Pengemudi & Nomor Polisi Armada *</label>
          <input type="text" name="driverName" class="form-input" value="${escapeHtml(d.driverName)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Waktu Keberangkatan</label>
          <input type="text" name="departureTime" class="form-input" value="${escapeHtml(d.departureTime)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Estimasi Tiba (ETA)</label>
          <input type="text" name="etaTime" class="form-input" value="${escapeHtml(d.etaTime)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Jumlah Porsi Dikirim *</label>
          <input type="number" name="dispatchedPortions" class="form-input" value="${d.dispatchedPortions}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Status Pengiriman</label>
          <select name="status" class="form-select">
            <option value="Siap Kirim" ${d.status === 'Siap Kirim' ? 'selected' : ''}>Siap Kirim</option>
            <option value="Dalam Perjalanan" ${d.status === 'Dalam Perjalanan' ? 'selected' : ''}>Dalam Perjalanan</option>
            <option value="Diterima" ${d.status === 'Diterima' ? 'selected' : ''}>Diterima</option>
          </select>
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Catatan Pengiriman</label>
          <textarea name="notes" class="form-textarea">${escapeHtml(d.notes)}</textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="dist-save-btn">
        ${renderIcon('check', { size: 16 })} Simpan Jadwal
      </button>
    `,
    onMount(dialog, close) {
      const btn = dialog.querySelector('#dist-save-btn');
      const formEl = dialog.querySelector('#dist-crud-form');
      btn.addEventListener('click', async () => {
        const data = extractFormData(formEl);
        if (!data.destinationName) return;
        btn.disabled = true;
        const fn = isEdit ? 'distributions_update' : 'distributions_create';
        const payload = isEdit
          ? { ...data, id: editingItem.id, dispatchedPortions: Number(data.dispatchedPortions) }
          : { ...data, dispatchedPortions: Number(data.dispatchedPortions) };
        const res = await callApi(fn, payload);
        if (res.success) {
          showToast({
            title: isEdit ? 'Jadwal Distribusi Diperbarui' : 'Jadwal Distribusi Ditambahkan',
            message: `${data.routeCode} (${data.destinationName}) berhasil disimpan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}
