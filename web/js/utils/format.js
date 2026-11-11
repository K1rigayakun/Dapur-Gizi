/**
 * DapurGizi Formatting Utilities (Indonesian Locale & Currency/Date Conventions)
 */

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('id-ID');

export function formatRupiah(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return 'Rp 0';
  return idrFormatter.format(Math.round(num)).replace(/\u00a0/g, ' ');
}

export function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  return numberFormatter.format(num);
}

export function formatPercent(value, decimals = 1) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

export function formatDateID(dateInput, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? new Date(`${dateInput}T00:00:00`)
    : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('id-ID', options);
}

export function formatDateTimeID(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  const datePart = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart} WIB`;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadCsvFile(filename, headers, rows) {
  const bom = '\uFEFF';
  const escapeCell = (cell) => {
    const s = cell === null || cell === undefined ? '' : String(cell);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(','))
  ];
  const blob = new Blob([bom + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
