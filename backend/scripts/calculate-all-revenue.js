#!/usr/bin/env node

/**
 * Calculate Total Revenue by Membership Category
 *
 * Analyzes all memberships and calculates revenue breakdown
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');
const fs = require('fs');
const path = require('path');

function parseProductsCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());

  const products = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(',').map(v => v.trim());
    const product = {};
    header.forEach((key, index) => {
      product[key] = values[index] || '';
    });
    products.push(product);
  }

  return products;
}

function normalizeMembershipName(name) {
  if (!name) return '';
  return name.trim().toLowerCase();
}

function matchMembershipToProduct(membershipName, products) {
  const normalized = normalizeMembershipName(membershipName);

  // Try exact match first
  for (const product of products) {
    if (normalizeMembershipName(product['שם']) === normalized) {
      return product;
    }
  }

  // Try fuzzy match
  for (const product of products) {
    const productName = normalizeMembershipName(product['שם']);

    const normalizedClean = normalized
      .replace(/monthly/gi, '')
      .replace(/card/gi, '')
      .replace(/presale/gi, '')
      .trim();

    const productNameClean = productName
      .replace(/monthly/gi, '')
      .replace(/card/gi, '')
      .trim();

    if (normalizedClean.includes(productNameClean) || productNameClean.includes(normalizedClean)) {
      return product;
    }
  }

  return null;
}

function categorizeMembership(membershipName) {
  const name = (membershipName || '').toLowerCase();

  if (name.includes('pilates')) return 'Pilates';
  if (name.includes('lift') || name.includes('move')) return 'Lift + Move';
  if (name.includes('yoga')) return 'Yoga';
  if (name.includes('teen') || name.includes('נוער')) return 'Teens';
  if (name.includes('open gym')) return 'Open Gym';
  if (name.includes('elite') || name.includes('vip')) return 'Elite VIP';

  return 'Other';
}

async function calculateAllRevenue() {
  console.log('💰 Calculating Revenue by Membership Category...\n');

  // Load membership products
  const productsPath = path.join(__dirname, '../membership-products.csv');
  const products = parseProductsCSV(productsPath);

  console.log(`Loaded ${products.length} membership products\n`);

  // Get all users from Arbox
  console.log('Fetching user data from Arbox...');
  const users = await arboxService.getUsers();
  console.log(`Fetched ${users.length} users\n`);

  // Analyze revenue by category
  const categoryRevenue = {
    'Pilates': { members: 0, revenue: 0, breakdown: {} },
    'Lift + Move': { members: 0, revenue: 0, breakdown: {} },
    'Yoga': { members: 0, revenue: 0, breakdown: {} },
    'Teens': { members: 0, revenue: 0, breakdown: {} },
    'Open Gym': { members: 0, revenue: 0, breakdown: {} },
    'Elite VIP': { members: 0, revenue: 0, breakdown: {} },
    'Other': { members: 0, revenue: 0, breakdown: {} }
  };

  let totalRevenue = 0;
  let matchedMembers = 0;
  let unmatchedMembers = [];

  users.forEach(user => {
    const membershipName = user.membership_type_name;
    if (!membershipName) return;

    const category = categorizeMembership(membershipName);
    const product = matchMembershipToProduct(membershipName, products);

    if (product) {
      const price = parseFloat(product['מחיר']) || 0;
      const duration = product['משך זמן'] || '1 חודשים';

      // Calculate monthly revenue
      let monthlyPrice = price;
      if (duration.includes('3')) {
        monthlyPrice = price / 3;
      }

      totalRevenue += monthlyPrice;
      matchedMembers++;

      categoryRevenue[category].members++;
      categoryRevenue[category].revenue += monthlyPrice;

      if (!categoryRevenue[category].breakdown[membershipName]) {
        categoryRevenue[category].breakdown[membershipName] = {
          count: 0,
          pricePerMonth: monthlyPrice,
          totalRevenue: 0
        };
      }

      categoryRevenue[category].breakdown[membershipName].count++;
      categoryRevenue[category].breakdown[membershipName].totalRevenue += monthlyPrice;
    } else {
      unmatchedMembers.push({
        name: `${user.first_name} ${user.last_name}`,
        membership: membershipName
      });
    }
  });

  // Display results
  console.log('═══════════════════════════════════════════════════════');
  console.log('           COMPREHENSIVE REVENUE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📊 Total Active Members: ${users.length}`);
  console.log(`✅ Matched to Products: ${matchedMembers}`);
  console.log(`❌ Unmatched: ${unmatchedMembers.length}\n`);

  console.log(`💰 TOTAL MONTHLY REVENUE: ₪${totalRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`💰 TOTAL ANNUAL REVENUE: ₪${(totalRevenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 2 })}\n`);

  console.log('───────────────────────────────────────────────────────');
  console.log('Revenue by Category:');
  console.log('───────────────────────────────────────────────────────\n');

  // Sort categories by revenue
  const sortedCategories = Object.entries(categoryRevenue)
    .filter(([_, data]) => data.members > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue);

  sortedCategories.forEach(([category, data]) => {
    const percentage = ((data.revenue / totalRevenue) * 100).toFixed(1);
    const avgPerMember = data.members > 0 ? (data.revenue / data.members).toFixed(2) : 0;

    console.log(`📌 ${category}`);
    console.log(`   Members: ${data.members}`);
    console.log(`   Monthly Revenue: ₪${data.revenue.toLocaleString('he-IL', { minimumFractionDigits: 2 })} (${percentage}%)`);
    console.log(`   Annual Revenue: ₪${(data.revenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    console.log(`   Avg per Member: ₪${avgPerMember}/month`);
    console.log('');
  });

  if (unmatchedMembers.length > 0) {
    console.log('───────────────────────────────────────────────────────');
    console.log(`⚠️  Unmatched Members (${unmatchedMembers.length}):`);
    console.log('───────────────────────────────────────────────────────\n');

    const unmatchedByType = {};
    unmatchedMembers.forEach(member => {
      if (!unmatchedByType[member.membership]) {
        unmatchedByType[member.membership] = 0;
      }
      unmatchedByType[member.membership]++;
    });

    Object.entries(unmatchedByType).forEach(([membership, count]) => {
      console.log(`   ${membership}: ${count} members`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Generate HTML report
  generateComprehensiveReport({
    totalMembers: users.length,
    matchedMembers,
    unmatchedMembers: unmatchedMembers.length,
    totalMonthlyRevenue: totalRevenue,
    totalAnnualRevenue: totalRevenue * 12,
    categories: sortedCategories
  });

  return {
    totalRevenue,
    categoryRevenue,
    totalMembers: users.length
  };
}

function generateComprehensiveReport(stats) {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Revenue Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            padding: 40px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .revenue-highlight {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 40px;
        }
        .revenue-amount {
            font-size: 4em;
            font-weight: bold;
            margin: 20px 0;
        }
        .revenue-label {
            font-size: 1.3em;
            opacity: 0.95;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #e9ecef;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 0.95em;
            color: #666;
        }
        .chart-container {
            position: relative;
            height: 500px;
            margin: 40px 0;
        }
        .category-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
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
        .category-name {
            font-weight: 600;
            color: #333;
            font-size: 1.1em;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 דוח הכנסות מקיף</h1>
        <p class="subtitle">Comprehensive Revenue Analysis Report</p>

        <div class="revenue-highlight">
            <div class="revenue-label">סך הכנסות חודשיות</div>
            <div class="revenue-amount">₪${stats.totalMonthlyRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="revenue-label">הכנסה שנתית משוערת: ₪${stats.totalAnnualRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalMembers}</div>
                <div class="stat-label">סך כל החברים</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.matchedMembers}</div>
                <div class="stat-label">חברים תואמים</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">₪${(stats.totalMonthlyRevenue / stats.matchedMembers).toFixed(0)}</div>
                <div class="stat-label">ממוצע לחבר/חודש</div>
            </div>
        </div>

        <h2 style="margin: 30px 0 20px 0; color: #333; text-align: center;">התפלגות הכנסות לפי קטגוריה</h2>

        <div class="chart-container">
            <canvas id="revenueChart"></canvas>
        </div>

        <table class="category-table">
            <thead>
                <tr>
                    <th>קטגוריה</th>
                    <th>מספר חברים</th>
                    <th>הכנסה חודשית</th>
                    <th>הכנסה שנתית</th>
                    <th>ממוצע לחבר</th>
                    <th>אחוז</th>
                </tr>
            </thead>
            <tbody>
                ${stats.categories.map(([category, data]) => {
                    const percentage = ((data.revenue / stats.totalMonthlyRevenue) * 100).toFixed(1);
                    const avgPerMember = data.members > 0 ? (data.revenue / data.members).toFixed(2) : 0;
                    return `
                    <tr>
                        <td class="category-name">${category}</td>
                        <td>${data.members}</td>
                        <td><strong>₪${data.revenue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</strong></td>
                        <td>₪${(data.revenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 2 })}</td>
                        <td>₪${avgPerMember}</td>
                        <td>${percentage}%</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')} | Based on Arbox membership data
        </div>
    </div>

    <script>
        const ctx = document.getElementById('revenueChart').getContext('2d');

        const labels = ${JSON.stringify(stats.categories.map(([cat]) => cat))};
        const revenues = ${JSON.stringify(stats.categories.map(([_, data]) => data.revenue))};
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

        const data = {
            labels: labels,
            datasets: [{
                label: 'Monthly Revenue',
                data: revenues,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 3,
                borderColor: '#fff'
            }]
        };

        const config = {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
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
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ': ₪' + value.toLocaleString('he-IL') + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        };

        new Chart(ctx, config);
    </script>
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'comprehensive-revenue-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('📊 Comprehensive revenue report generated: comprehensive-revenue-report.html\n');
}

// Run the script
if (require.main === module) {
  calculateAllRevenue()
    .then(() => {
      console.log('✅ Revenue calculation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = calculateAllRevenue;
