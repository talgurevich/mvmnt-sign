-- Make file-related fields nullable for text-only templates
-- This allows templates to be created without file uploads

ALTER TABLE form_templates
ALTER COLUMN original_filename DROP NOT NULL,
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_url DROP NOT NULL,
ALTER COLUMN page_count DROP NOT NULL,
ALTER COLUMN file_size DROP NOT NULL;
