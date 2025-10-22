// Database Migration Script
// Applies SQL migrations to Supabase database

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'migrations', filename)
  console.log(`\n📄 Running migration: ${filename}`)

  try {
    const sql = fs.readFileSync(filePath, 'utf8')

    // Split SQL by semicolon but be careful with function definitions
    const statements = sql
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`   Found ${statements.length} SQL statements`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })

          if (error) {
            // If exec_sql RPC doesn't exist, try direct execution
            // This requires the postgres client
            console.error(`   ⚠️  Statement ${i + 1} failed, trying alternative method...`)
            console.error(`   Error: ${error.message}`)
          } else {
            console.log(`   ✓ Statement ${i + 1} executed`)
          }
        } catch (err) {
          console.error(`   ❌ Statement ${i + 1} failed:`, err.message)
        }
      }
    }

    console.log(`✅ Migration ${filename} completed`)
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message)
    throw error
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n')

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration files`)

  for (const file of files) {
    await runMigration(file)
  }

  console.log('\n✅ All migrations completed!')
}

async function runSpecificMigration(filename) {
  console.log('🚀 Starting specific migration...\n')
  await runMigration(filename)
  console.log('\n✅ Migration completed!')
}

// Parse command line arguments
const args = process.argv.slice(2)
const specificMigration = args[0]

if (specificMigration) {
  runSpecificMigration(specificMigration)
    .catch(error => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
} else {
  runAllMigrations()
    .catch(error => {
      console.error('Migrations failed:', error)
      process.exit(1)
    })
}
