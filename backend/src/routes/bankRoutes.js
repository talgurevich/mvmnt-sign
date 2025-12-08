/**
 * Bank Routes
 * Bank Hapoalim PSD2 OAuth flow and transaction syncing
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const bankController = require('../controllers/bankController');

// ============================================================================
// PUBLIC ROUTES (no authentication required)
// ============================================================================

// GET /api/bank/callback - OAuth callback (handles redirect from bank)
// This endpoint receives redirects from the bank after user authorization
// Security is handled via state token validation
router.get('/callback', bankController.handleCallback);

// ============================================================================
// PROTECTED ROUTES (authentication required)
// ============================================================================
router.use(requireAuth);

// GET /api/bank/status - Get bank connection status
router.get('/status', bankController.getConnectionStatus);

// GET /api/bank/connect - Start OAuth flow (returns authUrl)
router.get('/connect', bankController.startConnection);

// DELETE /api/bank/disconnect - Disconnect bank
router.delete('/disconnect', bankController.disconnect);

// POST /api/bank/sync - Sync transactions from bank
router.post('/sync', bankController.syncTransactions);

// GET /api/bank/accounts - Get connected accounts with balances
router.get('/accounts', bankController.getAccounts);

module.exports = router;
