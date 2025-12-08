/**
 * Bank Controller
 * Handles Bank Hapoalim OAuth flow and transaction syncing
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const bankService = require('../services/bankService');
const crypto = require('crypto');

/**
 * Get bank connection status
 * GET /api/bank/status
 */
exports.getConnectionStatus = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Check if credentials are configured
  if (!bankService.isConfigured()) {
    return res.json({
      configured: false,
      connected: false,
      message: 'Bank API credentials not configured'
    });
  }

  // Check if user has a bank connection
  const { data: connection } = await supabaseAdmin
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!connection) {
    return res.json({
      configured: true,
      connected: false
    });
  }

  // Check if consent is still valid
  const isExpired = new Date(connection.consent_expires_at) < new Date();

  res.json({
    configured: true,
    connected: !isExpired,
    bankName: 'Bank Hapoalim',
    connectedAt: connection.created_at,
    expiresAt: connection.consent_expires_at,
    lastSyncAt: connection.last_sync_at,
    accountCount: connection.account_ids?.length || 0
  });
});

/**
 * Start OAuth flow - redirect to bank authorization
 * GET /api/bank/connect
 */
exports.startConnection = catchAsync(async (req, res) => {
  const userId = req.user.id;

  if (!bankService.isConfigured()) {
    throw new AppError('Bank API credentials not configured', 500);
  }

  // Generate state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Store state temporarily (expires in 10 minutes)
  await supabaseAdmin
    .from('bank_oauth_states')
    .upsert({
      state,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

  // Get authorization URL
  const authUrl = bankService.getAuthorizationUrl(state);

  res.json({
    authUrl,
    message: 'Redirect user to authUrl to complete bank connection'
  });
});

/**
 * OAuth callback - exchange code for token
 * GET /api/bank/callback
 */
exports.handleCallback = catchAsync(async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`${process.env.FRONTEND_URL}/finance?bank_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL}/finance?bank_error=missing_params`);
  }

  // Verify state token
  const { data: stateRecord, error: stateError } = await supabaseAdmin
    .from('bank_oauth_states')
    .select('*')
    .eq('state', state)
    .single();

  if (stateError || !stateRecord) {
    return res.redirect(`${process.env.FRONTEND_URL}/finance?bank_error=invalid_state`);
  }

  // Check if state is expired
  if (new Date(stateRecord.expires_at) < new Date()) {
    await supabaseAdmin.from('bank_oauth_states').delete().eq('state', state);
    return res.redirect(`${process.env.FRONTEND_URL}/finance?bank_error=expired_state`);
  }

  const userId = stateRecord.user_id;

  // Clean up state
  await supabaseAdmin.from('bank_oauth_states').delete().eq('state', state);

  try {
    // Exchange code for tokens
    const tokens = await bankService.exchangeCodeForToken(code);

    // Create consent for account access
    const consent = await bankService.createConsent(tokens.accessToken);

    // If SCA redirect is needed, redirect user
    if (consent.scaRedirect) {
      return res.redirect(consent.scaRedirect);
    }

    // Get accounts
    const accounts = await bankService.getAccounts(tokens.accessToken, consent.consentId);

    // Store connection
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 day consent

    await supabaseAdmin
      .from('bank_connections')
      .upsert({
        user_id: userId,
        bank_name: 'Bank Hapoalim',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        consent_id: consent.consentId,
        consent_expires_at: expiresAt.toISOString(),
        account_ids: accounts.map(a => a.resourceId || a.iban),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    // Redirect to success
    res.redirect(`${process.env.FRONTEND_URL}/finance?bank_connected=true`);
  } catch (error) {
    console.error('Bank connection error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/finance?bank_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Disconnect bank
 * DELETE /api/bank/disconnect
 */
exports.disconnect = catchAsync(async (req, res) => {
  const userId = req.user.id;

  await supabaseAdmin
    .from('bank_connections')
    .delete()
    .eq('user_id', userId);

  res.json({
    success: true,
    message: 'Bank disconnected successfully'
  });
});

/**
 * Sync transactions from bank
 * POST /api/bank/sync
 */
exports.syncTransactions = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { dateFrom, dateTo } = req.body;

  // Get bank connection
  const { data: connection, error: connError } = await supabaseAdmin
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (connError || !connection) {
    throw new AppError('No bank connection found. Please connect your bank first.', 404);
  }

  // Check if consent is expired
  if (new Date(connection.consent_expires_at) < new Date()) {
    throw new AppError('Bank consent has expired. Please reconnect your bank.', 401);
  }

  let accessToken = connection.access_token;

  // Refresh token if needed
  if (new Date(connection.token_expires_at) < new Date()) {
    try {
      const newTokens = await bankService.refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.accessToken;

      await supabaseAdmin
        .from('bank_connections')
        .update({
          access_token: newTokens.accessToken,
          refresh_token: newTokens.refreshToken,
          token_expires_at: new Date(Date.now() + newTokens.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      throw new AppError('Failed to refresh bank token. Please reconnect your bank.', 401);
    }
  }

  // Fetch transactions for each account
  const allTransactions = [];
  const accountIds = connection.account_ids || [];

  // Default date range: last 30 days
  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = dateTo || new Date().toISOString().split('T')[0];

  for (const accountId of accountIds) {
    try {
      const transactions = await bankService.getTransactions(
        accessToken,
        connection.consent_id,
        accountId,
        from,
        to
      );
      allTransactions.push(...transactions);
    } catch (error) {
      console.error(`Failed to fetch transactions for account ${accountId}:`, error.message);
    }
  }

  if (allTransactions.length === 0) {
    return res.json({
      success: true,
      message: 'No new transactions found',
      transactionCount: 0
    });
  }

  // Create import record
  const dates = allTransactions.map(tx => new Date(tx.transaction_date)).filter(d => !isNaN(d));
  const dateRangeStart = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const dateRangeEnd = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  const totalIncome = allTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalExpenses = allTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);

  const { data: importRecord, error: importError } = await supabaseAdmin
    .from('finance_imports')
    .insert({
      user_id: userId,
      file_name: `Bank Hapoalim Sync - ${new Date().toLocaleDateString('he-IL')}`,
      date_range_start: dateRangeStart?.toISOString().split('T')[0],
      date_range_end: dateRangeEnd?.toISOString().split('T')[0],
      total_transactions: allTransactions.length,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      source: 'bank_sync'
    })
    .select()
    .single();

  if (importError) {
    throw new AppError('Failed to create import record', 500);
  }

  // Insert transactions
  const transactionsToInsert = allTransactions.map(tx => ({
    ...tx,
    import_id: importRecord.id,
    user_id: userId
  }));

  const { error: txError } = await supabaseAdmin
    .from('bank_transactions')
    .insert(transactionsToInsert);

  if (txError) {
    await supabaseAdmin.from('finance_imports').delete().eq('id', importRecord.id);
    throw new AppError('Failed to save transactions', 500);
  }

  // Update last sync time
  await supabaseAdmin
    .from('bank_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  res.json({
    success: true,
    message: `Synced ${allTransactions.length} transactions`,
    transactionCount: allTransactions.length,
    totalIncome,
    totalExpenses,
    dateRange: {
      start: dateRangeStart,
      end: dateRangeEnd
    }
  });
});

/**
 * Get connected accounts
 * GET /api/bank/accounts
 */
exports.getAccounts = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const { data: connection } = await supabaseAdmin
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!connection) {
    return res.json({ accounts: [] });
  }

  try {
    const accounts = await bankService.getAccounts(
      connection.access_token,
      connection.consent_id
    );

    // Get balances for each account
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        try {
          const balances = await bankService.getBalances(
            connection.access_token,
            connection.consent_id,
            account.resourceId
          );
          return { ...account, balances };
        } catch (e) {
          return { ...account, balances: [] };
        }
      })
    );

    res.json({ accounts: accountsWithBalances });
  } catch (error) {
    throw new AppError('Failed to fetch accounts', 500);
  }
});
