/**
 * Data Aggregation Utilities
 * Functions for grouping and aggregating financial data
 */

/**
 * Calculate summary statistics
 */
export function calculateSummary(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      finalBalance: 0,
      transactionCount: 0
    };
  }

  const totalIncome = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalExpenses = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);

  // Sort by date to get the final balance
  const sorted = [...transactions].sort((a, b) => new Date(a.transaction_date || a.date) - new Date(b.transaction_date || b.date));
  const finalBalance = sorted[sorted.length - 1]?.balance || 0;

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    finalBalance,
    transactionCount: transactions.length
  };
}

/**
 * Aggregate transactions by month
 */
export function aggregateByMonth(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const monthlyMap = new Map();

  transactions.forEach(tx => {
    const date = new Date(tx.transaction_date || tx.date);
    if (isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        monthKey,
        label: date.toLocaleString('he-IL', { year: 'numeric', month: 'short' }),
        income: 0,
        expenses: 0,
        balance: 0,
        transactionCount: 0,
        byCategory: {},
        transactions: []
      });
    }

    const month = monthlyMap.get(monthKey);
    month.income += tx.credit || 0;
    month.expenses += tx.debit || 0;
    month.balance = tx.balance; // Last balance of the month
    month.transactionCount++;
    month.transactions.push(tx);

    // Track by category
    const category = tx.type || 'אחר';
    if (!month.byCategory[category]) {
      month.byCategory[category] = { income: 0, expenses: 0, count: 0 };
    }
    month.byCategory[category].income += tx.credit || 0;
    month.byCategory[category].expenses += tx.debit || 0;
    month.byCategory[category].count++;
  });

  return Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * Aggregate transactions by category
 */
export function aggregateByCategory(transactions, type = 'expense') {
  if (!transactions || transactions.length === 0) return [];

  const categoryMap = new Map();

  transactions.forEach(tx => {
    const amount = type === 'expense' ? tx.debit : tx.credit;
    if (!amount || amount <= 0) return;

    const category = tx.type || 'אחר';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, total: 0, count: 0 });
    }

    categoryMap.get(category).total += amount;
    categoryMap.get(category).count++;
  });

  const result = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  // Calculate percentages
  const total = result.reduce((sum, c) => sum + c.total, 0);
  result.forEach(c => {
    c.percentage = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0';
  });

  return result;
}

/**
 * Aggregate transfer recipients
 */
export function aggregateTransferRecipients(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const recipientMap = new Map();

  transactions.forEach(tx => {
    // Only count outgoing transfers with recipients
    if (!tx.recipient || tx.debit <= 0) return;

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

  return Array.from(recipientMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Get top expenses for a period
 */
export function getTopExpenses(transactions, limit = 5) {
  if (!transactions || transactions.length === 0) return [];

  return transactions
    .filter(tx => tx.debit > 0)
    .sort((a, b) => b.debit - a.debit)
    .slice(0, limit);
}

/**
 * Aggregate transactions by week
 */
export function aggregateByWeek(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const weeklyMap = new Map();

  transactions.forEach(tx => {
    const date = new Date(tx.transaction_date || tx.date);
    if (isNaN(date.getTime())) return;

    // Get the start of the week (Sunday)
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        weekKey,
        weekStart,
        label: weekStart.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
        income: 0,
        expenses: 0,
        transactionCount: 0
      });
    }

    const week = weeklyMap.get(weekKey);
    week.income += tx.credit || 0;
    week.expenses += tx.debit || 0;
    week.transactionCount++;
  });

  return Array.from(weeklyMap.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/**
 * Filter transactions by date range
 */
export function filterByDateRange(transactions, startDate, endDate) {
  if (!transactions) return [];

  return transactions.filter(tx => {
    const date = new Date(tx.transaction_date || tx.date);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
  });
}

export default {
  calculateSummary,
  aggregateByMonth,
  aggregateByCategory,
  aggregateTransferRecipients,
  getTopExpenses,
  aggregateByWeek,
  filterByDateRange
};
