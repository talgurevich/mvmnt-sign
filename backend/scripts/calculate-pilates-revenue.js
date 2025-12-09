#!/usr/bin/env node

/**
 * Calculate Pilates Revenue
 *
 * Analyzes Arbox membership data and calculates revenue from Pilates memberships
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

  // Try fuzzy match - check if product name is contained in membership name or vice versa
  for (const product of products) {
    const productName = normalizeMembershipName(product['שם']);

    // Remove common variations for matching
    const normalizedClean = normalized
      .replace(/monthly/gi, '')
      .replace(/card/gi, '')
      .replace(/presale/gi, '')
      .trim();

    const productNameClean = productName
      .replace(/monthly/gi, '')
      .replace(/card/gi, '')
      .trim();

    // Check if the core membership type matches
    if (normalizedClean.includes(productNameClean) || productNameClean.includes(normalizedClean)) {
      return product;
    }
  }

  return null;
}

async function calculatePilatesRevenue() {
  console.log('💰 Calculating Pilates Revenue...\n');

  // Load membership products
  const productsPath = path.join(__dirname, '../membership-products.csv');
  const products = parseProductsCSV(productsPath);

  console.log(`Loaded ${products.length} membership products\n`);

  // Get all users from Arbox
  console.log('Fetching user data from Arbox...');
  const users = await arboxService.getUsers();
  console.log(`Fetched ${users.length} users\n`);

  // Filter for Pilates members
  const pilatesMembers = users.filter(user => {
    const membership = user.membership_type_name || '';
    return membership.toLowerCase().includes('pilates');
  });

  console.log(`Found ${pilatesMembers.length} Pilates members\n`);

  // Analyze revenue
  const revenueBreakdown = {};
  let totalRevenue = 0;
  let matchedMembers = 0;
  let unmatchedMembers = [];

  pilatesMembers.forEach(user => {
    const membershipName = user.membership_type_name;
    const product = matchMembershipToProduct(membershipName, products);

    if (product) {
      const price = parseFloat(product['מחיר']) || 0;
      const duration = product['משך זמן'] || '1 חודשים';

      // Calculate monthly revenue (if it's a 3-month package, divide by 3)
      let monthlyPrice = price;
      if (duration.includes('3')) {
        monthlyPrice = price / 3;
      }

      totalRevenue += monthlyPrice;
      matchedMembers++;

      if (!revenueBreakdown[membershipName]) {
        revenueBreakdown[membershipName] = {
          count: 0,
          pricePerMonth: monthlyPrice,
          totalRevenue: 0,
          productName: product['שם']
        };
      }

      revenueBreakdown[membershipName].count++;
      revenueBreakdown[membershipName].totalRevenue += monthlyPrice;
    } else {
      unmatchedMembers.push({
        name: `${user.first_name} ${user.last_name}`,
        membership: membershipName,
        email: user.email
      });
    }
  });

  // Display results
  console.log('═══════════════════════════════════════════════════════');
  console.log('           PILATES REVENUE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📊 Total Pilates Members: ${pilatesMembers.length}`);
  console.log(`✅ Matched to Products: ${matchedMembers}`);
  console.log(`❌ Unmatched: ${unmatchedMembers.length}\n`);

  console.log(`💰 MONTHLY REVENUE FROM PILATES: ₪${totalRevenue.toFixed(2)}`);
  console.log(`💰 ANNUAL REVENUE PROJECTION: ₪${(totalRevenue * 12).toFixed(2)}\n`);

  console.log('───────────────────────────────────────────────────────');
  console.log('Revenue Breakdown by Membership Type:');
  console.log('───────────────────────────────────────────────────────\n');

  // Sort by revenue
  const sortedBreakdown = Object.entries(revenueBreakdown)
    .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);

  sortedBreakdown.forEach(([membershipName, data]) => {
    const percentage = ((data.totalRevenue / totalRevenue) * 100).toFixed(1);
    console.log(`📌 ${membershipName}`);
    console.log(`   Members: ${data.count}`);
    console.log(`   Price per member: ₪${data.pricePerMonth}/month`);
    console.log(`   Total revenue: ₪${data.totalRevenue.toFixed(2)}/month (${percentage}%)`);
    console.log('');
  });

  if (unmatchedMembers.length > 0) {
    console.log('───────────────────────────────────────────────────────');
    console.log('⚠️  Unmatched Members (no pricing data):');
    console.log('───────────────────────────────────────────────────────\n');

    unmatchedMembers.forEach(member => {
      console.log(`   ${member.name} - ${member.membership}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Generate HTML report
  generateRevenueReport({
    totalMembers: pilatesMembers.length,
    matchedMembers,
    unmatchedMembers: unmatchedMembers.length,
    monthlyRevenue: totalRevenue,
    annualRevenue: totalRevenue * 12,
    breakdown: sortedBreakdown
  });

  return {
    totalMembers: pilatesMembers.length,
    monthlyRevenue: totalRevenue,
    annualRevenue: totalRevenue * 12,
    breakdown: revenueBreakdown
  };
}

function generateRevenueReport(stats) {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pilates Revenue Report</title>
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
            max-width: 1200px;
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
        .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .breakdown-table th,
        .breakdown-table td {
            padding: 15px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        .breakdown-table th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        .breakdown-table tr:hover {
            background: #f5f5f5;
        }
        .membership-name {
            font-weight: 600;
            color: #333;
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
        <h1>💰 דוח הכנסות פילאטיס</h1>
        <p class="subtitle">Pilates Revenue Analysis Report</p>

        <div class="revenue-highlight">
            <div class="revenue-label">הכנסה חודשית מפילאטיס</div>
            <div class="revenue-amount">₪${stats.monthlyRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="revenue-label">הכנסה שנתית משוערת: ₪${stats.annualRevenue.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalMembers}</div>
                <div class="stat-label">סך מנויי פילאטיס</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.matchedMembers}</div>
                <div class="stat-label">מנויים תואמים למוצר</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">₪${(stats.monthlyRevenue / stats.matchedMembers).toFixed(0)}</div>
                <div class="stat-label">ממוצע לחבר</div>
            </div>
        </div>

        <h2 style="margin: 30px 0 20px 0; color: #333;">פירוט הכנסות לפי סוג מנוי</h2>

        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>סוג מנוי</th>
                    <th>מספר חברים</th>
                    <th>מחיר לחבר/חודש</th>
                    <th>סך הכנסה חודשית</th>
                    <th>אחוז</th>
                </tr>
            </thead>
            <tbody>
                ${stats.breakdown.map(([name, data]) => {
                    const percentage = ((data.totalRevenue / stats.monthlyRevenue) * 100).toFixed(1);
                    return `
                    <tr>
                        <td class="membership-name">${name}</td>
                        <td>${data.count}</td>
                        <td>₪${data.pricePerMonth.toFixed(2)}</td>
                        <td><strong>₪${data.totalRevenue.toFixed(2)}</strong></td>
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
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'pilates-revenue-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('📊 Revenue report generated: pilates-revenue-report.html\n');
}

// Run the script
if (require.main === module) {
  calculatePilatesRevenue()
    .then((stats) => {
      console.log('✅ Revenue calculation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = calculatePilatesRevenue;
