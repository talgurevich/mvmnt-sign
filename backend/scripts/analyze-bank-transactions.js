#!/usr/bin/env node

/**
 * Analyze Bank Transactions from Excel file
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function analyzeBankTransactions() {
  console.log('📊 Analyzing Bank Transactions...\n');

  // Read the Excel file
  const filePath = path.join(__dirname, '../../excelNewTransactions.xlsx');

  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Total transactions: ${data.length}\n`);

  // Display first few rows to understand structure
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Sample Transactions (First 5):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  data.slice(0, 5).forEach((row, index) => {
    console.log(`Transaction ${index + 1}:`);
    console.log(JSON.stringify(row, null, 2));
    console.log('');
  });

  // Analyze the data structure
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Data Structure:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Columns found:', columns);
    console.log('');
  }

  return data;
}

// Run the script
if (require.main === module) {
  try {
    const data = analyzeBankTransactions();
    console.log('\n✅ Analysis complete!');
    console.log(`Found ${data.length} transactions\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = analyzeBankTransactions;
