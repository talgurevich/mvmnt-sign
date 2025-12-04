/**
 * Chart Helpers
 * Formatting utilities for Chart.js visualizations
 */

// Color palette for financial dashboard
export const COLORS = {
  income: '#00ff88',
  incomeBg: 'rgba(0, 255, 136, 0.2)',
  expenses: '#ff6b6b',
  expensesBg: 'rgba(255, 107, 107, 0.2)',
  balance: '#00d4ff',
  balanceBg: 'rgba(0, 212, 255, 0.2)',
  purple: '#a855f7',
  categories: [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#E7E9ED', '#C9CBCF',
    '#11998e', '#38ef7d', '#667eea', '#764ba2'
  ]
};

/**
 * Format monthly data for bar chart
 */
export function formatMonthlyBarChartData(monthlyData) {
  return {
    labels: monthlyData.map(m => m.label),
    datasets: [
      {
        label: 'הכנסות',
        data: monthlyData.map(m => m.income),
        backgroundColor: COLORS.incomeBg,
        borderColor: COLORS.income,
        borderWidth: 2
      },
      {
        label: 'הוצאות',
        data: monthlyData.map(m => m.expenses),
        backgroundColor: COLORS.expensesBg,
        borderColor: COLORS.expenses,
        borderWidth: 2
      }
    ]
  };
}

/**
 * Format balance data for line chart
 */
export function formatBalanceLineChartData(transactions) {
  // Group by date and get last balance
  const balanceByDate = new Map();

  transactions.forEach(tx => {
    const dateStr = tx.transaction_date || tx.dateString || tx.date?.toISOString?.()?.split('T')[0];
    if (dateStr) {
      balanceByDate.set(dateStr, tx.balance);
    }
  });

  const sortedDates = Array.from(balanceByDate.keys()).sort();

  return {
    labels: sortedDates.map(d => {
      const date = new Date(d);
      return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'יתרה',
        data: sortedDates.map(d => balanceByDate.get(d)),
        borderColor: COLORS.balance,
        backgroundColor: COLORS.balanceBg,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5
      }
    ]
  };
}

/**
 * Format category data for pie chart
 */
export function formatPieChartData(categoryData, type = 'expenses') {
  const color = type === 'expenses' ? COLORS.expenses : COLORS.income;

  return {
    labels: categoryData.map(c => c.category),
    datasets: [{
      data: categoryData.map(c => c.total),
      backgroundColor: COLORS.categories.slice(0, categoryData.length),
      borderColor: '#fff',
      borderWidth: 2
    }]
  };
}

/**
 * Get common chart options
 */
export function getChartOptions(title, options = {}) {
  const { rtl = true, showLegend = true, legendPosition = 'bottom' } = options;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        labels: {
          font: { size: 12, family: 'Heebo, Arial' },
          padding: 15,
          usePointStyle: true
        },
        rtl
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 16, family: 'Heebo, Arial', weight: 600 }
      },
      tooltip: {
        rtl,
        textDirection: rtl ? 'rtl' : 'ltr',
        callbacks: {
          label: (context) => {
            const value = context.parsed?.y ?? context.parsed;
            return `${context.dataset?.label || context.label}: ₪${value?.toLocaleString('he-IL') || 0}`;
          }
        }
      }
    }
  };
}

/**
 * Get bar chart options
 */
export function getBarChartOptions(title) {
  return {
    ...getChartOptions(title),
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `₪${value.toLocaleString('he-IL')}`
        }
      }
    }
  };
}

/**
 * Get line chart options
 */
export function getLineChartOptions(title) {
  return {
    ...getChartOptions(title, { showLegend: false }),
    scales: {
      y: {
        ticks: {
          callback: (value) => `₪${value.toLocaleString('he-IL')}`
        }
      }
    }
  };
}

/**
 * Get pie chart options
 */
export function getPieChartOptions(title) {
  return {
    ...getChartOptions(title, { legendPosition: 'right' }),
    plugins: {
      ...getChartOptions(title).plugins,
      tooltip: {
        rtl: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ₪${value.toLocaleString('he-IL')} (${percentage}%)`;
          }
        }
      }
    }
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value) {
  return `₪${(value || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default {
  COLORS,
  formatMonthlyBarChartData,
  formatBalanceLineChartData,
  formatPieChartData,
  getChartOptions,
  getBarChartOptions,
  getLineChartOptions,
  getPieChartOptions,
  formatCurrency
};
