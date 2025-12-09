// Main Server File
// Arbox-WhatsApp Document Signing Service (Hebrew)
// Node.js + Express + Supabase

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Middleware imports
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Trust proxy - Required when running behind Heroku's reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: 'יותר מדי בקשות, נסה שוב מאוחר יותר', // "Too many requests, try again later" in Hebrew
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
app.use('/api/', limiter);

// More strict rate limiting for public signing endpoints
const signingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 submissions per window
  message: 'יותר מדי נסיונות חתימה, נסה שוב מאוחר יותר', // "Too many signing attempts" in Hebrew
});

// ============================================================================
// HEALTH CHECK & INFO ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    service: 'Arbox-WhatsApp Document Signing Service',
    language: 'Hebrew (עברית)',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Authentication routes (to be implemented)
// app.use('/auth', require('./routes/auth'));

// Admin routes (require authentication)
app.use('/api/customers', require('./routes/customers'));
app.use('/api/form-templates', require('./routes/formTemplateRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/form-requests', require('./routes/formRequestRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/bank', require('./routes/bankRoutes'));
app.use('/api/leads', require('./routes/leadsRoutes'));
app.use('/api/waitlist', require('./routes/waitlistRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/automations', require('./routes/automationsRoutes'));
app.use('/api/birthdays', require('./routes/birthdaysRoutes'));

// Public signing routes (no authentication required)
app.use('/api/sign', require('./routes/signingRoutes'));

// Migration routes (temporary - can be removed after migrations complete)
app.use('/api/migrations', require('./routes/migrationRoutes'));

// Placeholder route for testing
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    hebrew: 'שלום עולם' // "Hello World" in Hebrew
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler - must be after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Arbox-WhatsApp Document Signing Service');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Language: Hebrew (עברית)`);
  console.log(`📅 Started: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
