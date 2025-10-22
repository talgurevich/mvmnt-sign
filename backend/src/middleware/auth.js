// Authentication Middleware
// Validates JWT tokens and protects admin routes

const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

// Whitelist of allowed emails
// Add more emails here or use ALLOWED_EMAILS environment variable
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [
      'tal.gurevich@gmail.com'
    ];

/**
 * Check if user email is in whitelist
 */
const isEmailAllowed = (email) => {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
};

/**
 * Middleware to verify authenticated users
 * Checks for valid session token in Authorization header
 * Also checks if user email is in the whitelist
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if user email is in whitelist
    if (!isEmailAllowed(user.email)) {
      console.warn(`Access denied for email: ${user.email}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'אין לך הרשאה לגשת למערכת זו' // "You don't have permission to access this system" in Hebrew
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to verify signing tokens for public signing pages
 * Validates JWT token embedded in signing URL
 */
const verifySigningToken = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token || req.query.token;

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Signing token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.SIGNING_TOKEN_SECRET);

    // Check if token is expired
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'הקישור פג תוקף' // "The link has expired" in Hebrew
      });
    }

    // Verify form request exists and is valid
    const { data: formRequest, error } = await supabaseAdmin
      .from('form_requests')
      .select('*')
      .eq('id', decoded.formRequestId)
      .eq('signing_token', token)
      .single();

    if (error || !formRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'הקישור אינו תקף' // "The link is not valid" in Hebrew
      });
    }

    // Check if already signed
    if (formRequest.status === 'signed') {
      return res.status(400).json({
        error: 'Already Signed',
        message: 'המסמך כבר נחתם' // "Document already signed" in Hebrew
      });
    }

    // Attach form request data to request object
    req.formRequest = formRequest;
    req.decoded = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'הקישור אינו תקף' // "The link is not valid" in Hebrew
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'הקישור פג תוקף' // "The link has expired" in Hebrew
      });
    }

    console.error('Signing token verification error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'שגיאה באימות הקישור' // "Error verifying link" in Hebrew
    });
  }
};

/**
 * Optional auth - doesn't fail if no token, just doesn't attach user
 * Useful for routes that can work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Don't fail - just continue without user
    next();
  }
};

module.exports = {
  requireAuth,
  verifySigningToken,
  optionalAuth,
  isEmailAllowed,
  ALLOWED_EMAILS
};
