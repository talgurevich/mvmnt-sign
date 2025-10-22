// Simple Migration Runner for Supabase
// Executes SQL migrations using Supabase REST API

const fs = require('fs')
const path = require('path')
const https = require('https')
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file')
  process.exit(1)
}

// Extract project reference from URL (e.g., https://abc123.supabase.co -> abc123)
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Could not extract project reference from SUPABASE_URL')
  process.exit(1)
}

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      }
    }

    const req = https.request(url, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data })
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(JSON.stringify({ query: sql }))
    req.end()
  })
}

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'migrations', filename)
  console.log(`\n📄 Running migration: ${filename}`)

  try {
    const sql = fs.readFileSync(filePath, 'utf8')

    console.log('   Executing SQL...')
    await executeSql(sql)

    console.log(`✅ Migration ${filename} completed successfully`)
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`)
    console.error(error.message)
    throw error
  }
}

// Get migration file from command line
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>')
  console.error('Example: node run-migration.js 003_update_form_templates_schema.sql')
  process.exit(1)
}

console.log('🚀 Starting migration...\n')
console.log(`Project: ${projectRef}`)

runMigration(migrationFile)
  .then(() => {
    console.log('\n✅ Migration completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  })
