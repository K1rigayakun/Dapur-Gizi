const todayStr = new Date().toISOString().slice(0, 10);

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3500);
}

// Navigasi Tab
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    document.getElementById(`tab-${target}`).classList.add("active");

    const titles = {
      distribution: "Manajemen Distribusi Pangan",
      "food-safety": "Keamanan Pangan, Checklist & SLHS",
      reports: "Laporan Operasional & Export CSV",
    };
    document.getElementById("page-title").textContent = titles[target];
  });
});

// ==================== 1. DISTRIBUTION ====================
async function loadDistributions() {
  const res = await eel.distributions_list({})();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  const tbody = document.getElementById("dist-table-body");
  tbody.innerHTML = "";

  res.data.forEach((item) => {
    let badgeClass = "badge-wait";
    if (item.status === "Dalam Perjalanan") badgeClass = "badge-ship";
    if (item.status === "Diterima") badgeClass = "badge-done";

    let actionBtn = "-";
    if (item.status === "Siap Kirim") {
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="startDelivery('${item.id}')">Mulai Kirim</button>`;
    } else if (item.status === "Dalam Perjalanan") {
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="openReceiptModal('${item.id}', ${item.dispatchedPortions})">Konfirmasi Terima</button>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.routeCode}</strong></td>
      <td>${item.date}</td>
      <td>${item.destinationName}<br><small style="color:#64748b">${item.address}</small></td>
      <td>${item.driverName}</td>
      <td>${item.dispatchedPortions}</td>
      <td>${item.receivedPortions ?? "-"}</td>
      <td>${item.discrepancy}</td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("form-create-dist").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.dispatchedPortions = Number(payload.dispatchedPortions);

  const res = await eel.distributions_create(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast("Jadwal distribusi berhasil dibuat.");
  e.target.reset();
  document.getElementById("dist-date").value = todayStr;
  loadDistributions();
});

async function startDelivery(id) {
  const res = await eel.distributions_update({ id, status: "Dalam Perjalanan" })();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast("Status diperbarui: Dalam Perjalanan.");
  loadDistributions();
}

function openReceiptModal(id, dispatchedPortions) {
  document.getElementById("rec-id").value = id;
  document.getElementById("rec-portions").value = dispatchedPortions;
  document.getElementById("receipt-modal").classList.remove("hidden");
}

function closeReceiptModal() {
  document.getElementById("receipt-modal").classList.add("hidden");
}

document.getElementById("form-receipt").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    id: document.getElementById("rec-id").value,
    receivedPortions: Number(document.getElementById("rec-portions").value),
    receivedTime: document.getElementById("rec-time").value,
    receiverName: document.getElementById("rec-name").value,
    notes: document.getElementById("rec-notes").value,
  };
  const res = await eel.distributions_confirm_receipt(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast("Serah terima distribusi berhasil dikonfirmasi.");
  closeReceiptModal();
  loadDistributions();
});

// ==================== 2. FOOD SAFETY ====================
let currentChecklistItems = [];

async function loadChecklist() {
  const dateVal = document.getElementById("chk-date").value || todayStr;
  const res = await eel.hygiene_get_checklist({ date: dateVal })();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  const data = res.data;
  document.getElementById("chk-inspector").value = data.inspectorName || "";
  document.getElementById("chk-notes").value = data.notes || "";
  currentChecklistItems = data.items || [];

  const container = document.getElementById("checklist-items");
  container.innerHTML = "";
  currentChecklistItems.forEach((item, idx) => {
    const label = document.createElement("label");
    label.className = "chk-item";
    label.innerHTML = `
      <input type="checkbox" ${item.checked ? "checked" : ""} onchange="toggleCheck(${idx}, this.checked)" />
      <span>${item.label}</span>
    `;
    container.appendChild(label);
  });
}

function toggleCheck(idx, state) {
  currentChecklistItems[idx].checked = state;
}

document.getElementById("chk-date").addEventListener("change", loadChecklist);

document.getElementById("form-checklist").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    date: document.getElementById("chk-date").value,
    inspectorName: document.getElementById("chk-inspector").value,
    items: currentChecklistItems,
    notes: document.getElementById("chk-notes").value,
  };
  const res = await eel.hygiene_save_checklist(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast(`Checklist disimpan (${res.data.status}).`);
});

async function loadSLHS() {
  const res = await eel.slhs_list({})();
  if (!res.success) return;
  const container = document.getElementById("slhs-list");
  container.innerHTML = res.data
    .map(
      (s) => `
      <div class="slhs-card">
        <strong>No. Sertifikat: ${s.certificateNumber}</strong><br>
        Penerbit: ${s.issuer}<br>
        Berlaku: ${s.issueDate} s/d ${s.expiryDate} • <strong>${s.verificationStatus}</strong>
      </div>
    `
    )
    .join("");
}

document.getElementById("form-food-waste").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    date: document.getElementById("fw-date").value,
    category: document.getElementById("fw-category").value,
    weightKg: document.getElementById("fw-weight").value,
    handlingMethod: document.getElementById("fw-method").value,
  };
  const res = await eel.food_waste_create(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast("Catatan limbah pangan berhasil disimpan.");
  e.target.reset();
  document.getElementById("fw-date").value = todayStr;
});

document.getElementById("form-incident").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("inc-title").value,
    location: document.getElementById("inc-location").value,
    severity: document.getElementById("inc-severity").value,
    actionTaken: document.getElementById("inc-action").value,
  };
  const res = await eel.incidents_create(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  showToast("Insiden keamanan pangan berhasil dicatat.");
  e.target.reset();
});

// ==================== 3. REPORTS ====================
document.getElementById("form-report").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    reportType: document.getElementById("rep-type").value,
    startDate: document.getElementById("rep-start").value,
    endDate: document.getElementById("rep-end").value,
  };
  const res = await eel.reports_generate(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  const rep = res.data;
  document.getElementById("report-heading").textContent = rep.title;
  document.getElementById("report-meta").textContent = `Periode: ${rep.period} | Total Data: ${rep.totalRecords} baris`;

  const thead = document.getElementById("report-thead");
  const tbody = document.getElementById("report-tbody");
  thead.innerHTML = `<tr>${rep.headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;

  if (rep.rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${rep.headers.length}" style="text-align:center">Belum ada data pada periode ini.</td></tr>`;
  } else {
    tbody.innerHTML = rep.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("");
  }
});

async function exportReportCSV() {
  const payload = {
    reportType: document.getElementById("rep-type").value,
    startDate: document.getElementById("rep-start").value,
    endDate: document.getElementById("rep-end").value,
  };
  const res = await eel.reports_export(payload)();
  if (!res.success) {
    showToast(res.error, "error");
    return;
  }
  const blob = new Blob([res.data.content], { type: res.data.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.data.filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast("File CSV berhasil diunduh.");
}

// Init tanggal default saat halaman dibuka
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dist-date").value = todayStr;
  document.getElementById("chk-date").value = todayStr;
  document.getElementById("fw-date").value = todayStr;
  document.getElementById("rep-start").value = todayStr;
  document.getElementById("rep-end").value = todayStr;

  loadDistributions();
  loadChecklist();
  loadSLHS();
});