#!/usr/bin/env node

/**
 * Summarize Bank Transactions
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function parseBankTransactions() {
  console.log('💰 Summarizing Bank Transactions...\n');

  const filePath = path.join(__dirname, '../../excelNewTransactions.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  // Parse the transactions (skip header rows)
  const transactions = [];
  let headerFound = false;

  rawData.forEach(row => {
    // Skip until we find the header row
    if (row['__EMPTY'] === 'הפעולה') {
      headerFound = true;
      return;
    }

    // Skip rows before header
    if (!headerFound) return;

    // Parse transaction rows
    const date = row['תנועות בחשבון'];
    const type = row['__EMPTY'];
    const details = row['__EMPTY_1'];
    const reference = row['__EMPTY_2'];
    const debit = row['__EMPTY_3'];
    const credit = row['__EMPTY_4'];
    const balance = row['__EMPTY_5'];

    // Skip empty rows
    if (!date && !type) return;

    transactions.push({
      date: date,
      type: type,
      details: details || '',
      reference: reference,
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
      balance: parseFloat(balance) || 0
    });
  });

  console.log(`✅ Parsed ${transactions.length} transactions\n`);

  // Calculate summary statistics
  const summary = {
    totalTransactions: transactions.length,
    totalDebits: 0,
    totalCredits: 0,
    byCategory: {},
    largestDebit: null,
    largestCredit: null
  };

  transactions.forEach(tx => {
    // Sum debits and credits
    summary.totalDebits += tx.debit;
    summary.totalCredits += tx.credit;

    // Track largest transactions
    if (!summary.largestDebit || tx.debit > summary.largestDebit.amount) {
      if (tx.debit > 0) {
        summary.largestDebit = { amount: tx.debit, details: tx.details, type: tx.type };
      }
    }

    if (!summary.largestCredit || tx.credit > summary.largestCredit.amount) {
      if (tx.credit > 0) {
        summary.largestCredit = { amount: tx.credit, details: tx.details, type: tx.type };
      }
    }

    // Categorize by type
    const category = tx.type || 'Unknown';
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = {
        count: 0,
        totalDebit: 0,
        totalCredit: 0
      };
    }

    summary.byCategory[category].count++;
    summary.byCategory[category].totalDebit += tx.debit;
    summary.byCategory[category].totalCredit += tx.credit;
  });

  // Calculate net change
  summary.netChange = summary.totalCredits - summary.totalDebits;

  // Display summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('         BANK ACCOUNT SUMMARY (LAST 3 MONTHS)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📊 Total Transactions: ${summary.totalTransactions}`);
  console.log(`💰 Total Income (Credits): ₪${summary.totalCredits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`💸 Total Expenses (Debits): ₪${summary.totalDebits.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`📈 Net Change: ₪${summary.netChange.toLocaleString('he-IL', { minimumFractionDigits: 2 })}\n`);

  if (summary.largestCredit) {
    console.log(`💎 Largest Income: ₪${summary.largestCredit.amount.toLocaleString('he-IL')}`);
    console.log(`   ${summary.largestCredit.type} - ${summary.largestCredit.details}\n`);
  }

  if (summary.largestDebit) {
    console.log(`📉 Largest Expense: ₪${summary.largestDebit.amount.toLocaleString('he-IL')}`);
    console.log(`   ${summary.largestDebit.type} - ${summary.largestDebit.details}\n`);
  }

  console.log('───────────────────────────────────────────────────────');
  console.log('Breakdown by Transaction Type:');
  console.log('───────────────────────────────────────────────────────\n');

  // Sort categories by total activity (debits + credits)
  const sortedCategories = Object.entries(summary.byCategory)
    .map(([category, data]) => ({
      category,
      ...data,
      totalActivity: data.totalDebit + data.totalCredit
    }))
    .sort((a, b) => b.totalActivity - a.totalActivity);

  sortedCategories.forEach(cat => {
    console.log(`📌 ${cat.category}`);
    console.log(`   Count: ${cat.count} transactions`);
    if (cat.totalCredit > 0) {
      console.log(`   Income: ₪${cat.totalCredit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    }
    if (cat.totalDebit > 0) {
      console.log(`   Expenses: ₪${cat.totalDebit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════\n');

  // Generate HTML report
  generateTransactionReport(summary, transactions, sortedCategories);

  return { summary, transactions };
}

function generateTransactionReport(summary, transactions, categories) {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bank Account Summary</title>
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
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 50px;
        }
        h1 {
            text-align: center;
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 1.1em;
            margin-bottom: 40px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            padding: 30px;
            border-radius: 15px;
            text-align: center;
        }
        .card-income {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        .card-expense {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
            color: white;
        }
        .card-net {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }
        .card-value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 15px 0;
        }
        .card-label {
            font-size: 1.1em;
            opacity: 0.95;
        }
        .chart-container {
            height: 400px;
            margin: 40px 0;
        }
        .category-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        .category-table th,
        .category-table td {
            padding: 15px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        .category-table th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        .category-table tr:hover {
            background: #f5f5f5;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 סיכום חשבון הבנק</h1>
        <p class="subtitle">Bank Account Summary - Last 3 Months</p>

        <div class="summary-grid">
            <div class="summary-card card-income">
                <div class="card-label">סך הכנסות</div>
                <div class="card-value">₪${summary.totalCredits.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
                <div class="card-label">Total Income</div>
            </div>

            <div class="summary-card card-expense">
                <div class="card-label">סך הוצאות</div>
                <div class="card-value">₪${summary.totalDebits.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
                <div class="card-label">Total Expenses</div>
            </div>

            <div class="summary-card card-net">
                <div class="card-label">שינוי נטו</div>
                <div class="card-value">${summary.netChange >= 0 ? '+' : ''}₪${summary.netChange.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
                <div class="card-label">Net Change</div>
            </div>
        </div>

        <h2 style="text-align: center; margin: 40px 0 20px 0; color: #333;">פירוט לפי סוג תנועה</h2>

        <table class="category-table">
            <thead>
                <tr>
                    <th>סוג תנועה</th>
                    <th>מספר תנועות</th>
                    <th>הכנסות</th>
                    <th>הוצאות</th>
                    <th>סה"כ פעילות</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                <tr>
                    <td><strong>${cat.category}</strong></td>
                    <td>${cat.count}</td>
                    <td style="color: #11998e;">₪${cat.totalCredit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                    <td style="color: #eb3349;">₪${cat.totalDebit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                    <td><strong>₪${cat.totalActivity.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')}<br>
            ${summary.totalTransactions} transactions analyzed
        </div>
    </div>
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'bank-account-summary.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('📊 Bank account summary report generated: bank-account-summary.html\n');
}

// Run the script
if (require.main === module) {
  try {
    parseBankTransactions();
    console.log('✅ Summary complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = parseBankTransactions;
