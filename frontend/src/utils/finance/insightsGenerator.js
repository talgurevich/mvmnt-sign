/**
 * Insights Generator
 * Auto-generate financial insights from transaction data
 */

/**
 * Generate insights from transaction data
 */
export function generateInsights(transactions, monthlyData, categoryData) {
  const insights = [];

  if (!transactions || transactions.length === 0) {
    return [{
      type: 'info',
      icon: 'Info',
      title: 'אין נתונים',
      text: 'העלה קובץ Excel כדי לראות תובנות'
    }];
  }

  // Calculate totals
  const totalIncome = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalExpenses = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
  const avgTransaction = totalExpenses / transactions.filter(tx => tx.debit > 0).length;

  // 1. Highest expense month
  if (monthlyData && monthlyData.length > 0) {
    const highestExpenseMonth = monthlyData.reduce((max, m) =>
      m.expenses > max.expenses ? m : max, monthlyData[0]);

    if (highestExpenseMonth.expenses > 0) {
      insights.push({
        type: 'warning',
        icon: 'TrendingUp',
        title: 'החודש עם ההוצאות הגבוהות',
        text: `${highestExpenseMonth.label}: ₪${highestExpenseMonth.expenses.toLocaleString('he-IL')}`
      });
    }

    // Best month (highest income)
    const bestMonth = monthlyData.reduce((max, m) =>
      m.income > max.income ? m : max, monthlyData[0]);

    if (bestMonth.income > 0) {
      insights.push({
        type: 'success',
        icon: 'Star',
        title: 'החודש עם ההכנסות הגבוהות',
        text: `${bestMonth.label}: ₪${bestMonth.income.toLocaleString('he-IL')}`
      });
    }

    // Monthly average expenses
    const avgMonthlyExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length;
    insights.push({
      type: 'info',
      icon: 'Calculate',
      title: 'ממוצע הוצאות חודשי',
      text: `₪${avgMonthlyExpenses.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
    });

    // Monthly average income
    const avgMonthlyIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length;
    insights.push({
      type: 'info',
      icon: 'AccountBalance',
      title: 'ממוצע הכנסות חודשי',
      text: `₪${avgMonthlyIncome.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
    });
  }

  // 2. Top expense category
  if (categoryData && categoryData.length > 0) {
    const topCategory = categoryData[0];
    insights.push({
      type: 'info',
      icon: 'Category',
      title: 'קטגוריית ההוצאות הגדולה',
      text: `${topCategory.category}: ₪${topCategory.total.toLocaleString('he-IL')} (${topCategory.percentage}%)`
    });
  }

  // 3. Large transactions alert
  const largeTransactions = transactions.filter(tx => tx.debit > avgTransaction * 3);
  if (largeTransactions.length > 0) {
    insights.push({
      type: 'alert',
      icon: 'Warning',
      title: 'תנועות חריגות',
      text: `${largeTransactions.length} תנועות גדולות משמעותית מהממוצע`
    });
  }

  // 4. Savings rate (if income > expenses)
  if (totalIncome > totalExpenses) {
    const savingsRate = ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1);
    insights.push({
      type: 'success',
      icon: 'Savings',
      title: 'שיעור חיסכון',
      text: `${savingsRate}% מההכנסות נחסכו`
    });
  } else if (totalExpenses > totalIncome) {
    const deficitRate = ((totalExpenses - totalIncome) / totalIncome * 100).toFixed(1);
    insights.push({
      type: 'error',
      icon: 'TrendingDown',
      title: 'גירעון',
      text: `ההוצאות עולות על ההכנסות ב-${deficitRate}%`
    });
  }

  // 5. Transaction frequency
  const uniqueDates = new Set(transactions.map(tx => tx.transaction_date || tx.dateString || tx.date?.toISOString?.().split('T')[0]));
  const avgTransactionsPerDay = (transactions.length / uniqueDates.size).toFixed(1);
  insights.push({
    type: 'info',
    icon: 'Timeline',
    title: 'תדירות תנועות',
    text: `בממוצע ${avgTransactionsPerDay} תנועות ביום`
  });

  return insights;
}

/**
 * Get insight icon component name
 */
export function getInsightIcon(iconName) {
  const iconMap = {
    'TrendingUp': 'TrendingUp',
    'TrendingDown': 'TrendingDown',
    'Star': 'Star',
    'Calculate': 'Calculate',
    'AccountBalance': 'AccountBalance',
    'Category': 'Category',
    'Warning': 'Warning',
    'Savings': 'Savings',
    'Timeline': 'Timeline',
    'Info': 'Info'
  };
  return iconMap[iconName] || 'Info';
}

/**
 * Get insight color based on type
 */
export function getInsightColor(type) {
  const colorMap = {
    'success': '#00ff88',
    'warning': '#ffce56',
    'error': '#ff6b6b',
    'info': '#00d4ff',
    'alert': '#ff9f40'
  };
  return colorMap[type] || '#00d4ff';
}

export default {
  generateInsights,
  getInsightIcon,
  getInsightColor
};
