/**
 * DapurGizi Form & CSV Import Validation Utilities
 */

export const BENEFICIARY_CATEGORIES = [
  'Siswa SD',
  'Siswa SMP',
  'Siswa SMA',
  'Ibu Hamil',
  'Ibu Menyusui',
  'Balita'
];

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateNIK(nik) {
  if (!nik) return false;
  const clean = String(nik).replace(/\s+/g, '');
  return /^\d{16}$/.test(clean);
}

export function validateBeneficiaryPayload(data, existingRecords = [], editingId = null) {
  const errors = {};
  const nik = String(data.nik || '').trim();
  const name = String(data.name || '').trim();
  const category = String(data.category || '').trim();
  const institution = String(data.institution || '').trim();

  if (!nik) {
    errors.nik = 'Nomor identitas (NIK/NISN 16 digit) wajib diisi.';
  } else if (!/^\d{10,16}$/.test(nik)) {
    errors.nik = 'Nomor identitas harus berupa 10–16 digit angka.';
  } else {
    const duplicate = existingRecords.find(
      (r) => String(r.nik).trim() === nik && String(r.id) !== String(editingId)
    );
    if (duplicate) {
      errors.nik = `Duplikat terdeteksi: Nomor identitas sudah terdaftar atas nama ${duplicate.name}.`;
    }
  }

  if (!name || name.length < 3) {
    errors.name = 'Nama lengkap penerima manfaat minimal 3 karakter.';
  }

  if (!BENEFICIARY_CATEGORIES.includes(category)) {
    errors.category = 'Pilih kategori penerima manfaat yang valid.';
  }

  if (!institution || institution.length < 3) {
    errors.institution = 'Nama sekolah atau posyandu wajib diisi.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function parseAndValidateBeneficiaryCSV(csvText, existingRecords = []) {
  const lines = String(csvText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      validRows: [],
      invalidRows: [{ line: 1, reason: 'File CSV kosong atau tidak memiliki baris data.' }],
      duplicateRows: []
    };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const nikIdx = headers.findIndex((h) => h.includes('nik') || h.includes('nisn') || h.includes('identitas'));
  const nameIdx = headers.findIndex((h) => h.includes('nama') || h.includes('name'));
  const catIdx = headers.findIndex((h) => h.includes('kategori') || h.includes('category'));
  const instIdx = headers.findIndex((h) => h.includes('sekolah') || h.includes('instansi') || h.includes('posyandu') || h.includes('institution'));
  const statusIdx = headers.findIndex((h) => h.includes('status'));
  const allergyIdx = headers.findIndex((h) => h.includes('alergi') || h.includes('catatan') || h.includes('notes'));

  const seenNiksInBatch = new Set();
  const existingNikSet = new Set(existingRecords.map((r) => String(r.nik).trim()));

  const validRows = [];
  const invalidRows = [];
  const duplicateRows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    const rowObj = {
      nik: cols[nikIdx >= 0 ? nikIdx : 0] || '',
      name: cols[nameIdx >= 0 ? nameIdx : 1] || '',
      category: cols[catIdx >= 0 ? catIdx : 2] || '',
      institution: cols[instIdx >= 0 ? instIdx : 3] || '',
      status: cols[statusIdx >= 0 ? statusIdx : 4] || 'Aktif',
      notes: cols[allergyIdx >= 0 ? allergyIdx : 5] || 'Tidak ada alergi'
    };

    if (!/^\d{10,16}$/.test(rowObj.nik)) {
      invalidRows.push({ line: i + 1, row: rowObj, reason: `NIK/NISN "${rowObj.nik}" tidak valid (wajib 10–16 digit angka).` });
      continue;
    }
    if (!rowObj.name || rowObj.name.length < 3) {
      invalidRows.push({ line: i + 1, row: rowObj, reason: 'Nama penerima manfaat kurang dari 3 karakter.' });
      continue;
    }
    if (!BENEFICIARY_CATEGORIES.includes(rowObj.category)) {
      invalidRows.push({
        line: i + 1,
        row: rowObj,
        reason: `Kategori "${rowObj.category}" tidak termasuk dalam 6 kategori MBG.`
      });
      continue;
    }
    if (!rowObj.institution) {
      invalidRows.push({ line: i + 1, row: rowObj, reason: 'Institusi/Sekolah/Posyandu kosong.' });
      continue;
    }

    if (existingNikSet.has(rowObj.nik) || seenNiksInBatch.has(rowObj.nik)) {
      duplicateRows.push({
        line: i + 1,
        row: rowObj,
        reason: existingNikSet.has(rowObj.nik)
          ? `NIK/NISN ${rowObj.nik} sudah terdaftar di database.`
          : `NIK/NISN ${rowObj.nik} terduplikasi di dalam file CSV.`
      });
      continue;
    }

    seenNiksInBatch.add(rowObj.nik);
    validRows.push(rowObj);
  }

  return { validRows, invalidRows, duplicateRows };
}
