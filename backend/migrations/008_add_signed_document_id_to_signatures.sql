-- Add signed_document_id column to signatures table
-- This links signatures to their corresponding signed documents

ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS signed_document_id UUID REFERENCES signed_documents(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signatures_signed_document_id ON signatures(signed_document_id);
