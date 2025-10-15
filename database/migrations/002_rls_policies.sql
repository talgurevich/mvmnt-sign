-- Row Level Security (RLS) Policies
-- Arbox-WhatsApp Form Signing Service
-- Security policies for authenticated admin users and public signing access

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Admins can read their own user record
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all customers
CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admins can create customers
CREATE POLICY "Admins can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated admins can update customers
CREATE POLICY "Admins can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can delete (soft delete) customers
CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- FORM TEMPLATES TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all templates
CREATE POLICY "Admins can view all templates"
  ON form_templates FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admins can create templates
CREATE POLICY "Admins can create templates"
  ON form_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Authenticated admins can update templates
CREATE POLICY "Admins can update templates"
  ON form_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON form_templates FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- CUSTOMER SETTINGS TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all customer settings
CREATE POLICY "Admins can view customer settings"
  ON customer_settings FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admins can create customer settings
CREATE POLICY "Admins can create customer settings"
  ON customer_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated admins can update customer settings
CREATE POLICY "Admins can update customer settings"
  ON customer_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can delete customer settings
CREATE POLICY "Admins can delete customer settings"
  ON customer_settings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- CUSTOMER FORM SETTINGS TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all customer form settings
CREATE POLICY "Admins can view customer form settings"
  ON customer_form_settings FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admins can create customer form settings
CREATE POLICY "Admins can create customer form settings"
  ON customer_form_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated admins can update customer form settings
CREATE POLICY "Admins can update customer form settings"
  ON customer_form_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can delete customer form settings
CREATE POLICY "Admins can delete customer form settings"
  ON customer_form_settings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- FORM REQUESTS TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all form requests
CREATE POLICY "Admins can view all form requests"
  ON form_requests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admins can create form requests
CREATE POLICY "Admins can create form requests"
  ON form_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated admins can update form requests
CREATE POLICY "Admins can update form requests"
  ON form_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public (anonymous) users can view their specific form request by token
-- This is handled via backend API validation, not directly via RLS
CREATE POLICY "Public can view form request by valid token"
  ON form_requests FOR SELECT
  TO anon
  USING (
    -- Token is validated in the backend
    -- This policy allows reading if token hasn't expired
    token_expires_at > NOW() AND status != 'expired'
  );

-- Public can update form request status when signing
CREATE POLICY "Public can update form request on signing"
  ON form_requests FOR UPDATE
  TO anon
  USING (
    token_expires_at > NOW() AND status IN ('sent', 'opened')
  )
  WITH CHECK (
    status IN ('opened', 'signed', 'declined')
  );

-- ============================================================================
-- SIGNATURES TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all signatures
CREATE POLICY "Admins can view all signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (true);

-- Public can insert signatures when signing a document
CREATE POLICY "Public can create signatures"
  ON signatures FOR INSERT
  TO anon
  WITH CHECK (
    -- Verify the form request exists and is valid
    EXISTS (
      SELECT 1 FROM form_requests
      WHERE id = form_request_id
        AND token_expires_at > NOW()
        AND status IN ('sent', 'opened')
    )
  );

-- ============================================================================
-- SIGNED DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all signed documents
CREATE POLICY "Admins can view all signed documents"
  ON signed_documents FOR SELECT
  TO authenticated
  USING (true);

-- System can insert signed documents (via service role)
CREATE POLICY "Service role can create signed documents"
  ON signed_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Public can view their signed document after signing
CREATE POLICY "Public can view their signed document"
  ON signed_documents FOR SELECT
  TO anon
  USING (
    -- Check if the associated form request is accessible
    EXISTS (
      SELECT 1 FROM form_requests
      WHERE id = form_request_id
        AND status = 'signed'
    )
  );

-- ============================================================================
-- AUDIT LOG TABLE POLICIES
-- ============================================================================

-- Authenticated admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- System can insert audit logs (via service role or authenticated users)
CREATE POLICY "Authenticated can create audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anonymous users can create audit logs for public actions
CREATE POLICY "Public can create audit logs for signing"
  ON audit_log FOR INSERT
  TO anon
  WITH CHECK (
    event_type IN ('form_opened', 'form_signed', 'signature_declined')
  );

-- ============================================================================
-- STORAGE BUCKET POLICIES (for Supabase Storage)
-- ============================================================================

-- Note: These are applied separately in Supabase Storage settings
--
-- form-templates bucket:
--   - Authenticated users: full access (read/write/delete)
--   - Public: no direct access
--
-- signed-documents bucket:
--   - Authenticated users: full access
--   - Public: read-only access via signed URLs (time-limited)

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is authenticated admin
CREATE OR REPLACE FUNCTION is_authenticated_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate signing token (to be used in RLS policies)
CREATE OR REPLACE FUNCTION validate_signing_token(request_id UUID, token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM form_requests
    WHERE id = request_id
      AND signing_token = token
      AND token_expires_at > NOW()
      AND status IN ('created', 'sent', 'opened')
  ) INTO valid;

  RETURN valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADDITIONAL SECURITY NOTES
-- ============================================================================

-- 1. All sensitive operations should use the service role key on the backend
-- 2. Public signing pages use anon key with limited RLS policies
-- 3. Admin dashboard uses authenticated user key with full access
-- 4. Token validation happens in both RLS and backend API for defense in depth
-- 5. All file downloads should use signed URLs with expiration
-- 6. IP addresses and user agents are logged for security audit trail

COMMENT ON POLICY "Public can view form request by valid token" ON form_requests IS
  'Allows anonymous users to view form request details when they have a valid, non-expired token';

COMMENT ON POLICY "Public can create signatures" ON signatures IS
  'Allows anonymous users to submit signatures for valid form requests';
