# Arbox-WhatsApp Document Signing Service

> **Hebrew-only document signing system for Israeli gyms and fitness centers**

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account
- Arbox API credentials
- Google OAuth credentials

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

1. **Backend**: Copy `backend/.env.example` to `backend/.env` and fill in your credentials
2. **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and fill in your credentials

### Database Setup

1. Create a new Supabase project
2. Run the migration files in order:
   ```bash
   # In Supabase SQL Editor:
   # 1. Run database/migrations/001_initial_schema.sql
   # 2. Run database/migrations/002_rls_policies.sql
   ```
3. Create storage buckets in Supabase:
   - `form-templates` (private)
   - `signed-documents` (private with signed URLs)

### Running the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

## Project Structure

```
.
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Main entry point
│   ├── uploads/             # Temporary file uploads
│   └── package.json
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utility functions
│   │   └── styles/          # CSS/styling
│   └── package.json
│
├── database/                # Database files
│   ├── migrations/          # SQL migration files
│   └── seeds/               # Seed data
│
├── docs/                    # Additional documentation
│
├── README.md                # Main documentation
├── arbox-whatsapp-form-service-plan.md  # Technical plan
└── .gitignore
```

## Tech Stack

**Backend:**
- Node.js + Express.js
- Supabase (PostgreSQL + Auth + Storage)
- JWT authentication
- pdf-lib for PDF manipulation
- Multer for file uploads

**Frontend:**
- React 18
- Material-UI with RTL support
- react-pdf for PDF viewing
- react-signature-canvas for signatures
- Hebrew (עברית) language throughout

## Key Features

- ✅ Full customer CRUD operations
- ✅ Document upload (DOC/DOCX/PDF)
- ✅ WhatsApp integration via wa.me links (no API costs!)
- ✅ Mobile-first signing interface
- ✅ Real-time dashboard
- ✅ Hebrew/RTL interface
- ✅ Audit trail for all actions

## Documentation

- [Full Technical Plan](./arbox-whatsapp-form-service-plan.md) - Complete system specification
- [Main README](./README.md) - Feature overview and summary

## Development Status

Current phase: **Initial Setup Complete**

Completed:
- [x] Project structure
- [x] Package configurations
- [x] Database schema
- [x] RLS policies
- [x] Express server foundation
- [x] Authentication middleware

Next steps:
- [ ] Google OAuth implementation
- [ ] Customer CRUD endpoints
- [ ] Document upload & processing
- [ ] WhatsApp integration
- [ ] Frontend development
- [ ] Public signing page

## Contributing

This is a private project for internal use.

## License

MIT
