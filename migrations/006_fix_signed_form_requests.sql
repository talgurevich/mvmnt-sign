-- Fix form_requests that have signatures but status is not 'signed'
-- This will trigger the customer stats update

UPDATE form_requests
SET
  status = 'signed',
  signed_at = s.signed_at
FROM (
  SELECT DISTINCT form_request_id, signed_at
  FROM signatures
) s
WHERE form_requests.id = s.form_request_id
  AND form_requests.status != 'signed';
