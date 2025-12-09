#!/usr/bin/env node

/**
 * Generate Membership Pie Chart
 *
 * Creates an interactive HTML pie chart showing membership distribution
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');
const fs = require('fs');
const path = require('path');

function normalizeMembershipType(membershipType) {
  if (!membershipType) return 'No Membership';

  const type = membershipType.toLowerCase();

  // Consolidate Lift + Move variations
  if (type.includes('lift') || type.includes('move')) {
    return 'Lift + Move';
  }

  // Consolidate Pilates variations
  if (type.includes('pilates')) {
    return 'Pilates';
  }

  // Consolidate Open Gym variations
  if (type.includes('open') && type.includes('gym')) {
    return 'Open Gym';
  }

  // Consolidate Teens variations
  if (type.includes('teens')) {
    return 'Teens';
  }

  // Consolidate Yoga variations
  if (type.includes('yoga')) {
    return 'Yoga';
  }

  // Consolidate Elite/VIP variations
  if (type.includes('elite') || type.includes('vip')) {
    return 'Elite VIP';
  }

  // Hebrew membership types
  if (type.includes('חיוב')) {
    return 'General Billing (חיוב כללי)';
  }

  if (type.includes('אישיים')) {
    return 'Personal Training (אישיים)';
  }

  if (type.includes('אימון בודד')) {
    return 'Single Session (אימון בודד)';
  }

  if (type.includes('מנוי')) {
    return 'Monthly Membership (מנוי חודשי)';
  }

  // Default: return original if no match
  return membershipType;
}

async function generateMembershipChart() {
  try {
    console.log('Fetching membership data from Arbox...\n');

    const users = await arboxService.getUsers();

    if (!Array.isArray(users)) {
      throw new Error('Invalid response format from Arbox API');
    }

    console.log(`Total users fetched: ${users.length}\n`);

    // Count memberships by type (consolidated)
    const membershipCounts = {};
    users.forEach(user => {
      const originalType = user.membership_type_name || 'No Membership';
      const membershipType = normalizeMembershipType(originalType);
      const isActive = user.active === 1 || user.active === true;

      if (!membershipCounts[membershipType]) {
        membershipCounts[membershipType] = {
          total: 0,
          active: 0
        };
      }
      membershipCounts[membershipType].total++;
      if (isActive) {
        membershipCounts[membershipType].active++;
      }
    });

    // Sort by active count and prepare data
    const sortedData = Object.entries(membershipCounts)
      .sort((a, b) => b[1].active - a[1].active)
      .map(([name, counts]) => ({
        name,
        active: counts.active,
        total: counts.total
      }));

    console.log(`Consolidated into ${sortedData.length} membership categories\n`);

    // Generate colors
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
      '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#E7E9ED', '#71B37C', '#EC6B56', '#FFC870', '#47B881',
      '#5E72E4', '#825EE4', '#E45E82', '#5EACE4', '#E4CE5E',
      '#E45E9D', '#5EE4AC', '#AC5EE4', '#E4AC5E', '#5E9DE4'
    ];

    const labels = sortedData.map(d => d.name);
    const dataValues = sortedData.map(d => d.active);
    const backgroundColors = colors.slice(0, labels.length);

    // Create HTML content
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Membership Distribution - Signing MVMNT</title>
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
            direction: rtl;
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
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .chart-container {
            position: relative;
            height: 500px;
            margin-bottom: 40px;
        }
        .table-container {
            overflow-x: auto;
            margin-top: 40px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        th, td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .color-box {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            margin-left: 10px;
            vertical-align: middle;
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
        <h1>📊 התפלגות מנויים</h1>
        <p class="subtitle">Signing MVMNT - Consolidated Membership Distribution</p>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${users.length}</div>
                <div class="stat-label">סך הכל משתמשים</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sortedData.reduce((sum, d) => sum + d.active, 0)}</div>
                <div class="stat-label">מנויים פעילים</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${sortedData.length}</div>
                <div class="stat-label">סוגי מנויים</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="membershipChart"></canvas>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>צבע</th>
                        <th>סוג מנוי</th>
                        <th>מנויים פעילים</th>
                        <th>סך הכל</th>
                        <th>אחוז</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedData.map((item, index) => {
                        const percentage = ((item.active / users.length) * 100).toFixed(1);
                        return `
                        <tr>
                            <td><span class="color-box" style="background-color: ${backgroundColors[index]}"></span></td>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.active}</td>
                            <td>${item.total}</td>
                            <td>${percentage}%</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')} | Powered by Arbox API
        </div>
    </div>

    <script>
        const ctx = document.getElementById('membershipChart').getContext('2d');

        const data = {
            labels: ${JSON.stringify(labels)},
            datasets: [{
                label: 'Active Members',
                data: ${JSON.stringify(dataValues)},
                backgroundColor: ${JSON.stringify(backgroundColors)},
                borderWidth: 2,
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
                                size: 12
                            },
                            padding: 15,
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
                                return label + ': ' + value + ' (' + percentage + '%)';
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

    // Save HTML file
    const outputPath = path.join(__dirname, '..', 'membership-chart.html');
    fs.writeFileSync(outputPath, html, 'utf8');

    console.log('✅ Pie chart generated successfully!');
    console.log(`📁 File saved to: ${outputPath}`);
    console.log('\n🌐 Open the file in your browser to view the chart\n');

    return outputPath;

  } catch (error) {
    console.error('❌ Error generating chart:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateMembershipChart()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = generateMembershipChart;
