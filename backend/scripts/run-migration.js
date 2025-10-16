// Run database migration
require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file')
  console.error('\nTo get your DATABASE_URL:')
  console.error('1. Go to your Supabase project dashboard')
  console.error('2. Navigate to Project Settings → Database')
  console.error('3. Find "Connection string" and copy the "URI" format')
  console.error('4. Add it to your .env file as: DATABASE_URL=your_connection_string')
  console.error('\nThe format should be:')
  console.error('postgresql://postgres:[YOUR-PASSWORD]@db.meqwsahhtxwihdqazesi.supabase.co:5432/postgres')
  process.exit(1)
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function runMigration() {
  const client = await pool.connect()

  try {
    const migrationFile = path.join(__dirname, '../migrations/007_make_file_fields_nullable.sql')
    const sql = fs.readFileSync(migrationFile, 'utf8')

    console.log('Running migration: 007_make_file_fields_nullable.sql')
    console.log('SQL:', sql)
    console.log('\nExecuting...')

    // Run the migration
    await client.query(sql)

    console.log('✅ Migration completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.error('Details:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
