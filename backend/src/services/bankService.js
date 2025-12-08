/**
 * Bank Hapoalim PSD2 API Service
 * Handles OAuth flow and account/transaction fetching
 */

const axios = require('axios');

// Bank Hapoalim API Configuration
const BANK_CONFIG = {
  // Production URLs (update when moving from sandbox)
  authUrl: process.env.BANK_AUTH_URL || 'https://login.bankhapoalim.co.il/oauth2/authorize',
  tokenUrl: process.env.BANK_TOKEN_URL || 'https://login.bankhapoalim.co.il/oauth2/token',
  apiBaseUrl: process.env.BANK_API_URL || 'https://api.bankhapoalim.co.il/psd2/v1',
  clientId: process.env.BANK_CLIENT_ID,
  clientSecret: process.env.BANK_CLIENT_SECRET,
  redirectUri: process.env.BANK_REDIRECT_URI || 'https://mvmnt-sign-api-8a9b0db245c2.herokuapp.com/api/bank/callback',
  scope: 'aisp' // Account Information Service Provider
};

/**
 * Generate OAuth authorization URL for user to connect their bank
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: BANK_CONFIG.clientId,
    redirect_uri: BANK_CONFIG.redirectUri,
    scope: BANK_CONFIG.scope,
    state: state // For CSRF protection, contains user ID
  });

  return `${BANK_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(BANK_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: BANK_CONFIG.redirectUri,
        client_id: BANK_CONFIG.clientId,
        client_secret: BANK_CONFIG.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    };
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for token');
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(BANK_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: BANK_CONFIG.clientId,
        client_secret: BANK_CONFIG.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Create consent for account access
 */
async function createConsent(accessToken) {
  try {
    const response = await axios.post(
      `${BANK_CONFIG.apiBaseUrl}/consents`,
      {
        access: {
          accounts: [],
          balances: [],
          transactions: []
        },
        recurringIndicator: true,
        validUntil: getConsentExpiryDate(),
        frequencyPerDay: 4,
        combinedServiceIndicator: false
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId()
        }
      }
    );

    return {
      consentId: response.data.consentId,
      consentStatus: response.data.consentStatus,
      scaRedirect: response.data._links?.scaRedirect?.href
    };
  } catch (error) {
    console.error('Create consent error:', error.response?.data || error.message);
    throw new Error('Failed to create consent');
  }
}

/**
 * Get list of accounts
 */
async function getAccounts(accessToken, consentId) {
  try {
    const response = await axios.get(
      `${BANK_CONFIG.apiBaseUrl}/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Consent-ID': consentId,
          'X-Request-ID': generateRequestId()
        }
      }
    );

    return response.data.accounts || [];
  } catch (error) {
    console.error('Get accounts error:', error.response?.data || error.message);
    throw new Error('Failed to fetch accounts');
  }
}

/**
 * Get account balances
 */
async function getBalances(accessToken, consentId, accountId) {
  try {
    const response = await axios.get(
      `${BANK_CONFIG.apiBaseUrl}/accounts/${accountId}/balances`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Consent-ID': consentId,
          'X-Request-ID': generateRequestId()
        }
      }
    );

    return response.data.balances || [];
  } catch (error) {
    console.error('Get balances error:', error.response?.data || error.message);
    throw new Error('Failed to fetch balances');
  }
}

/**
 * Get account transactions
 */
async function getTransactions(accessToken, consentId, accountId, dateFrom, dateTo) {
  try {
    const params = new URLSearchParams({
      bookingStatus: 'both', // booked and pending
      withBalance: 'true'
    });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await axios.get(
      `${BANK_CONFIG.apiBaseUrl}/accounts/${accountId}/transactions?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Consent-ID': consentId,
          'X-Request-ID': generateRequestId()
        }
      }
    );

    const transactions = response.data.transactions || {};

    // Combine booked and pending transactions
    const allTransactions = [
      ...(transactions.booked || []),
      ...(transactions.pending || [])
    ];

    // Map to our format
    return allTransactions.map(tx => ({
      transaction_date: tx.bookingDate || tx.valueDate,
      value_date: tx.valueDate,
      type: tx.bankTransactionCode || tx.proprietaryBankTransactionCode || '',
      details: tx.remittanceInformationUnstructured || tx.additionalInformation || '',
      reference: tx.transactionId || tx.entryReference || '',
      debit: tx.transactionAmount?.amount < 0 ? Math.abs(parseFloat(tx.transactionAmount.amount)) : 0,
      credit: tx.transactionAmount?.amount > 0 ? parseFloat(tx.transactionAmount.amount) : 0,
      balance: tx.balanceAfterTransaction?.balanceAmount?.amount || 0,
      recipient: tx.creditorName || '',
      purpose: tx.purposeCode || ''
    }));
  } catch (error) {
    console.error('Get transactions error:', error.response?.data || error.message);
    throw new Error('Failed to fetch transactions');
  }
}

/**
 * Helper: Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Get consent expiry date (90 days from now)
 */
function getConsentExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date.toISOString().split('T')[0];
}

/**
 * Check if credentials are configured
 */
function isConfigured() {
  return !!(BANK_CONFIG.clientId && BANK_CONFIG.clientSecret);
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  createConsent,
  getAccounts,
  getBalances,
  getTransactions,
  isConfigured,
  BANK_CONFIG
};
