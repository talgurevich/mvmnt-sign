-- Migration: Add text_content column to form_templates table
-- This allows storing extracted text from PDFs for mobile-friendly display

-- Add text_content column
ALTER TABLE form_templates
ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Add comment for clarity
COMMENT ON COLUMN form_templates.text_content IS 'Extracted text content from PDF for mobile display';
