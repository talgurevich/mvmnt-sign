/**
 * Finance Controller
 * Handles bank transaction upload, parsing, and analytics
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const XLSX = require('xlsx');

/**
 * Convert Excel date serial to JavaScript Date
 */
function excelDateToJS(excelDate) {
  if (!excelDate) return null;
  if (typeof excelDate === 'string') {
    // Already a date string
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
 */
function parseHebrewBankExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
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
      transaction_date: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
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

  return transactions.filter(tx => tx.transaction_date);
}

/**
 * Upload and parse Excel file
 * POST /api/finance/upload
 */
exports.uploadTransactions = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const userId = req.user.id;
  const fileName = req.file.originalname;

  // Parse the Excel file
  const transactions = parseHebrewBankExcel(req.file.buffer);

  if (transactions.length === 0) {
    throw new AppError('No transactions found in file', 400);
  }

  // Calculate date range and totals
  const dates = transactions.map(tx => new Date(tx.transaction_date)).filter(d => !isNaN(d));
  const dateRangeStart = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const dateRangeEnd = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  const totalIncome = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const totalExpenses = transactions.reduce((sum, tx) => sum + tx.debit, 0);

  // Create import record
  const { data: importRecord, error: importError } = await supabaseAdmin
    .from('finance_imports')
    .insert({
      user_id: userId,
      file_name: fileName,
      date_range_start: dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : null,
      date_range_end: dateRangeEnd ? dateRangeEnd.toISOString().split('T')[0] : null,
      total_transactions: transactions.length,
      total_income: totalIncome,
      total_expenses: totalExpenses
    })
    .select()
    .single();

  if (importError) {
    console.error('Error creating import record:', importError);
    throw new AppError('Failed to create import record', 500);
  }

  // Insert transactions
  const transactionsToInsert = transactions.map(tx => ({
    ...tx,
    import_id: importRecord.id,
    user_id: userId
  }));

  const { error: txError } = await supabaseAdmin
    .from('bank_transactions')
    .insert(transactionsToInsert);

  if (txError) {
    // Clean up import record on failure
    await supabaseAdmin.from('finance_imports').delete().eq('id', importRecord.id);
    console.error('Error inserting transactions:', txError);
    throw new AppError('Failed to save transactions', 500);
  }

  res.status(201).json({
    message: 'Transactions uploaded successfully',
    import: importRecord,
    transactionCount: transactions.length,
    totalIncome,
    totalExpenses,
    dateRange: {
      start: dateRangeStart,
      end: dateRangeEnd
    }
  });
});

/**
 * Get all transactions with optional filters
 * GET /api/finance/transactions
 */
exports.getTransactions = catchAsync(async (req, res) => {
  const { startDate, endDate, type, limit = 1000, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('bank_transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new AppError('Failed to fetch transactions', 500);
  }

  res.json({
    transactions: data,
    total: count,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

/**
 * Get summary statistics
 * GET /api/finance/summary
 */
exports.getSummary = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = supabaseAdmin
    .from('bank_transactions')
    .select('debit, credit, balance, transaction_date')
    .order('transaction_date', { ascending: true });

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching summary:', error);
    throw new AppError('Failed to fetch summary', 500);
  }

  const totalIncome = data.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalExpenses = data.reduce((sum, tx) => sum + (tx.debit || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  const finalBalance = data.length > 0 ? data[data.length - 1].balance : 0;

  res.json({
    totalIncome,
    totalExpenses,
    netBalance,
    finalBalance,
    transactionCount: data.length
  });
});

/**
 * Get monthly aggregations
 * GET /api/finance/monthly
 */
exports.getMonthlyData = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = supabaseAdmin
    .from('bank_transactions')
    .select('transaction_date, debit, credit, balance, type')
    .order('transaction_date', { ascending: true });

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching monthly data:', error);
    throw new AppError('Failed to fetch monthly data', 500);
  }

  // Group by month
  const monthlyMap = new Map();

  data.forEach(tx => {
    const date = new Date(tx.transaction_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        monthKey,
        label: date.toLocaleString('he-IL', { year: 'numeric', month: 'short' }),
        income: 0,
        expenses: 0,
        balance: 0,
        transactionCount: 0,
        byCategory: {}
      });
    }

    const month = monthlyMap.get(monthKey);
    month.income += tx.credit || 0;
    month.expenses += tx.debit || 0;
    month.balance = tx.balance; // Last balance of the month
    month.transactionCount++;

    // Track by category
    const category = tx.type || 'אחר';
    if (!month.byCategory[category]) {
      month.byCategory[category] = { income: 0, expenses: 0, count: 0 };
    }
    month.byCategory[category].income += tx.credit || 0;
    month.byCategory[category].expenses += tx.debit || 0;
    month.byCategory[category].count++;
  });

  const months = Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  res.json({ months });
});

/**
 * Get category breakdown
 * GET /api/finance/categories
 */
exports.getCategoryBreakdown = catchAsync(async (req, res) => {
  const { startDate, endDate, type: filterType } = req.query;

  let query = supabaseAdmin
    .from('bank_transactions')
    .select('type, debit, credit');

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error);
    throw new AppError('Failed to fetch categories', 500);
  }

  // Group by category
  const expenseCategories = new Map();
  const incomeCategories = new Map();

  data.forEach(tx => {
    const category = tx.type || 'אחר';

    if (tx.debit > 0) {
      if (!expenseCategories.has(category)) {
        expenseCategories.set(category, { category, total: 0, count: 0 });
      }
      expenseCategories.get(category).total += tx.debit;
      expenseCategories.get(category).count++;
    }

    if (tx.credit > 0) {
      if (!incomeCategories.has(category)) {
        incomeCategories.set(category, { category, total: 0, count: 0 });
      }
      incomeCategories.get(category).total += tx.credit;
      incomeCategories.get(category).count++;
    }
  });

  const expenses = Array.from(expenseCategories.values()).sort((a, b) => b.total - a.total);
  const income = Array.from(incomeCategories.values()).sort((a, b) => b.total - a.total);

  // Calculate percentages
  const totalExpenses = expenses.reduce((sum, c) => sum + c.total, 0);
  const totalIncome = income.reduce((sum, c) => sum + c.total, 0);

  expenses.forEach(c => {
    c.percentage = totalExpenses > 0 ? ((c.total / totalExpenses) * 100).toFixed(1) : 0;
  });

  income.forEach(c => {
    c.percentage = totalIncome > 0 ? ((c.total / totalIncome) * 100).toFixed(1) : 0;
  });

  res.json({
    expenses,
    income,
    totalExpenses,
    totalIncome
  });
});

/**
 * Get transfer recipients breakdown
 * GET /api/finance/recipients
 */
exports.getRecipients = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = supabaseAdmin
    .from('bank_transactions')
    .select('recipient, debit, type, details')
    .gt('debit', 0);

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recipients:', error);
    throw new AppError('Failed to fetch recipients', 500);
  }

  // Group by recipient
  const recipientMap = new Map();

  data.forEach(tx => {
    // Only count transactions with recipients (transfers)
    if (!tx.recipient) return;

    if (!recipientMap.has(tx.recipient)) {
      recipientMap.set(tx.recipient, {
        recipient: tx.recipient,
        totalAmount: 0,
        transferCount: 0
      });
    }

    recipientMap.get(tx.recipient).totalAmount += tx.debit;
    recipientMap.get(tx.recipient).transferCount++;
  });

  const recipients = Array.from(recipientMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalTransferred = recipients.reduce((sum, r) => sum + r.totalAmount, 0);

  res.json({
    recipients,
    totalTransferred,
    recipientCount: recipients.length
  });
});

/**
 * Get list of imports
 * GET /api/finance/imports
 */
exports.getImports = catchAsync(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('finance_imports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching imports:', error);
    throw new AppError('Failed to fetch imports', 500);
  }

  res.json({ imports: data });
});

/**
 * Delete an import and its transactions
 * DELETE /api/finance/imports/:id
 */
exports.deleteImport = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify import exists
  const { data: importRecord, error: fetchError } = await supabaseAdmin
    .from('finance_imports')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !importRecord) {
    throw new AppError('Import not found', 404);
  }

  // Delete import (cascade will delete transactions)
  const { error: deleteError } = await supabaseAdmin
    .from('finance_imports')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting import:', deleteError);
    throw new AppError('Failed to delete import', 500);
  }

  res.json({ message: 'Import deleted successfully' });
});
