#!/usr/bin/env node

/**
 * Revenue Pie Chart by Membership Category
 *
 * Creates a clean pie chart showing revenue distribution by membership type
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');
const fs = require('fs');
const path = require('path');

function parseProductsCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

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
  if (name.includes('open gym') || name.includes('open_gym')) return 'Open Gym';
  if (name.includes('elite') || name.includes('vip')) return 'Elite VIP';
  if (name.includes('חיוב')) return 'General Billing';
  if (name.includes('אישיים')) return 'Personal Training';
  if (name.includes('אימון בודד')) return 'Single Sessions';

  return 'Other';
}

// Estimated prices for unmatched memberships (based on market rates)
const ESTIMATED_PRICES = {
  'Teens': 200,  // Estimated teen membership
  'Open Gym': 150,  // Estimated open gym access
  'Elite VIP': 0,  // Free membership
  'General Billing': 0,  // General billing - varies
  'Personal Training': 0,  // Personal training - varies
  'Single Sessions': 0,  // Single sessions - varies
  'Other': 0
};

async function calculateRevenuePieChart() {
  console.log('💰 Calculating Revenue by Category for Pie Chart...\n');

  // Load membership products
  const productsPath = path.join(__dirname, '../membership-products.csv');
  const products = parseProductsCSV(productsPath);

  // Get all users from Arbox
  console.log('Fetching user data from Arbox...');
  const users = await arboxService.getUsers();
  console.log(`Fetched ${users.length} users\n`);

  // Analyze revenue by category
  const categoryData = {};

  users.forEach(user => {
    const membershipName = user.membership_type_name;
    if (!membershipName) return;

    const category = categorizeMembership(membershipName);
    const product = matchMembershipToProduct(membershipName, products);

    let monthlyPrice = 0;

    if (product) {
      const price = parseFloat(product['מחיר']) || 0;
      const duration = product['משך זמן'] || '1 חודשים';

      monthlyPrice = price;
      if (duration.includes('3')) {
        monthlyPrice = price / 3;
      }
    } else {
      // Use estimated price for unmatched categories
      monthlyPrice = ESTIMATED_PRICES[category] || 0;
    }

    if (!categoryData[category]) {
      categoryData[category] = {
        members: 0,
        revenue: 0,
        matched: 0,
        estimated: 0
      };
    }

    categoryData[category].members++;
    categoryData[category].revenue += monthlyPrice;

    if (product) {
      categoryData[category].matched++;
    } else {
      categoryData[category].estimated++;
    }
  });

  // Sort by revenue
  const sortedCategories = Object.entries(categoryData)
    .filter(([_, data]) => data.revenue > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue);

  const totalRevenue = sortedCategories.reduce((sum, [_, data]) => sum + data.revenue, 0);
  const totalMembers = sortedCategories.reduce((sum, [_, data]) => sum + data.members, 0);

  // Display results
  console.log('═══════════════════════════════════════════════════════');
  console.log('       MONTHLY INCOME BY MEMBERSHIP CATEGORY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`💰 TOTAL MONTHLY INCOME: ₪${totalRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`💰 ANNUAL INCOME PROJECTION: ₪${(totalRevenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
  console.log(`📊 Total Members: ${totalMembers}\n`);

  console.log('───────────────────────────────────────────────────────');
  console.log('Breakdown by Category:');
  console.log('───────────────────────────────────────────────────────\n');

  sortedCategories.forEach(([category, data]) => {
    const percentage = ((data.revenue / totalRevenue) * 100).toFixed(1);
    console.log(`📌 ${category}`);
    console.log(`   Members: ${data.members}`);
    console.log(`   Monthly Income: ₪${data.revenue.toLocaleString('he-IL', { minimumFractionDigits: 2 })} (${percentage}%)`);
    console.log(`   Annual Income: ₪${(data.revenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`);
    if (data.estimated > 0) {
      console.log(`   ⚠️  ${data.estimated} members with estimated pricing`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════\n');

  // Generate pie chart
  generateIncomePieChart({
    totalRevenue,
    annualRevenue: totalRevenue * 12,
    totalMembers,
    categories: sortedCategories
  });

  return { totalRevenue, categoryData };
}

function generateIncomePieChart(stats) {
  const labels = stats.categories.map(([cat]) => cat);
  const revenues = stats.categories.map(([_, data]) => data.revenue);
  const members = stats.categories.map(([_, data]) => data.members);

  const colors = [
    '#FF6384',  // Pink/Red - Lift + Move
    '#36A2EB',  // Blue - Pilates
    '#FFCE56',  // Yellow - Teens
    '#4BC0C0',  // Teal - Yoga
    '#9966FF',  // Purple - Open Gym
    '#FF9F40',  // Orange - Elite VIP
    '#C9CBCF',  // Gray - Other
    '#71B37C'   // Green
  ];

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Income by Membership Category</title>
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
            margin-bottom: 10px;
            font-size: 3em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 40px;
            font-size: 1.2em;
        }
        .revenue-hero {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 50px;
            border-radius: 20px;
            text-align: center;
            margin-bottom: 50px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .revenue-main {
            font-size: 5em;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .revenue-label {
            font-size: 1.5em;
            opacity: 0.95;
            margin-bottom: 10px;
        }
        .revenue-annual {
            font-size: 1.3em;
            opacity: 0.9;
            margin-top: 20px;
        }
        .chart-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 50px 0;
            align-items: start;
        }
        .chart-container {
            position: relative;
            height: 600px;
        }
        .breakdown-section {
            padding: 20px;
        }
        .breakdown-section h2 {
            color: #333;
            margin-bottom: 30px;
            font-size: 2em;
        }
        .category-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            border-left: 6px solid;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .category-card:hover {
            transform: translateX(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .category-name {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }
        .category-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            display: flex;
            flex-direction: column;
        }
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        .percentage-badge {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 1.1em;
            font-weight: bold;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            color: #666;
            font-size: 1em;
            padding-top: 30px;
            border-top: 2px solid #e9ecef;
        }
        @media (max-width: 1200px) {
            .chart-section {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 הכנסות לפי סוג מנוי</h1>
        <p class="subtitle">Total Income by Membership Category</p>

        <div class="revenue-hero">
            <div class="revenue-label">סך הכנסות חודשיות</div>
            <div class="revenue-main">₪${stats.totalRevenue.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="revenue-annual">הכנסה שנתית משוערת: ₪${stats.annualRevenue.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="revenue-annual">${stats.totalMembers} חברים פעילים</div>
        </div>

        <div class="chart-section">
            <div class="chart-container">
                <canvas id="incomeChart"></canvas>
            </div>

            <div class="breakdown-section">
                <h2>פירוט מפורט</h2>
                ${stats.categories.map(([category, data], index) => {
                    const percentage = ((data.revenue / stats.totalRevenue) * 100).toFixed(1);
                    const avgPerMember = (data.revenue / data.members).toFixed(0);
                    return `
                    <div class="category-card" style="border-left-color: ${colors[index]}">
                        <div class="category-name">${category}</div>
                        <div class="category-stats">
                            <div class="stat-item">
                                <div class="stat-value">₪${data.revenue.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
                                <div class="stat-label">הכנסה חודשית</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${data.members}</div>
                                <div class="stat-label">מספר חברים</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">₪${avgPerMember}</div>
                                <div class="stat-label">ממוצע לחבר</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">₪${(data.revenue * 12).toLocaleString('he-IL', { minimumFractionDigits: 0 })}</div>
                                <div class="stat-label">הכנסה שנתית</div>
                            </div>
                        </div>
                        <div class="percentage-badge">${percentage}% מסך ההכנסות</div>
                        ${data.estimated > 0 ? `<div style="margin-top: 10px; color: #856404; font-size: 0.9em;">⚠️ ${data.estimated} חברים עם תמחור משוער</div>` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')} | Based on Arbox membership data<br>
            <em style="color: #999; font-size: 0.9em;">Revenue includes both actual pricing and estimates for special memberships</em>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('incomeChart').getContext('2d');

        const data = {
            labels: ${JSON.stringify(labels)},
            datasets: [{
                label: 'Monthly Income',
                data: ${JSON.stringify(revenues)},
                backgroundColor: ${JSON.stringify(colors.slice(0, labels.length))},
                borderWidth: 4,
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
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 16,
                                family: 'Arial'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: label + ' (' + percentage + '%)',
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const members = ${JSON.stringify(members)}[context.dataIndex];
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return [
                                    label,
                                    'הכנסה: ₪' + value.toLocaleString('he-IL'),
                                    'חברים: ' + members,
                                    'אחוז: ' + percentage + '%'
                                ];
                            }
                        },
                        titleFont: {
                            size: 18
                        },
                        bodyFont: {
                            size: 16
                        },
                        padding: 15,
                        displayColors: true,
                        boxWidth: 15,
                        boxHeight: 15
                    }
                }
            }
        };

        new Chart(ctx, config);
    </script>
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'income-by-category-pie.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('📊 Income pie chart generated: income-by-category-pie.html\n');
  return outputPath;
}

// Run the script
if (require.main === module) {
  calculateRevenuePieChart()
    .then(() => {
      console.log('✅ Income pie chart generation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = calculateRevenuePieChart;
