// Temporary migration routes - can be removed after migrations are complete
const express = require('express')
const router = express.Router()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Admin-only migration endpoint (temporary)
router.post('/run-007', async (req, res) => {
  try {
    // Basic auth check - you can strengthen this
    const authHeader = req.headers.authorization
    if (!authHeader || authHeader !== `Bearer ${process.env.MIGRATION_SECRET || 'temp-migration-key-123'}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Try to connect using DATABASE_URL if available
    if (process.env.DATABASE_URL) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      })

      const client = await pool.connect()

      try {
        const migrationFile = path.join(__dirname, '../../migrations/007_make_file_fields_nullable.sql')
        const sql = fs.readFileSync(migrationFile, 'utf8')

        await client.query(sql)

        res.json({
          success: true,
          message: 'Migration 007 completed successfully',
          sql
        })
      } finally {
        client.release()
        await pool.end()
      }
    } else {
      // Return instructions if DATABASE_URL not available
      res.status(400).json({
        error: 'DATABASE_URL not configured',
        message: 'Please run migration manually through Supabase SQL Editor',
        sql: fs.readFileSync(
          path.join(__dirname, '../../migrations/007_make_file_fields_nullable.sql'),
          'utf8'
        ),
        instructions: [
          'Go to Supabase Dashboard → SQL Editor',
          'Create a new query',
          'Copy the SQL from the response',
          'Run it'
        ]
      })
    }
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    })
  }
})

// Get migration status
router.get('/status', async (req, res) => {
  const { supabaseAdmin } = require('../config/supabase')

  try {
    // Check if columns are nullable by trying to insert a record with nulls
    const { error } = await supabaseAdmin
      .from('form_templates')
      .insert({
        template_name: '__migration_test__',
        text_content: 'test',
        file_path: null,
        file_url: null,
        original_filename: null,
        page_count: 1,
        file_size: 4,
        signature_positions: []
      })
      .select()

    if (error) {
      if (error.code === '23502') {
        // NOT NULL constraint violation - migration needed
        return res.json({
          migration_needed: true,
          status: 'Migration 007 has NOT been run',
          error: error.message
        })
      }
      throw error
    }

    // Clean up test record
    await supabaseAdmin
      .from('form_templates')
      .delete()
      .eq('template_name', '__migration_test__')

    res.json({
      migration_needed: false,
      status: 'Migration 007 completed - file fields are nullable'
    })
  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
})

module.exports = router
