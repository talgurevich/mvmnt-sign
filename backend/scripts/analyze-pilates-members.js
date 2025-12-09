#!/usr/bin/env node

/**
 * Analyze Pilates Members Session Registrations
 *
 * Filters for customers with Pilates memberships and shows what sessions they sign up for
 */

const fs = require('fs');
const path = require('path');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Remove BOM if present and parse header
  const header = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/"/g, ''));

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Simple CSV parser (handles quoted values)
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length > 0) {
      const row = {};
      header.forEach((key, index) => {
        row[key] = values[index] || '';
      });
      data.push(row);
    }
  }

  return data;
}

function normalizeSessionType(sessionName) {
  if (!sessionName) return 'Unknown';

  const name = sessionName.trim();

  // Consolidate all Lift sessions (JUST LIFT, LIFT+MOVE, Black Friday)
  if (name.includes('LIFT') || name.includes('lift') || name.toLowerCase().includes('black friday')) {
    return 'LIFT Sessions';
  }

  // Consolidate Pilates variations
  if (name.includes('Pilates') || name.includes('pilates')) {
    return 'Pilates';
  }

  // Consolidate Yoga
  if (name.includes('Yoga') || name.includes('yoga')) {
    return 'Yoga';
  }

  // Consolidate Open Gym
  if (name.includes('Open Gym') || name.includes('open gym')) {
    return 'Open Gym';
  }

  // Keep teen training as is (Hebrew)
  if (name.includes('נוער')) {
    return 'Teen Training (אימון נוער)';
  }

  // Default: return original
  return name;
}

function analyzePilatesMembersRegistrations() {
  console.log('📊 Analyzing Pilates Members Session Registrations...\n');

  // Read the CSV file
  const csvPath = path.join(__dirname, '../../shift-summary-report.csv');
  const data = parseCSV(csvPath);

  console.log(`Total registrations in file: ${data.length}`);

  // Filter for Pilates members only
  const pilatesMemberRegistrations = data.filter(row => {
    const membership = row['חברות'] || '';
    return membership.toLowerCase().includes('pilates');
  });

  console.log(`Pilates member registrations: ${pilatesMemberRegistrations.length}\n`);

  // Count registrations by session type
  const sessionCounts = {};

  pilatesMemberRegistrations.forEach(row => {
    const originalSession = row['שיעור'] || 'Unknown';
    const session = normalizeSessionType(originalSession);
    if (!sessionCounts[session]) {
      sessionCounts[session] = 0;
    }
    sessionCounts[session]++;
  });

  // Sort by count
  const sortedSessions = Object.entries(sessionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Display summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Pilates Members - Session Registration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  sortedSessions.forEach(session => {
    const percentage = ((session.count / pilatesMemberRegistrations.length) * 100).toFixed(1);
    console.log(`${session.name}: ${session.count} registrations (${percentage}%)`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    totalRegistrations: pilatesMemberRegistrations.length,
    sessionCounts: sortedSessions,
    pilatesMemberCount: new Set(pilatesMemberRegistrations.map(r => r['שם'])).size
  };
}

function generatePilatesMembersPieChart(stats) {
  console.log('🎨 Generating Pilates members pie chart...\n');

  const labels = stats.sessionCounts.map(s => s.name);
  const dataValues = stats.sessionCounts.map(s => s.count);

  // Colors for the chart
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];

  const backgroundColors = colors.slice(0, labels.length);

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pilates Members - Session Registrations</title>
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
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 1em;
            opacity: 0.9;
        }
        .chart-container {
            position: relative;
            height: 600px;
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
            padding: 15px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: 600;
            font-size: 1.1em;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .color-box {
            display: inline-block;
            width: 25px;
            height: 25px;
            border-radius: 4px;
            margin-left: 10px;
            vertical-align: middle;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9em;
        }
        .session-name {
            font-weight: 600;
            font-size: 1.1em;
            color: #333;
        }
        .insight-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 5px;
        }
        .insight-box h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .insight-box p {
            color: #555;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 התפלגות השיעורים של מנויי פילאטיס</h1>
        <p class="subtitle">Pilates Members - Session Registration Analysis</p>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalRegistrations}</div>
                <div class="stat-label">סך הכל הרשמות של מנויי פילאטיס</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.pilatesMemberCount}</div>
                <div class="stat-label">מנויי פילאטיס ייחודיים</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.sessionCounts.length}</div>
                <div class="stat-label">סוגי שיעורים שונים</div>
            </div>
        </div>

        <div class="insight-box">
            <h3>💡 תובנה מרכזית</h3>
            <p>
                מנויי פילאטיס נרשמו ל-${stats.totalRegistrations} שיעורים בחודש האחרון.
                ${stats.sessionCounts[0] ? `השיעור הפופולרי ביותר בקרב מנויי פילאטיס הוא <strong>${stats.sessionCounts[0].name}</strong> עם ${stats.sessionCounts[0].count} הרשמות (${((stats.sessionCounts[0].count / stats.totalRegistrations) * 100).toFixed(1)}%).` : ''}
            </p>
        </div>

        <div class="chart-container">
            <canvas id="pilatesChart"></canvas>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>צבע</th>
                        <th>שם השיעור</th>
                        <th>מספר הרשמות</th>
                        <th>אחוז</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.sessionCounts.map((session, index) => {
                        const percentage = ((session.count / stats.totalRegistrations) * 100).toFixed(1);
                        return `
                        <tr>
                            <td><span class="color-box" style="background-color: ${backgroundColors[index]}"></span></td>
                            <td><span class="session-name">${session.name}</span></td>
                            <td><strong>${session.count}</strong></td>
                            <td>${percentage}%</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString('he-IL')} | Pilates Members Analysis from Arbox Data
        </div>
    </div>

    <script>
        const ctx = document.getElementById('pilatesChart').getContext('2d');

        const data = {
            labels: ${JSON.stringify(labels)},
            datasets: [{
                label: 'Pilates Member Registrations',
                data: ${JSON.stringify(dataValues)},
                backgroundColor: ${JSON.stringify(backgroundColors)},
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
                                size: 14,
                                family: 'Arial'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ': ' + value + ' הרשמות (' + percentage + '%)';
                            }
                        },
                        titleFont: {
                            size: 16
                        },
                        bodyFont: {
                            size: 14
                        },
                        padding: 12
                    }
                }
            }
        };

        new Chart(ctx, config);
    </script>
</body>
</html>`;

  // Save HTML file
  const outputPath = path.join(__dirname, '..', 'pilates-members-chart.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log('✅ Pilates members pie chart generated successfully!');
  console.log(`📁 File saved to: ${outputPath}\n`);

  return outputPath;
}

// Run the script
if (require.main === module) {
  try {
    const stats = analyzePilatesMembersRegistrations();
    const chartPath = generatePilatesMembersPieChart(stats);

    console.log('✅ Analysis complete!');
    console.log(`\n🌐 Open ${chartPath} in your browser to view the chart\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { analyzePilatesMembersRegistrations, generatePilatesMembersPieChart };
