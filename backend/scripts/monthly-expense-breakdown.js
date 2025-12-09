#!/usr/bin/env node

/**
 * Monthly Expense Breakdown
 * Analyzes bank transactions by month
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function excelDateToJSDate(excelDate) {
  // Excel dates are days since 1900-01-01
  const millisPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  return new Date(excelEpoch.getTime() + excelDate * millisPerDay);
}

function getMonthYear(excelDate) {
  if (!excelDate) return 'Unknown';

  const date = excelDateToJSDate(excelDate);
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `${monthName} ${year}`;
}

function getMonthKey(excelDate) {
  if (!excelDate) return 'Unknown';
  const date = excelDateToJSDate(excelDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthlyTransactions() {
  console.log('📊 Creating Monthly Expense Breakdown...\n');

  const filePath = path.join(__dirname, '../../excelNewTransactions.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json(worksheet);

  // Parse transactions
  const transactions = [];
  let headerFound = false;

  rawData.forEach(row => {
    if (row['__EMPTY'] === 'הפעולה') {
      headerFound = true;
      return;
    }

    if (!headerFound) return;

    const date = row['תנועות בחשבון'];
    const type = row['__EMPTY'];
    const details = row['__EMPTY_1'];
    const debit = parseFloat(row['__EMPTY_3']) || 0;
    const credit = parseFloat(row['__EMPTY_4']) || 0;

    if (!date && !type) return;

    transactions.push({
      date: date,
      monthKey: getMonthKey(date),
      monthYear: getMonthYear(date),
      type: type,
      details: details || '',
      debit: debit,
      credit: credit
    });
  });

  console.log(`✅ Parsed ${transactions.length} transactions\n`);

  // Group by month
  const monthlyData = {};

  transactions.forEach(tx => {
    const month = tx.monthKey;

    if (!monthlyData[month]) {
      monthlyData[month] = {
        monthKey: month,
        monthYear: tx.monthYear,
        transactions: [],
        totalIncome: 0,
        totalExpenses: 0,
        byCategory: {}
      };
    }

    monthlyData[month].transactions.push(tx);
    monthlyData[month].totalIncome += tx.credit;
    monthlyData[month].totalExpenses += tx.debit;

    // Categorize
    const category = tx.type || 'Unknown';
    if (!monthlyData[month].byCategory[category]) {
      monthlyData[month].byCategory[category] = {
        count: 0,
        income: 0,
        expenses: 0
      };
    }

    monthlyData[month].byCategory[category].count++;
    monthlyData[month].byCategory[category].income += tx.credit;
    monthlyData[month].byCategory[category].expenses += tx.debit;
  });

  // Sort months chronologically
  const sortedMonths = Object.values(monthlyData).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  // Calculate net change for each month
  sortedMonths.forEach(month => {
    month.netChange = month.totalIncome - month.totalExpenses;
  });

  // Display summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('           MONTHLY EXPENSE BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════\n');

  sortedMonths.forEach(month => {
    console.log(`📅 ${month.monthYear}`);
    console.log(`   Transactions: ${month.transactions.length}`);
    console.log(`   Income: ₪${month.totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    console.log(`   Expenses: ₪${month.totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    console.log(`   Net: ${month.netChange >= 0 ? '+' : ''}₪${month.netChange.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    console.log('');
  });

  // Calculate totals and averages
  const totalIncome = sortedMonths.reduce((sum, m) => sum + m.totalIncome, 0);
  const totalExpenses = sortedMonths.reduce((sum, m) => sum + m.totalExpenses, 0);
  const avgMonthlyIncome = totalIncome / sortedMonths.length;
  const avgMonthlyExpenses = totalExpenses / sortedMonths.length;

  console.log('───────────────────────────────────────────────────────');
  console.log('SUMMARY:');
  console.log('───────────────────────────────────────────────────────\n');
  console.log(`📊 Number of Months: ${sortedMonths.length}`);
  console.log(`💰 Total Income: ₪${totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`💸 Total Expenses: ₪${totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`📈 Average Monthly Income: ₪${avgMonthlyIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`📉 Average Monthly Expenses: ₪${avgMonthlyExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════\n');

  // Generate HTML report
  generateMonthlyReport(sortedMonths, {
    totalIncome,
    totalExpenses,
    avgMonthlyIncome,
    avgMonthlyExpenses
  });

  return sortedMonths;
}

function generateMonthlyReport(months, summary) {
  const monthLabels = months.map(m => m.monthYear);
  const incomeData = months.map(m => m.totalIncome);
  const expenseData = months.map(m => m.totalExpenses);
  const netData = months.map(m => m.netChange);

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Expense Breakdown</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 50px;
        }
        h1 {
            text-align: center;
            color: #333;
            font-size: 3em;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 1.2em;
            margin-bottom: 40px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 50px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
        }
        .card-value {
            font-size: 2em;
            font-weight: bold;
            margin: 15px 0;
        }
        .card-label {
            font-size: 1em;
            opacity: 0.95;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
            margin: 40px 0;
        }
        .chart-container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            height: 450px;
        }
        .chart-title {
            font-size: 1.5em;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
        }
        .monthly-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
        }
        .monthly-table th,
        .monthly-table td {
            padding: 15px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        .monthly-table th {
            background: #667eea;
            color: white;
            font-weight: 600;
            font-size: 1.1em;
        }
        .monthly-table tr:hover {
            background: #f5f5f5;
        }
        .positive {
            color: #11998e;
            font-weight: bold;
        }
        .negative {
            color: #eb3349;
            font-weight: bold;
        }
        .month-details {
            margin-top: 50px;
        }
        .month-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .month-card h3 {
            color: #667eea;
            font-size: 2em;
            margin-bottom: 20px;
        }
        .category-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .category-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .category-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
        }
        .category-stats {
            font-size: 0.9em;
            color: #666;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e9ecef;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 פירוט הוצאות חודשי</h1>
        <p class="subtitle">Monthly Expense Breakdown - Last 3 Months</p>

        <div class="summary-cards">
            <div class="summary-card">
                <div class="card-label">ממוצע הכנסות חודשי</div>
                <div class="card-value">₪${summary.avgMonthlyIncome.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">ממוצע הוצאות חודשי</div>
                <div class="card-value">₪${summary.avgMonthlyExpenses.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">סך הכנסות (3 חודשים)</div>
                <div class="card-value">₪${summary.totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">סך הוצאות (3 חודשים)</div>
                <div class="card-value">₪${summary.totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container">
                <div class="chart-title">מגמת הכנסות והוצאות חודשית</div>
                <canvas id="trendChart" style="height: 350px;"></canvas>
            </div>
        </div>

        <h2 style="text-align: center; margin: 40px 0; color: #333;">פירוט חודשי מפורט</h2>

        <table class="monthly-table">
            <thead>
                <tr>
                    <th>חודש</th>
                    <th>תנועות</th>
                    <th>הכנסות</th>
                    <th>הוצאות</th>
                    <th>נטו</th>
                </tr>
            </thead>
            <tbody>
                ${months.map(month => `
                <tr>
                    <td><strong>${month.monthYear}</strong></td>
                    <td>${month.transactions.length}</td>
                    <td class="positive">₪${month.totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                    <td class="negative">₪${month.totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                    <td class="${month.netChange >= 0 ? 'positive' : 'negative'}">${month.netChange >= 0 ? '+' : ''}₪${month.netChange.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="month-details">
            <h2 style="text-align: center; margin-bottom: 30px; color: #333;">פירוט לפי קטגוריה בכל חודש</h2>
            ${months.map(month => {
                const categories = Object.entries(month.byCategory)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));

                return `
                <div class="month-card">
                    <h3>${month.monthYear}</h3>
                    <div class="category-list">
                        ${categories.map(cat => `
                        <div class="category-item">
                            <div class="category-name">${cat.name}</div>
                            <div class="category-stats">
                                ${cat.count} תנועות
                                ${cat.income > 0 ? `<br>הכנסות: <span class="positive">₪${cat.income.toLocaleString('he-IL')}</span>` : ''}
                                ${cat.expenses > 0 ? `<br>הוצאות: <span class="negative">₪${cat.expenses.toLocaleString('he-IL')}</span>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')}<br>
            ${months.reduce((sum, m) => sum + m.transactions.length, 0)} total transactions across ${months.length} months
        </div>
    </div>

    <script>
        // Trend Chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');

        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(monthLabels)},
                datasets: [
                    {
                        label: 'הכנסות',
                        data: ${JSON.stringify(incomeData)},
                        borderColor: '#11998e',
                        backgroundColor: 'rgba(17, 153, 142, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 3
                    },
                    {
                        label: 'הוצאות',
                        data: ${JSON.stringify(expenseData)},
                        borderColor: '#eb3349',
                        backgroundColor: 'rgba(235, 51, 73, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 3
                    },
                    {
                        label: 'נטו',
                        data: ${JSON.stringify(netData)},
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 14
                            },
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₪' + context.parsed.y.toLocaleString('he-IL');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₪' + value.toLocaleString('he-IL');
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'monthly-expense-breakdown.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('📊 Monthly expense breakdown report generated: monthly-expense-breakdown.html\n');
}

// Run the script
if (require.main === module) {
  try {
    parseMonthlyTransactions();
    console.log('✅ Monthly breakdown complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = parseMonthlyTransactions;
