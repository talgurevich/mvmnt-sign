/**
 * Excel Parser Utility
 * Parses Hebrew bank Excel files (client-side)
 */

import * as XLSX from 'xlsx';

/**
 * Convert Excel date serial to JavaScript Date
 */
function excelDateToJS(excelDate) {
  if (!excelDate) return null;
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  // Excel serial date (days since 1899-12-30)
  const millisPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + excelDate * millisPerDay);
}

/**
 * Parse Hebrew bank Excel file
 * @param {ArrayBuffer} buffer - File content as ArrayBuffer
 * @returns {Array} Parsed transactions
 */
export function parseHebrewBankExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  const transactions = [];
  let headerFound = false;

  rawData.forEach(row => {
    // Look for header row containing 'הפעולה'
    if (row['__EMPTY'] === 'הפעולה') {
      headerFound = true;
      return;
    }

    if (!headerFound) return;

    // Parse transaction rows
    const date = row['תנועות בחשבון'];
    const type = row['__EMPTY'];
    const details = row['__EMPTY_1'];
    const reference = row['__EMPTY_2'];
    const debit = row['__EMPTY_3'];
    const credit = row['__EMPTY_4'];
    const balance = row['__EMPTY_5'];
    const valueDate = row['__EMPTY_6'];
    const recipient = row['__EMPTY_7'];
    const purpose = row['__EMPTY_8'];

    // Skip empty rows
    if (!date && !type) return;

    const parsedDate = excelDateToJS(date);

    transactions.push({
      date: parsedDate,
      dateString: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
      type: type || '',
      details: details || '',
      reference: reference ? String(reference) : '',
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
      balance: parseFloat(balance) || 0,
      recipient: recipient || '',
      purpose: purpose || ''
    });
  });

  return transactions.filter(tx => tx.date);
}

/**
 * Read file as ArrayBuffer
 * @param {File} file - File object
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export default { parseHebrewBankExcel, readFileAsArrayBuffer };
