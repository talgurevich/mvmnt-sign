# Arbox-WhatsApp Form Signing Service - Technical Plan

> **⚠️ LANGUAGE NOTICE: This service is designed for Hebrew-speaking users in Israel. The admin interface, customer communications, and all UI elements will be in Hebrew only.**

## Overview
A web application that integrates with Arbox to retrieve customer contact information, allows admins to **upload documents (DOC/PDF) as signature templates**, assign specific forms to customers via settings, sends WhatsApp messages with signing links, and provides a custom-built document signing interface. The system tracks all statuses through a secure, Google-authenticated interface, with full control over the signing experience and document management.

**Primary Language:** Hebrew (עברית)  
**Target Market:** Israel  
**Timezone:** Israel (Asia/Jerusalem)

---

## Tech Stack

### Required Components
- **Arbox API**: Customer data retrieval
- **Supabase**: Database + Authentication (Google Sign-In)
- **Heroku**: Application hosting

### Additional Services & Libraries
- **WhatsApp Integration**: Simple wa.me link sharing (no API needed)
- **Frontend**: React.js with Material-UI or Tailwind CSS
- **Backend**: Node.js with Express.js

### Custom Form Signing Components
- **PDF Generation**: PDFKit or jsPDF
- **Document Conversion**: LibreOffice (for DOC/DOCX to PDF) or mammoth.js
- **PDF Reading/Manipulation**: pdf-lib (for adding signatures to PDFs)
- **Signature Capture**: react-signature-canvas
- **File Storage**: Supabase Storage (for form templates and signed documents)
- **File Upload**: Multer (Express middleware)
- **Token Generation**: jsonwebtoken (for secure signing links)
- **API Documentation**: Swagger/OpenAPI

---

## NPM Packages

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "express-session": "^1.17.3",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "axios": "^1.6.2",
    "pdf-lib": "^1.17.1",
    "canvas": "^2.11.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "multer": "^1.4.5-lts.1",
    "file-type": "^18.7.0",
    "sharp": "^0.33.0",
    "mammoth": "^1.6.0",
    "pdf-parse": "^1.1.1",
    "stylis": "^4.3.0",
    "stylis-plugin-rtl": "^2.1.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.56.0"
  }
}
```

**Key Document Processing Libraries:**
- **pdf-lib**: Manipulate PDFs, add signatures, overlay images
- **pdf-parse**: Extract text and metadata from PDFs
- **mammoth**: Convert DOCX to HTML/text
- **sharp**: Image processing for signatures
- **file-type**: Validate uploaded file types
- **multer**: Handle multipart/form-data file uploads

**For LibreOffice (Heroku Buildpack):**
- Add buildpack: `https://github.com/rishabhp/heroku-buildpack-libreoffice`
- Or use: `https://github.com/Scalingo/apt-buildpack` with `libreoffice` in `Aptfile`

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@supabase/supabase-js": "^2.39.0",
    "react-signature-canvas": "^1.0.6",
    "axios": "^1.6.2",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "react-hook-form": "^7.49.2",
    "date-fns": "^3.0.6",
    "react-toastify": "^9.1.3",
    "recharts": "^2.10.3",
    "react-dropzone": "^14.2.3",
    "react-pdf": "^7.7.0",
    "pdfjs-dist": "^3.11.174"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "eslint": "^8.56.0",
    "eslint-plugin-react": "^7.33.2"
  }
}
```

**Key Frontend Libraries:**
- **react-dropzone**: Drag & drop file upload
- **react-pdf**: Display PDF documents in React
- **pdfjs-dist**: PDF rendering engine (used by react-pdf)
- **react-signature-canvas**: Capture signatures

**Hebrew Language Support:**
- All UI text in Hebrew
- RTL (Right-to-Left) layout support
- Hebrew date formatting with date-fns
- Hebrew number formatting
- Material-UI with RTL theme

---

## Hebrew Language & RTL Implementation

### Language Configuration

**System Language:** Hebrew (עברית) only  
**Text Direction:** RTL (Right-to-Left)  
**Locale:** he-IL (Hebrew - Israel)  
**Timezone:** Asia/Jerusalem  

### RTL Layout Setup

#### Material-UI RTL Configuration
```jsx
// src/App.jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Create RTL theme
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: '"Heebo", "Roboto", "Arial", sans-serif',
  },
});

function App() {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <div dir="rtl">
          {/* App content */}
        </div>
      </ThemeProvider>
    </CacheProvider>
  );
}
```

#### Hebrew Fonts

**Recommended Fonts:**
- **Heebo** - Modern, clean, good for UI
- **Rubik** - Rounded, friendly
- **Assistant** - Professional, readable

```css
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');

body {
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  text-align: right;
}
```

### Hebrew UI Text Examples

#### Admin Interface
```jsx
const hebrewText = {
  // Navigation
  dashboard: 'לוח בקרה',
  customers: 'לקוחות',
  documents: 'מסמכים',
  settings: 'הגדרות',
  
  // Customer Management
  addCustomer: 'הוסף לקוח',
  editCustomer: 'ערוך לקוח',
  deleteCustomer: 'מחק לקוח',
  
  // Documents
  uploadDocument: 'העלה מסמך',
  sendDocument: 'שלח מסמך',
  signDocument: 'חתום על מסמך',
  
  // Status
  created: 'נוצר',
  sent: 'נשלח',
  opened: 'נפתח',
  signed: 'נחתם',
  expired: 'פג תוקף',
  
  // Actions
  save: 'שמור',
  cancel: 'ביטול',
  send: 'שלח',
};
```

#### WhatsApp Message Template (Hebrew)
```javascript
const hebrewWhatsAppTemplate = `שלום {customer_first_name},

אנא חתום על {document_name}:
{signing_url}

הקישור יפוג בעוד {expiry_days} ימים.

תודה,
{company_name}`;
```

### Date & Time Formatting (Hebrew)

```javascript
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// Format dates in Hebrew
const formattedDate = format(new Date(), 'PPP', { locale: he });
// Output: "15 באוקטובר 2025"

// Relative time
const relativeTime = (date) => {
  const minutes = Math.floor((new Date() - date) / 60000);
  if (minutes < 1) return 'כרגע';
  if (minutes === 1) return 'לפני דקה';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'לפני שעה';
  if (hours < 24) return `לפני ${hours} שעות`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
};
```

---

## System Architecture

```
┌─────────────────┐
│   User Browser  │
│  (Google Auth)  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Frontend (React)              │
│   - Dashboard                   │
│   - Customer Selection          │
│   - Form Builder/Templates     │
│   - Status Tracking             │
│   - WhatsApp Share Button       │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Backend API (Node.js/Express) │
│   Hosted on Heroku              │
│   - Form Generation             │
│   - PDF Creation                │
│   - Signature Processing        │
│   - Status Management           │
│   - Signing URL Generation      │
└────┬───────┬──────────┬─────────┘
     │       │          │
     ↓       ↓          ↓
┌────────┐ ┌──────┐ ┌──────────────┐
│ Arbox  │ │User's│ │   Supabase   │
│  API   │ │WhatsApp│  Storage     │
└────────┘ │(wa.me)│ │ (Files/PDFs) │
           └──────┘ └──────────────┘
     │
     ↓
┌─────────────────────────────────┐
│   Supabase                      │
│   - PostgreSQL Database         │
│   - Auth (Google Sign-In)       │
│   - Row Level Security          │
│   - File Storage                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Public Signing Page           │
│   - Token-based access          │
│   - Signature canvas            │
│   - Form preview & submission   │
└─────────────────────────────────┘
```

---

## Database Schema (Supabase PostgreSQL)

### Tables

#### 1. `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

#### 2. `customers`
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arbox_customer_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL,
  
  -- Additional fields
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_document_sent_at TIMESTAMP,
  last_document_signed_at TIMESTAMP,
  total_documents_sent INTEGER DEFAULT 0,
  total_documents_signed INTEGER DEFAULT 0,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_active ON customers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_last_activity ON customers(last_document_sent_at DESC);
```

#### 2b. `customer_form_settings`
```sql
CREATE TABLE customer_form_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, form_template_id)
);
```

#### 3. `form_templates`
```sql
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Document storage
  original_file_path TEXT NOT NULL, -- Path in Supabase Storage (DOC/PDF)
  original_file_name TEXT NOT NULL,
  original_file_type TEXT NOT NULL, -- 'pdf', 'doc', 'docx'
  pdf_file_path TEXT NOT NULL, -- Converted PDF path
  pdf_file_url TEXT, -- Public/signed URL
  file_size INTEGER,
  
  -- Signature configuration
  signature_config JSONB NOT NULL DEFAULT '{"positions": [{"page": 1, "x": 100, "y": 100, "width": 200, "height": 60}]}',
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. `customer_settings`
```sql
CREATE TABLE customer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  default_form_template_id UUID REFERENCES form_templates(id),
  settings JSONB DEFAULT '{}', -- Additional customer-specific settings
  notes TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. `form_requests`
```sql
CREATE TABLE form_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  form_template_id UUID REFERENCES form_templates(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'sent', 'opened', 'signed', 'declined', 'expired', 'failed')),
  
  -- Signing access
  signing_token TEXT UNIQUE NOT NULL,
  signing_url TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  
  -- Tracking (manual send tracking)
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMP,
  sent_via TEXT, -- 'whatsapp', 'email', 'sms', 'manual'
  
  -- Engagement tracking
  opened_at TIMESTAMP,
  signed_at TIMESTAMP,
  declined_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. `signatures`
```sql
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signature_type TEXT DEFAULT 'drawn' CHECK (signature_type IN ('drawn', 'typed', 'uploaded')),
  signer_name TEXT NOT NULL,
  signer_ip TEXT,
  page_number INTEGER DEFAULT 1, -- Which page the signature is on
  position_x FLOAT, -- X coordinate of signature
  position_y FLOAT, -- Y coordinate of signature
  signed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. `signed_documents`
```sql
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_url TEXT NOT NULL, -- Public or signed URL
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. `audit_log`
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id),
  customer_id UUID REFERENCES customers(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES users(id),
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_form_requests_status ON form_requests(status);
CREATE INDEX idx_form_requests_customer ON form_requests(customer_id);
CREATE INDEX idx_form_requests_token ON form_requests(signing_token);
CREATE INDEX idx_signatures_request ON signatures(form_request_id);
CREATE INDEX idx_audit_log_request ON audit_log(form_request_id);
CREATE INDEX idx_customer_settings_customer ON customer_settings(customer_id);
CREATE INDEX idx_customer_settings_template ON customer_settings(default_form_template_id);
```

### Database Views (for Dashboard)

#### Recent Events View
```sql
CREATE VIEW recent_document_events AS
SELECT 
  al.id,
  al.event_type,
  al.created_at,
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.phone_number,
  fr.id as form_request_id,
  fr.status,
  ft.name as form_template_name,
  u.full_name as admin_name
FROM audit_log al
LEFT JOIN customers c ON al.customer_id = c.id
LEFT JOIN form_requests fr ON al.form_request_id = fr.id
LEFT JOIN form_templates ft ON fr.form_template_id = ft.id
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC
LIMIT 100;
```

#### Customer Document Status View
```sql
CREATE VIEW customer_document_summary AS
SELECT 
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone_number,
  COUNT(fr.id) as total_documents,
  COUNT(CASE WHEN fr.status = 'signed' THEN 1 END) as signed_count,
  COUNT(CASE WHEN fr.status = 'sent' THEN 1 END) as pending_count,
  COUNT(CASE WHEN fr.status = 'opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN fr.status = 'expired' THEN 1 END) as expired_count,
  MAX(fr.created_at) as last_document_sent,
  MAX(fr.signed_at) as last_document_signed,
  cs.default_form_template_id,
  ft.name as default_form_name
FROM customers c
LEFT JOIN form_requests fr ON c.id = fr.customer_id
LEFT JOIN customer_settings cs ON c.id = cs.customer_id
LEFT JOIN form_templates ft ON cs.default_form_template_id = ft.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, cs.default_form_template_id, ft.name;
```

#### Dashboard Statistics View
```sql
CREATE VIEW dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) as total_customers,
  (SELECT COUNT(*) FROM form_templates WHERE is_active = true) as active_templates,
  (SELECT COUNT(*) FROM form_requests WHERE created_at >= NOW() - INTERVAL '30 days') as documents_sent_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'signed' AND signed_at >= NOW() - INTERVAL '30 days') as documents_signed_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status IN ('sent', 'opened')) as pending_signatures,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'sent' AND token_expires_at <= NOW() + INTERVAL '3 days') as expiring_soon,
  (SELECT AVG(EXTRACT(EPOCH FROM (signed_at - created_at))/3600) FROM form_requests WHERE status = 'signed' AND created_at >= NOW() - INTERVAL '30 days') as avg_signature_time_hours;
```

---

## Document Upload & Signature Configuration

### Supported File Formats
- **PDF**: `.pdf` (directly usable)
- **Microsoft Word**: `.doc`, `.docx` (converted to PDF)

### Upload Process
1. Admin uploads DOC/DOCX/PDF file
2. System validates file type and size (max 10MB)
3. Original file stored in Supabase Storage
4. If DOC/DOCX, convert to PDF using LibreOffice or online API
5. PDF stored separately for signing
6. Admin configures signature placement(s)

### Signature Configuration Schema
```json
{
  "positions": [
    {
      "id": "sig_1",
      "page": 1,
      "x": 100,        // X coordinate from left (pixels or %)
      "y": 700,        // Y coordinate from bottom (pixels or %)
      "width": 200,    // Signature box width
      "height": 60,    // Signature box height
      "required": true,
      "label": "Customer Signature"
    },
    {
      "id": "sig_2",
      "page": 1,
      "x": 400,
      "y": 700,
      "width": 150,
      "height": 40,
      "required": false,
      "label": "Date"
    }
  ],
  "settings": {
    "allowMultipleSignatures": false,
    "requireFullName": true,
    "showSignatureDate": true,
    "signatureColor": "#000000"
  }
}
```

### Document Conversion Strategy

#### Option 1: LibreOffice (Recommended for Production)
```bash
# Install on Heroku using buildpack
heroku buildpacks:add https://github.com/rishabhp/heroku-buildpack-libreoffice

# Convert DOC to PDF
libreoffice --headless --convert-to pdf --outdir /tmp document.docx
```

#### Option 2: CloudConvert API (Alternative)
```javascript
// For simpler setup, use cloud service
const cloudconvert = require('cloudconvert');
const job = await cloudconvert.jobs.create({
  tasks: {
    'import': { operation: 'import/upload' },
    'convert': { operation: 'convert', input: 'import', output_format: 'pdf' },
    'export': { operation: 'export/url', input: 'convert' }
  }
});
```

#### Option 3: Mammoth.js (For DOCX only)
```javascript
// Extract text and convert to PDF
const mammoth = require('mammoth');
const result = await mammoth.convertToHtml({ path: 'document.docx' });
// Then use PDFKit to convert HTML to PDF
```

---

## API Endpoints

### Authentication (Admin)
- `POST /auth/google` - Initiate Google OAuth flow
- `GET /auth/callback` - Handle Google OAuth callback
- `POST /auth/logout` - Logout user

### Customers (Full CRUD)
- `GET /api/customers` - List all customers (paginated, with filters)
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create new customer manually
- `PUT /api/customers/:id` - Update customer details
- `DELETE /api/customers/:id` - Delete customer (soft delete)
- `GET /api/customers/search?q={query}` - Search customers
- `POST /api/customers/sync` - Sync customers from Arbox
- `GET /api/customers/:id/documents` - Get all documents for customer
- `GET /api/customers/:id/document-status` - Get document signing statuses
- `GET /api/customers/:id/activity` - Get customer activity timeline

### Customer Settings
- `GET /api/customers/:id/settings` - Get customer settings
- `POST /api/customers/:id/settings` - Create/update customer settings
- `PUT /api/customers/:id/settings` - Update customer settings
- `GET /api/customers/:id/assigned-form` - Get assigned form template
- `DELETE /api/customers/:id/settings` - Remove customer settings

### Dashboard & Analytics
- `GET /api/dashboard` - Get dashboard overview
- `GET /api/dashboard/recent-events` - Get recent document events (last 50)
- `GET /api/dashboard/recent-customers` - Get recently active customers
- `GET /api/dashboard/stats` - Get overall statistics
- `GET /api/dashboard/activity-feed` - Real-time activity feed
- `GET /api/dashboard/pending-signatures` - Documents awaiting signature
- `GET /api/dashboard/expiring-soon` - Documents expiring soon
- `GET /api/dashboard/charts/status-breakdown` - Document status distribution
- `GET /api/dashboard/charts/activity-timeline` - Activity over time

### Form Templates (Document-Based)
- `GET /api/templates` - List all form templates
- `POST /api/templates` - Upload new document template (multipart/form-data)
- `GET /api/templates/:id` - Get template details
- `PUT /api/templates/:id` - Update template metadata
- `DELETE /api/templates/:id` - Delete template
- `GET /api/templates/:id/preview` - Preview PDF
- `POST /api/templates/:id/signature-config` - Configure signature positions
- `PUT /api/templates/:id/signature-config` - Update signature configuration
- `GET /api/templates/:id/download` - Download original document

### Form Requests (Admin)
- `POST /api/form-requests` - Create and send new form request
- `GET /api/form-requests` - List all form requests (with filters)
- `GET /api/form-requests/:id` - Get form request details
- `PUT /api/form-requests/:id/resend` - Resend WhatsApp message
- `DELETE /api/form-requests/:id` - Cancel/delete form request
- `GET /api/form-requests/stats` - Get statistics dashboard
- `GET /api/form-requests/:id/document` - Download signed document

### Public Signing Endpoints (No Auth Required - Mobile Optimized)
- `GET /sign/:token` - Public signing page (validates token) - **Mobile-first design**
- `POST /sign/:token/validate` - Validate signing token
- `GET /sign/:token/document` - Get document for signing (PDF) - **Accessible to anyone with link**
- `POST /sign/:token/submit` - Submit signed document with name + signature
- `POST /sign/:token/decline` - Decline to sign
- `GET /sign/:token/preview` - Preview document before signing

### File Management
- `POST /api/upload/document` - Upload document template (DOC/DOCX/PDF)
- `GET /api/documents/:id` - Get signed document (authenticated)
- `GET /api/documents/:id/download` - Download signed document

---

## WhatsApp Integration (Simple Share)

### Overview
Instead of using the WhatsApp Business API, the system uses a simple **wa.me** link that opens the user's WhatsApp app with a pre-filled message. The admin sends the document link from their own WhatsApp account.

### How It Works

#### Step 1: Admin Creates Form Request
```
Admin → Selects customer →
Chooses form template →
System generates signing URL →
Status: "Created"
```

#### Step 2: Admin Gets WhatsApp Share Button
```
┌─────────────────────────────────┐
│  Send to: John Doe              │
│  +1234567890                    │
├─────────────────────────────────┤
│  Document: Gym Liability Waiver │
│                                 │
│  Signing Link:                  │
│  https://app.com/sign/abc123... │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 📱 Send via WhatsApp    │   │
│  └─────────────────────────┘   │
│                                 │
│  [Copy Link]  [Send via Email]  │
└─────────────────────────────────┘
```

#### Step 3: WhatsApp Opens with Pre-filled Message
When admin clicks "Send via WhatsApp", the system:
1. Generates a `wa.me` URL
2. Pre-fills message with document details and link
3. Opens admin's WhatsApp (web or mobile)
4. Admin reviews and sends from their own account

**wa.me URL Format:**
```
https://wa.me/1234567890?text=Hi%20John,%0A%0APlease%20sign%20your%20Gym%20Liability%20Waiver:%0Ahttps://app.com/sign/abc123xyz%0A%0ALink%20expires%20in%207%20days.
```

**Decoded Message:**
```
Hi John,

Please sign your Gym Liability Waiver:
https://app.com/sign/abc123xyz

Link expires in 7 days.
```

#### Step 4: Admin Sends from WhatsApp
- Admin sees pre-filled message in WhatsApp
- Admin can edit message if needed
- Admin sends from their own WhatsApp
- Message appears as coming from admin's number

#### Step 5: Customer Receives & Signs
- Customer gets WhatsApp message from admin's number
- Clicks link
- Signs document
- Status updates to "signed"

### Implementation

#### Frontend Component
```jsx
const WhatsAppShareButton = ({ customer, signingUrl, documentName }) => {
  const phoneNumber = customer.phone_number.replace(/[^0-9]/g, ''); // Remove formatting
  
  const message = `Hi ${customer.first_name},

Please sign your ${documentName}:
${signingUrl}

Link expires in 7 days.`;
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  
  const handleSendWhatsApp = () => {
    // Mark as sent in database
    markAsSent(formRequestId, 'whatsapp');
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <button onClick={handleSendWhatsApp} className="whatsapp-button">
      <WhatsAppIcon />
      Send via WhatsApp
    </button>
  );
};
```

#### Backend API
```javascript
// Mark form request as sent
POST /api/form-requests/:id/mark-sent
{
  "sent_via": "whatsapp"
}

// Updates status from "created" to "sent"
// Records sent_at timestamp
// Records sent_by (admin user)
```

#### Status Tracking
```javascript
// Status flow:
created → sent → opened → signed

// Database updates:
1. Created: Form request generated, signing URL ready
2. Sent: Admin clicked WhatsApp button (marked manually)
3. Opened: Customer clicked signing link (tracked automatically)
4. Signed: Customer submitted signature (tracked automatically)
```

### Admin UI

#### Send Document Modal
```
┌─────────────────────────────────────────┐
│  Send Document to John Doe              │
├─────────────────────────────────────────┤
│                                         │
│  Document: Gym Liability Waiver         │
│  Phone: +1 (234) 567-8900              │
│                                         │
│  Signing Link (expires in 7 days):     │
│  ┌─────────────────────────────────┐   │
│  │ https://app.com/sign/abc123xyz  │   │
│  └─────────────────────────────────┘   │
│  [Copy Link]                            │
│                                         │
│  ─────────── Send Via ──────────        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📱 WhatsApp                    │   │
│  │  Opens WhatsApp with pre-filled │   │
│  │  message. Send from your account│   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📧 Email (coming soon)         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📋 Copy Link                   │   │
│  │  Copy to send manually          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancel]                [Mark as Sent] │
└─────────────────────────────────────────┘
```

### Message Customization

#### Admin Can Edit Default Message
```
Settings → Message Templates:

┌─────────────────────────────────────────┐
│  WhatsApp Message Template             │
├─────────────────────────────────────────┤
│                                         │
│  Hi {customer_name},                    │
│                                         │
│  Please sign your {document_name}:      │
│  {signing_url}                          │
│                                         │
│  Link expires in {expiry_days} days.    │
│                                         │
│  Variables available:                   │
│  {customer_name}                        │
│  {customer_first_name}                  │
│  {customer_last_name}                   │
│  {document_name}                        │
│  {signing_url}                          │
│  {expiry_days}                          │
│  {company_name}                         │
│                                         │
│  [Save Template]                        │
└─────────────────────────────────────────┘
```

#### Multiple Languages (Future)
```javascript
const templates = {
  en: "Hi {customer_name},\n\nPlease sign your {document_name}:\n{signing_url}",
  he: "שלום {customer_name},\n\nאנא חתום על {document_name}:\n{signing_url}"
};
```

### Advantages of This Approach

✅ **No API Costs** - Free, no monthly WhatsApp API fees  
✅ **Personal Touch** - Messages come from admin's own number  
✅ **No Setup** - No WhatsApp Business account needed  
✅ **Instant** - Works immediately  
✅ **Familiar** - Admin uses their existing WhatsApp  
✅ **Flexible** - Admin can customize message before sending  
✅ **Two-way** - Customer can reply to admin directly  

### Limitations

⚠️ **Manual Tracking** - Can't automatically track delivery/read status  
⚠️ **No Automation** - Admin must click send for each customer  
⚠️ **Status Updates** - Admin marks as "sent" manually  
⚠️ **No Bulk Send** - Must send individually (but can use bulk via list)  

### Alternative Send Methods

Since status tracking is manual, also provide:

**1. Copy Link**
- Copy signing URL to clipboard
- Admin can paste anywhere (SMS, email, chat)

**2. Email (Optional)**
- Simple email with signing link
- Can track opens/clicks with email service

**3. QR Code (Future)**
- Generate QR code for signing URL
- Customer scans to sign

### Workflow Example

**Admin sends to 5 customers:**
1. Select 5 customers
2. Choose form template
3. Click "Generate Links"
4. For each customer, click "Send via WhatsApp"
5. WhatsApp opens with pre-filled message
6. Admin sends
7. System marks as "sent"
8. Repeat for next customer

**Bulk workflow (alternative):**
1. Select multiple customers
2. Generate all signing URLs
3. System shows list with WhatsApp buttons
4. Admin clicks through each one
5. Or exports list to send via other method

---

## Public Signing Page (Mobile-First & Accessible)

### Design Principles
1. **Accessible to Anyone** - No login required, works with just the link
2. **Mobile-First** - Optimized for phone screens (most users sign on mobile)
3. **Clear Content** - Full document visible and readable before signing
4. **Simple Process** - Name + Signature = Done
5. **Touch-Friendly** - Large buttons, easy signature drawing on touchscreen

### Mobile Signing Experience

#### Step 1: Customer Opens WhatsApp Link
```
WhatsApp Message:
┌─────────────────────────────────┐
│ 📄 Gym Liability Waiver         │
│                                 │
│ Hi John Doe,                    │
│                                 │
│ Please review and sign your     │
│ liability waiver.               │
│                                 │
│ [📱 Sign Document]              │
│                                 │
│ Link expires in 7 days          │
└─────────────────────────────────┘
```

#### Step 2: Loading Screen (Token Validation)
```
Mobile View:
┌─────────────────────────────────┐
│  [Logo]                         │
│                                 │
│         🔄 Loading...           │
│                                 │
│    Preparing your document      │
└─────────────────────────────────┘
```

#### Step 3: Document Review Page (Full Content Visible)
```
Mobile Optimized Layout:
┌─────────────────────────────────┐
│  ← Exit    Document Signing     │
├─────────────────────────────────┤
│  Gym Liability Waiver           │
│  For: John Doe                  │
├─────────────────────────────────┤
│                                 │
│  📄 DOCUMENT CONTENT            │
│  (Scrollable PDF Viewer)        │
│                                 │
│  [Full waiver text visible,     │
│   rendered clearly, zoomable]   │
│                                 │
│  This agreement states that...  │
│  I acknowledge the risks...     │
│  I waive all liability...       │
│                                 │
│  [User can scroll through       │
│   entire document]              │
│                                 │
│  Page 1 of 2                    │
│                                 │
├─────────────────────────────────┤
│                                 │
│  [Continue to Sign ↓]           │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Full PDF rendered using react-pdf/pdfjs
- Pinch to zoom enabled
- Smooth scrolling through all pages
- Page indicator (Page X of Y)
- Document is fully readable before signing
- High contrast for accessibility
- Font size appropriate for mobile

#### Step 4: Signature Collection Page
```
Mobile View (After scrolling/reading):
┌─────────────────────────────────┐
│  ← Back to Document             │
├─────────────────────────────────┤
│  Ready to Sign                  │
├─────────────────────────────────┤
│                                 │
│  Full Name *                    │
│  ┌─────────────────────────┐   │
│  │ John Doe                │   │
│  └─────────────────────────┘   │
│                                 │
│  Your Signature *               │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    [Signature Canvas]   │   │
│  │                         │   │
│  │    ✍️ Sign here         │   │
│  │                         │   │
│  └─────────────────────────┘   │
│  [Clear]                        │
│                                 │
│  ✓ I have read and agree to    │
│    the terms in this document  │
│                                 │
│  ┌─────────────────────────┐   │
│  │   Submit Signature      │   │
│  └─────────────────────────┘   │
│                                 │
│  [Decline to Sign]              │
│                                 │
└─────────────────────────────────┘
```

**Signature Canvas Features:**
- **Touch optimized** - Smooth drawing on mobile
- **Responsive size** - Adapts to screen size
- **Landscape option** - Rotate phone for bigger canvas
- **Clear button** - Easy to redo signature
- **Preview** - Shows signature before submit
- **Validation** - Ensures signature isn't blank

#### Step 5: Review & Confirm
```
Mobile View:
┌─────────────────────────────────┐
│  Review Your Signature          │
├─────────────────────────────────┤
│                                 │
│  Name: John Doe                 │
│                                 │
│  Signature:                     │
│  ┌─────────────────────────┐   │
│  │  [Signature Preview]    │   │
│  └─────────────────────────┘   │
│                                 │
│  Document: Gym Liability Waiver │
│  Date: Oct 15, 2025 2:30 PM    │
│                                 │
│  ⚠️ By submitting, you agree   │
│     this signature is legally   │
│     binding.                    │
│                                 │
│  ┌─────────────────────────┐   │
│  │   ✓ Confirm & Submit    │   │
│  └─────────────────────────┘   │
│                                 │
│  [← Go Back]                    │
│                                 │
└─────────────────────────────────┘
```

#### Step 6: Success Confirmation
```
Mobile View:
┌─────────────────────────────────┐
│           ✅                     │
│                                 │
│    Document Signed!             │
│                                 │
│  Your signature has been        │
│  recorded and submitted.        │
│                                 │
│  A copy has been sent to:       │
│  john.doe@email.com             │
│                                 │
│  Signed: Oct 15, 2025 2:30 PM  │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Download Signed Copy   │   │
│  └─────────────────────────┘   │
│                                 │
│  You can now close this page.  │
│                                 │
└─────────────────────────────────┘
```

### Desktop Signing Experience

For users on desktop/tablet:
```
Desktop Layout:
┌──────────────────────────────────────────────────────────────┐
│  [Logo]                           Document Signing      [Exit]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │                    │  │  Gym Liability Waiver        │  │
│  │   PDF Preview      │  │  For: John Doe               │  │
│  │   (Left Panel)     │  │                              │  │
│  │                    │  │  ─────────────────────────   │  │
│  │   [Document        │  │                              │  │
│  │    rendered        │  │  Full Name:                  │  │
│  │    with all        │  │  ┌────────────────────────┐ │  │
│  │    pages]          │  │  │ John Doe               │ │  │
│  │                    │  │  └────────────────────────┘ │  │
│  │   Page 1 of 2      │  │                              │  │
│  │   [Prev] [Next]    │  │  Your Signature:             │  │
│  │                    │  │  ┌────────────────────────┐ │  │
│  │   [Zoom +/-]       │  │  │                        │ │  │
│  │                    │  │  │  [Signature Canvas]    │ │  │
│  │                    │  │  │  ✍️ Sign here          │ │  │
│  │                    │  │  │                        │ │  │
│  │                    │  │  └────────────────────────┘ │  │
│  │                    │  │  [Clear]                     │  │
│  │                    │  │                              │  │
│  │                    │  │  ☑ I have read and agree    │  │
│  │                    │  │                              │  │
│  │                    │  │  ┌────────────────────────┐ │  │
│  │                    │  │  │  Submit Signature      │ │  │
│  └────────────────────┘  │  └────────────────────────┘ │  │
│                          │                              │  │
│                          │  [Decline to Sign]           │  │
│                          └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Desktop Features:**
- Split view: Document on left, form on right
- Full PDF visible while signing
- Mouse drawing for signature (or use trackpad)
- Keyboard navigation support

### Mobile Optimization Checklist

#### Responsive Design
- ✅ Viewport meta tag for proper scaling
- ✅ Touch-friendly buttons (min 44px height)
- ✅ Large form inputs for easy typing
- ✅ Signature canvas optimized for finger drawing
- ✅ Smooth scrolling and transitions
- ✅ No horizontal scrolling required

#### Performance
- ✅ Lazy load PDF pages
- ✅ Compress images/signatures
- ✅ Minimize JavaScript bundle
- ✅ Fast loading on 3G/4G
- ✅ Offline error handling

#### Accessibility (WCAG 2.1 AA)
- ✅ Semantic HTML elements
- ✅ ARIA labels for screen readers
- ✅ Keyboard navigation support
- ✅ High contrast text (min 4.5:1 ratio)
- ✅ Focus indicators visible
- ✅ Error messages clear and descriptive
- ✅ Alt text for all images
- ✅ Form labels properly associated

#### Touch Interactions
- ✅ Smooth signature drawing
- ✅ Pinch to zoom on document
- ✅ Swipe between pages
- ✅ Pull-to-refresh disabled (prevent accidental refresh)
- ✅ Tap targets not too close together

#### Device Testing
- ✅ iOS Safari (iPhone)
- ✅ Chrome (Android)
- ✅ Samsung Internet
- ✅ Various screen sizes (320px to 1024px+)
- ✅ Portrait and landscape orientations

### Frontend Components

#### 1. DocumentViewer Component
```jsx
<DocumentViewer 
  pdfUrl={documentUrl}
  allowZoom={true}
  onPageChange={(page) => console.log(page)}
  mobileOptimized={true}
/>
```

Features:
- react-pdf for rendering
- Pinch to zoom
- Page navigation
- Loading states
- Error handling

#### 2. SignatureCanvas Component
```jsx
<SignatureCanvas
  width={isMobile ? '100%' : 500}
  height={isMobile ? 200 : 150}
  onEnd={(signature) => setSignature(signature)}
  penColor="#000000"
  canvasProps={{
    className: 'signature-canvas'
  }}
/>
```

Features:
- react-signature-canvas library
- Touch and mouse support
- Clear functionality
- Export to base64 PNG
- Responsive sizing

#### 3. SigningForm Component
```jsx
<SigningForm
  onSubmit={handleSubmit}
  documentName="Gym Waiver"
  recipientName="John Doe"
  mobile={isMobile}
/>
```

Features:
- Name input (pre-filled from customer data)
- Signature canvas
- Checkbox for agreement
- Validation
- Submit/Decline buttons

### Signature Collection Data

```javascript
POST /sign/:token/submit

Request Body:
{
  "signer_name": "John Doe",
  "signature_data": "data:image/png;base64,iVBORw0KGg...",
  "agreed_to_terms": true,
  "device_info": {
    "user_agent": "Mozilla/5.0 (iPhone...)",
    "screen_size": "375x812",
    "platform": "iOS"
  }
}

Response:
{
  "success": true,
  "message": "Document signed successfully",
  "signed_document_url": "https://...",
  "signature_timestamp": "2025-10-15T14:30:00Z",
  "download_url": "https://..."
}
```

### Mobile-Specific CSS

```css
/* Mobile-first styles */
.signing-page {
  font-size: 16px; /* Prevent zoom on input focus (iOS) */
  -webkit-text-size-adjust: 100%;
}

.signature-canvas {
  touch-action: none; /* Prevent scroll while drawing */
  width: 100%;
  max-width: 500px;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
}

.submit-button {
  min-height: 48px; /* Touch-friendly */
  font-size: 18px;
  width: 100%;
  margin-top: 20px;
}

/* Landscape mode optimization */
@media (orientation: landscape) and (max-height: 500px) {
  .signature-canvas {
    height: 150px;
  }
}

/* Tablet and desktop */
@media (min-width: 768px) {
  .signing-page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}
```

### Error Handling & Edge Cases

#### Token Expired
```
┌─────────────────────────────────┐
│  ⚠️ Link Expired                │
│                                 │
│  This signing link has expired. │
│                                 │
│  Please contact us to receive   │
│  a new link.                    │
│                                 │
│  [Contact Support]              │
└─────────────────────────────────┘
```

#### Already Signed
```
┌─────────────────────────────────┐
│  ✅ Already Signed               │
│                                 │
│  You have already signed this   │
│  document on Oct 10, 2025.      │
│                                 │
│  [Download Signed Copy]         │
└─────────────────────────────────┘
```

#### Network Error
```
┌─────────────────────────────────┐
│  ❌ Connection Error             │
│                                 │
│  Unable to submit signature.    │
│  Check your internet connection.│
│                                 │
│  [Retry]                        │
└─────────────────────────────────┘
```

#### Empty Signature
```
Validation Message:
"Please draw your signature before submitting"
```

#### Empty Name
```
Validation Message:
"Please enter your full name"
```

### Legal & Compliance

#### E-Signature Disclosure
Display before signature:
```
By drawing your signature, you agree that:
1. Your electronic signature is legally binding
2. You have read and understood the document
3. You consent to conduct business electronically
```

#### Timestamp & Audit Trail
Every signature records:
- Exact timestamp (ISO 8601)
- IP address
- Device/browser info
- Document version
- Signer name

### Internationalization (Future)

For multi-language support:
```jsx
{locale === 'he' ? (
  <div dir="rtl">
    {/* Hebrew content */}
  </div>
) : (
  <div dir="ltr">
    {/* English content */}
  </div>
)}
```

---

## Customer Management Section (CRUD + Document Tracking)

### Overview
The Customer Management section provides complete CRUD operations on customers along with comprehensive document status tracking. Admins can view all customers synced from Arbox, manually add new ones, and see the complete history of documents sent to each customer.

### Customer List View

#### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│  Customers                                    [+ Add Customer] [Sync]  │
├────────────────────────────────────────────────────────────────────────┤
│  Search: [_________________]  Status: [All ▼]  Form: [All ▼]  [Filter]│
├────────────────────────────────────────────────────────────────────────┤
│  Name          | Phone         | Assigned Form    | Status  | Actions │
├────────────────────────────────────────────────────────────────────────┤
│  John Doe      | +1234567890   | Gym Waiver      | ✅ Signed│ [•••]  │
│  Jane Smith    | +1234567891   | PT Agreement    | ⏳ Pending│ [•••] │
│  Bob Johnson   | +1234567892   | -               | ❌ None  │ [•••]  │
│  Alice Cooper  | +1234567893   | Gym Waiver      | 📤 Sent  │ [•••]  │
│  Mike Wilson   | +1234567894   | Corporate Form  | 📂 Opened│ [•••]  │
├────────────────────────────────────────────────────────────────────────┤
│  Showing 1-5 of 247                           [< Prev] [Next >]        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Features
- **Search**: By name, phone, email, Arbox ID
- **Filters**: 
  - Status: All, Has Form, No Form, Pending Signature, Signed, Never Sent
  - Assigned Form: Filter by specific template
  - Date Range: Last activity
- **Sorting**: Name, Recent Activity, Status
- **Bulk Actions**: 
  - Assign form to selected customers
  - Send forms to selected customers
  - Delete selected customers

#### Status Indicators
| Icon | Status | Description |
|------|--------|-------------|
| ✅ | Signed | Customer has signed latest document |
| ⏳ | Pending | Document sent, awaiting signature |
| 📤 | Sent | Document sent but not yet opened |
| 📂 | Opened | Customer opened document |
| ❌ | None | No documents sent |
| ⚠️ | Expired | Document link expired |
| 🔄 | Multiple | Multiple documents with different statuses |

### Customer Detail View

#### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Customers                                                   │
├────────────────────────────────────────────────────────────────────────┤
│  John Doe                                              [Edit] [Delete]  │
│  +1234567890 | john.doe@email.com                                      │
│  Arbox ID: ARB-12345                                                   │
├────────────────────────────────────────────────────────────────────────┤
│  [Info] [Settings] [Documents] [Activity]                              │
├────────────────────────────────────────────────────────────────────────┤
│  Documents Sent: 3  |  Signed: 2  |  Pending: 1  |  [Send New Form]   │
├────────────────────────────────────────────────────────────────────────┤
│  Document                  | Sent Date    | Status  | Actions          │
│  ────────────────────────────────────────────────────────────────────  │
│  Gym Liability Waiver      | Oct 10, 2025 | ✅ Signed | [View] [Download]│
│  PT Agreement              | Oct 12, 2025 | ⏳ Pending| [Resend] [View]  │
│  Medical Questionnaire     | Sep 15, 2025 | ✅ Signed | [View] [Download]│
└────────────────────────────────────────────────────────────────────────┘
```

#### Tabs

**1. Info Tab**
- First Name, Last Name
- Email, Phone Number
- Arbox Customer ID
- Date Added
- Last Activity
- [Edit] button for inline editing

**2. Settings Tab**
- Default Form Template (dropdown)
- Auto-send on signup (checkbox)
- Reminder frequency (number input)
- Custom message template
- Notes (textarea)
- [Save Settings] button

**3. Documents Tab**
Shows all form requests sent to this customer:
- Table with: Document name, Sent date, Status, Actions
- Status badge with color coding
- Quick actions: View, Resend, Download
- Timeline view toggle
- Filter by status

**4. Activity Tab**
Complete audit trail:
```
📤 Oct 12, 2025 3:45 PM - Form "PT Agreement" sent
📂 Oct 12, 2025 4:12 PM - Customer opened link
⏳ Pending signature...

✅ Oct 10, 2025 2:30 PM - Form "Gym Waiver" signed
📤 Oct 10, 2025 10:00 AM - Form sent
📂 Oct 10, 2025 10:15 AM - Customer opened link
✍️  Oct 10, 2025 2:30 PM - Signature captured

⚙️  Oct 9, 2025 9:00 AM - Default form assigned: "Gym Waiver"
👤 Oct 9, 2025 9:00 AM - Customer synced from Arbox
```

### CRUD Operations

#### Create Customer
```
Modal: Add New Customer
┌────────────────────────────────────┐
│ First Name: [________________]     │
│ Last Name:  [________________]     │
│ Email:      [________________]     │
│ Phone:      [________________]     │
│ Arbox ID:   [________________]     │
│                                    │
│ Assign Default Form:               │
│ [Select Form Template ▼]           │
│                                    │
│          [Cancel]  [Add Customer]  │
└────────────────────────────────────┘
```

#### Update Customer
- Inline editing in Info tab
- Click field → Edit → Save/Cancel
- Validation on all fields

#### Delete Customer
- Soft delete (marks as inactive)
- Confirmation modal: "Are you sure? This will not delete documents."
- Option to hard delete (removes from database)

### Document Status Summary

#### Per Customer Stats
```json
{
  "customer_id": "uuid",
  "total_documents_sent": 5,
  "signed": 3,
  "pending": 1,
  "expired": 1,
  "never_opened": 0,
  "last_activity": "2025-10-12T14:30:00Z",
  "latest_document": {
    "name": "PT Agreement",
    "status": "pending",
    "sent_date": "2025-10-12"
  }
}
```

#### API Response Example
```javascript
GET /api/customers/:id

{
  "id": "uuid",
  "arbox_customer_id": "ARB-12345",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "created_at": "2025-09-01T10:00:00Z",
  "updated_at": "2025-10-10T15:30:00Z",
  "settings": {
    "default_form_template_id": "template-uuid",
    "default_form_name": "Gym Liability Waiver"
  },
  "document_summary": {
    "total": 3,
    "signed": 2,
    "pending": 1,
    "last_signed": "2025-10-10T14:30:00Z"
  },
  "recent_documents": [
    {
      "id": "request-uuid",
      "form_name": "PT Agreement",
      "status": "pending",
      "sent_at": "2025-10-12T10:00:00Z",
      "expires_at": "2025-10-19T10:00:00Z"
    }
  ]
}
```

---

## Dashboard Overview

### Purpose
The dashboard provides a real-time overview of system activity, showing recent document events and customer activity to help admins monitor signing progress and quickly identify issues.

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                        Last updated: 2:30 PM │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Total Sent  │  │   Signed    │  │  Pending    │  │  Expired    │  │
│  │     247     │  │     189     │  │      43     │  │     15      │  │
│  │    +12 ↑    │  │    +8 ↑     │  │    -3 ↓     │  │    +2 ↑     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  Recent Document Events                          [View All]            │
├────────────────────────────────────────────────────────────────────────┤
│  ✅ John Doe signed "Gym Waiver"                    2 minutes ago      │
│  📂 Jane Smith opened "PT Agreement"                5 minutes ago      │
│  📤 Bob Johnson sent "Corporate Form"               12 minutes ago     │
│  ✅ Alice Cooper signed "Medical Form"              23 minutes ago     │
│  📂 Mike Wilson opened "Gym Waiver"                 31 minutes ago     │
│  📤 Sarah Lee sent "Liability Waiver"               45 minutes ago     │
│  ⚠️  Tom Brown's "Waiver" expired                   1 hour ago         │
├────────────────────────────────────────────────────────────────────────┤
│  Recently Active Customers                       [View All]            │
├────────────────────────────────────────────────────────────────────────┤
│  John Doe          | Signed Gym Waiver          | 2 mins ago  | [View]│
│  Jane Smith        | Opened PT Agreement        | 5 mins ago  | [View]│
│  Alice Cooper      | Signed Medical Form        | 23 mins ago | [View]│
│  Mike Wilson       | Opened Gym Waiver          | 31 mins ago | [View]│
│  Sarah Lee         | Document sent              | 45 mins ago | [View]│
├────────────────────────────────────────────────────────────────────────┤
│  ⏰ Expiring Soon (3)                           [View All]             │
│  Bob Johnson - Corporate Form - Expires in 2 days                      │
│  Carol White - Gym Waiver - Expires in 3 days                          │
│  David Brown - PT Agreement - Expires tomorrow                         │
├────────────────────────────────────────────────────────────────────────┤
│  📊 Activity Chart (Last 30 Days)                                      │
│  [Chart showing document sent/signed over time]                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Components

#### 1. Stats Cards
Real-time metrics with trend indicators:
- **Total Sent**: All documents sent (with 7-day change)
- **Signed**: Successfully signed documents (with completion rate %)
- **Pending**: Awaiting signature (with average time pending)
- **Expired**: Expired without signing (with expiration rate %)

#### 2. Recent Document Events
Live activity feed showing last 50 events:
- Event type (sent, opened, signed, expired, declined)
- Customer name (clickable to customer detail)
- Document name
- Timestamp (relative: "2 minutes ago")
- Color-coded by event type
- Auto-refreshes every 30 seconds

**Event Types:**
| Icon | Event | Description |
|------|-------|-------------|
| 📤 | Document Sent | Admin sent document to customer |
| 📂 | Document Opened | Customer opened signing link |
| ✍️ | Signature Started | Customer began signing |
| ✅ | Document Signed | Customer completed signature |
| 🔄 | Document Resent | Admin resent document |
| ⚠️ | Document Expired | Token expired before signing |
| ❌ | Signature Declined | Customer declined to sign |
| 📥 | Document Downloaded | Signed document downloaded |

#### 3. Recently Active Customers
Shows customers with recent document activity:
- Customer name
- Latest action
- Time since action
- Quick link to customer detail
- Sorted by most recent first
- Limit: 10 customers

#### 4. Expiring Soon Widget
Alerts for documents expiring within 7 days:
- Customer name
- Document name
- Days until expiration
- Quick actions: [Resend] [Extend]
- Priority sorting (soonest first)

#### 5. Activity Chart
Visual representation of:
- Documents sent vs signed over time
- Completion rate trend
- Peak activity times
- Interactive chart (click to drill down)

### Dashboard API

#### Get Dashboard Data
```javascript
GET /api/dashboard

Response:
{
  "stats": {
    "total_sent": 247,
    "total_sent_change": +12,
    "total_signed": 189,
    "total_signed_change": +8,
    "signing_rate": 76.5,
    "total_pending": 43,
    "total_pending_change": -3,
    "total_expired": 15,
    "total_expired_change": +2,
    "avg_signature_time_hours": 18.5
  },
  "recent_events": [
    {
      "id": "event-uuid",
      "type": "signed",
      "customer_name": "John Doe",
      "customer_id": "customer-uuid",
      "document_name": "Gym Waiver",
      "document_id": "doc-uuid",
      "timestamp": "2025-10-15T14:28:00Z",
      "relative_time": "2 minutes ago"
    }
  ],
  "active_customers": [
    {
      "customer_id": "uuid",
      "customer_name": "John Doe",
      "latest_action": "Signed Gym Waiver",
      "timestamp": "2025-10-15T14:28:00Z",
      "relative_time": "2 minutes ago"
    }
  ],
  "expiring_soon": [
    {
      "request_id": "uuid",
      "customer_name": "Bob Johnson",
      "document_name": "Corporate Form",
      "expires_at": "2025-10-17T10:00:00Z",
      "days_until_expiry": 2
    }
  ]
}
```

#### Real-time Updates
- WebSocket connection for live updates
- Or: Polling every 30 seconds
- New events appear at top of feed
- Toast notifications for important events

### Dashboard Filters

**Time Range:**
- Today
- Last 7 days (default)
- Last 30 days
- Custom range

**Event Type:**
- All events
- Sent only
- Signed only
- Pending only

**Customer:**
- All customers
- Specific customer

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### Day 1-2: Project Setup
- [ ] Initialize Git repository
- [ ] Set up Heroku app and pipeline
- [ ] Configure Supabase project
- [ ] Set up development environment
- [ ] Create `.env` configuration template

#### Day 3-4: Authentication & Database
- [ ] Implement Supabase Google Sign-In
- [ ] Create database schema and migrations
- [ ] Set up Row Level Security (RLS) policies
- [ ] Build authentication middleware
- [ ] Create protected route wrapper

#### Day 5-7: Basic Backend API
- [ ] Set up Express.js server
- [ ] Implement authentication endpoints
- [ ] Create database connection layer
- [ ] Set up error handling and logging
- [ ] Deploy to Heroku (staging)

### Phase 2: Core Integration & Form Building (Week 2)

#### Day 1-2: Arbox Integration
- [ ] Set up Arbox API client
- [ ] Implement customer sync functionality
- [ ] Create customer CRUD endpoints
- [ ] Build customer search functionality
- [ ] Handle Arbox webhooks (if available)

#### Day 3-4: WhatsApp Share Integration
- [ ] Build wa.me URL generator
- [ ] Create WhatsApp share button component
- [ ] Implement message template system
- [ ] Add message customization with variables
- [ ] Create "mark as sent" functionality
- [ ] Test on mobile and desktop
- [ ] Handle phone number formatting

#### Day 5-7: Custom Form Signing System
- [ ] Design form template data structure (JSON schema)
- [ ] Implement secure token generation for signing URLs
- [ ] Create public signing page route
- [ ] Build token validation middleware
- [ ] Implement token expiration logic
- [ ] Set up Supabase Storage for documents

### Phase 2.5: Document Processing & Signature System (Integrated into Weeks 2-3)

#### Document Upload & Conversion
- [ ] Install LibreOffice buildpack on Heroku (or set up CloudConvert API)
- [ ] Create document upload endpoint with Multer
- [ ] Implement file validation (type, size, malware check)
- [ ] Build DOC/DOCX to PDF conversion service
- [ ] Test conversion reliability
- [ ] Store original and converted files in Supabase Storage
- [ ] Generate file URLs (signed/public)

#### Signature Configuration
- [ ] Build signature position configuration API
- [ ] Create signature placement data structure (JSON)
- [ ] Implement PDF page dimension extraction
- [ ] Validate signature positions
- [ ] Store signature configs with templates

#### Customer Settings Implementation
- [ ] Create customer settings CRUD endpoints
- [ ] Build form assignment logic
- [ ] Implement default form retrieval
- [ ] Add settings validation

#### Signature Processing
- [ ] Build signature capture backend API
- [ ] Implement signature validation
- [ ] Create signature image processing (Base64 to PNG)
- [ ] Build PDF signature overlay using pdf-lib
- [ ] Position signature based on configuration
- [ ] Generate final signed PDF
- [ ] Store signed documents in Supabase Storage
- [ ] Create signed URL generation for downloads

### Phase 3: Frontend Development (Week 3)

#### Day 1-2: Setup & Authentication
- [ ] Initialize React app
- [ ] Set up routing (React Router)
- [ ] Implement Google Sign-In UI
- [ ] Create protected routes
- [ ] Design layout and navigation

#### Day 3-4: Document Template Management
- [ ] Build form template list view
- [ ] Create document upload interface (drag & drop)
- [ ] Implement file type validation (DOC/DOCX/PDF)
- [ ] Add PDF preview component
- [ ] Build signature position configurator (drag & drop on PDF)
- [ ] Visual signature box placement tool
- [ ] Template metadata editing

#### Day 5-6: Customer Management (CRUD) & Settings
- [ ] **Build customer list view with filters**
- [ ] **Create customer detail view with tabs (Info, Documents, Settings, Activity)**
- [ ] **Implement customer create/edit forms**
- [ ] **Add document status display per customer**
- [ ] **Build customer search interface**
- [ ] **Add soft delete with confirmation**
- [ ] **Implement bulk operations (assign forms, send documents, delete)**
- [ ] Add sync button for Arbox
- [ ] Display pagination and sorting
- [ ] Create customer settings panel
- [ ] Build form assignment interface
- [ ] Add customer notes field
- [ ] Create form request creation flow (send document)
- [ ] Add send confirmation dialog

#### Day 7: Public Signing Interface
- [ ] Create public signing page (no auth)
- [ ] Implement PDF viewer with signature overlays
- [ ] Build signature canvas component
- [ ] Add signature positioning based on config
- [ ] Create success/error pages
- [ ] Implement mobile-responsive design

### Phase 4: Dashboard & Status Tracking (Week 4)

#### Day 1-2: Dashboard Development
- [ ] **Build main dashboard with key metrics**
- [ ] **Create recent events feed (real-time)**
- [ ] **Build recently active customers section**
- [ ] **Add status breakdown charts**
- [ ] **Implement activity timeline chart**
- [ ] **Create attention required alerts (expiring docs, pending over X days)**
- [ ] Add date range filters
- [ ] Implement WebSocket for real-time updates (optional)

#### Day 3-4: Status Management & Form Requests
- [ ] Build form requests list view
- [ ] Create status filters and search
- [ ] Implement real-time status updates
- [ ] Add resend functionality
- [ ] Create detailed request view
- [ ] Build audit log viewer
- [ ] Add export functionality

#### Day 5: Analytics & Reporting
- [ ] Create advanced analytics page
- [ ] Build signature rate reports
- [ ] Add customer engagement metrics
- [ ] Implement data export (CSV/PDF)
- [ ] Create printable reports

#### Day 6-7: Testing & Polish
- [ ] End-to-end testing all flows
- [ ] Test customer CRUD operations
- [ ] Test document upload and signing
- [ ] Test dashboard real-time updates
- [ ] Fix bugs and edge cases
- [ ] Optimize performance
- [ ] Add loading states and skeletons
- [ ] Improve error messages and validation
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing

---

## Environment Variables

### Heroku Configuration
```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-app.herokuapp.com/auth/callback

# Arbox API
ARBOX_API_KEY=your-arbox-api-key
ARBOX_API_URL=https://api.arbox.io/v1

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.herokuapp.com
SESSION_SECRET=your-session-secret

# Signing Configuration
SIGNING_TOKEN_SECRET=your-jwt-secret-for-signing-tokens
SIGNING_TOKEN_EXPIRY=7d # Token expiry (e.g., 7d, 24h)
MAX_FILE_SIZE=10485760 # 10MB in bytes

# WhatsApp Configuration
DEFAULT_MESSAGE_TEMPLATE="שלום {customer_name},\n\nאנא חתום על {document_name}:\n{signing_url}\n\nהקישור יפוג בעוד {expiry_days} ימים."
COMPANY_NAME=שם החברה שלך

# Locale Configuration
DEFAULT_LOCALE=he-IL
DEFAULT_TIMEZONE=Asia/Jerusalem
DEFAULT_LANGUAGE=he

# Supabase Storage
STORAGE_BUCKET_TEMPLATES=form-templates
STORAGE_BUCKET_SIGNED_DOCS=signed-documents
```

---

## Document Upload & Signature Processing Workflow

### 1. Document Upload Process
```javascript
// Admin uploads document
POST /api/templates (multipart/form-data)
{
  name: "Gym Waiver",
  description: "Standard waiver",
  file: [uploaded file]
}

// Backend processing:
1. Validate file type (DOC/DOCX/PDF)
2. Check file size (< 10MB)
3. Scan for malware (optional but recommended)
4. Generate unique filename
5. Upload original to Supabase Storage: /templates/originals/{id}.{ext}
6. If DOC/DOCX:
   - Convert to PDF using LibreOffice
   - libreoffice --headless --convert-to pdf --outdir /tmp file.docx
7. Upload PDF to Supabase Storage: /templates/pdfs/{id}.pdf
8. Extract PDF metadata (page count, dimensions)
9. Save record to form_templates table
10. Return template ID and PDF URL
```

### 2. Signature Position Configuration
```javascript
// Admin configures where signatures should go
POST /api/templates/:id/signature-config
{
  "positions": [
    {
      "id": "sig_1",
      "page": 1,
      "x": 100,      // X coordinate (pixels from left)
      "y": 700,      // Y coordinate (pixels from top)
      "width": 200,
      "height": 60,
      "required": true,
      "label": "Customer Signature"
    }
  ]
}

// Frontend shows PDF preview with draggable signature boxes
// Admin drags boxes to desired positions
// Coordinates saved to signature_config JSONB field
```

### 3. Customer Settings Assignment
```javascript
// Admin assigns form to customer
POST /api/customers/:id/settings
{
  "default_form_template_id": "uuid-of-template",
  "notes": "Customer prefers digital signing"
}

// When sending form request, system checks customer_settings first
// If assigned form exists, pre-select it
```

### 4. Token Generation & Sending
```javascript
// When admin sends form request
const token = jwt.sign(
  {
    formRequestId: request.id,
    customerId: customer.id,
    templateId: template.id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  SIGNING_TOKEN_SECRET
);

const signingUrl = `${FRONTEND_URL}/sign/${token}`;
```

### 5. Customer Opens Link
```javascript
// Validate token on page load
GET /sign/:token/validate
- Check token signature
- Verify not expired
- Check not already signed
- Return template info if valid

// Load document
GET /sign/:token/document
- Return PDF URL from Supabase Storage
- Include signature configuration
```

### 6. Document Display with Signature Areas
```javascript
// Frontend displays PDF using react-pdf
<Document file={pdfUrl}>
  <Page pageNumber={1}>
    {/* Overlay signature boxes based on config */}
    {signatureConfig.positions.map(pos => (
      <SignatureBox
        key={pos.id}
        position={pos}
        onClick={() => openSignatureCanvas(pos)}
      />
    ))}
  </Page>
</Document>
```

### 7. Signature Capture
```javascript
// Customer clicks signature box
// Modal opens with signature canvas
<SignatureCanvas
  onEnd={() => {
    const signatureData = canvas.toDataURL('image/png');
    // Base64 encoded PNG
  }}
/>
```

### 8. Form Submission
```javascript
POST /sign/:token/submit
{
  "signatures": [
    {
      "position_id": "sig_1",
      "signature_data": "data:image/png;base64,iVBORw0KGgoAAAA...",
      "signer_name": "John Doe"
    }
  ]
}

// Backend processing:
1. Validate token again
2. Validate signature data
3. Store signature in signatures table
4. Load original PDF from Supabase
5. Overlay signature using pdf-lib
6. Add metadata (date, IP, signer info)
7. Generate final signed PDF
8. Upload to Supabase Storage: /signed-documents/{id}.pdf
9. Update status to "signed"
10. Store signed document record
```

### 9. PDF Signature Overlay with pdf-lib
```javascript
const { PDFDocument } = require('pdf-lib');

async function addSignatureToPDF(pdfBuffer, signatures) {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  for (const sig of signatures) {
    const page = pdfDoc.getPage(sig.page_number - 1);
    
    // Decode base64 signature image
    const signatureImage = await pdfDoc.embedPng(sig.signature_data);
    
    // Add signature to PDF at specified position
    page.drawImage(signatureImage, {
      x: sig.position_x,
      y: page.getHeight() - sig.position_y - sig.height, // Convert to PDF coordinates
      width: sig.width,
      height: sig.height
    });
    
    // Add timestamp
    const timestamp = new Date().toISOString();
    page.drawText(`Signed by ${sig.signer_name} on ${timestamp}`, {
      x: sig.position_x,
      y: page.getHeight() - sig.position_y - sig.height - 15,
      size: 8
    });
  }
  
  // Save modified PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

### 10. Status Updates & Audit Trail
```javascript
// Audit log entries created at each step:
- Document uploaded → "template_created"
- Signature config saved → "signature_config_updated"
- Customer settings assigned → "customer_settings_updated"
- Token created → "form_request_created"
- WhatsApp sent → "whatsapp_sent"
- Link clicked → "form_opened"
- Signature drawn → "signature_captured"
- Form submitted → "form_signed"
- PDF generated → "document_generated"
```

---

## Security Considerations

### 1. Authentication & Authorization
- Implement Supabase Row Level Security (RLS)
- Use JWT tokens for API authentication
- Separate admin and public routes
- Session management with secure cookies
- Rate limiting to prevent abuse

### 2. Signing Security
- **Token-based Access**: Unique, one-time-use signing tokens
- **Expiration**: Tokens expire after configurable period (default 7 days)
- **IP Tracking**: Record IP address of signer
- **User Agent Logging**: Track device information
- **Prevent Reuse**: Mark token as used after signing
- **Signature Validation**: Ensure signature data is valid PNG/SVG
- **Timestamp**: Add immutable timestamp to signed documents

### 3. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Sanitize all user inputs
- Implement CORS properly
- Secure file storage with Supabase RLS policies
- Generate signed URLs for document downloads (expiring)

### 4. API Security
- Validate all webhook signatures (Twilio)
- Use environment variables for secrets
- Implement request validation middleware
- Add API key rotation strategy
- Rate limit all public endpoints
- CSRF protection for form submissions

### 5. Privacy Compliance
- Add data retention policies
- Implement data deletion endpoints
- Create privacy policy
- Add consent management
- GDPR-compliant data handling
- Secure document storage and access

### 6. Audit Trail
- Log all access to signing pages
- Track all status changes
- Record all admin actions
- Store complete signing history
- Immutable audit logs

---

## User Flow

### 1. Admin Login
```
User → Opens App → Google Sign-In → Supabase Auth → Dashboard
```

### 2. Admin Uploads Document Template
```
Admin → Form Templates Section →
Clicks "Upload New Template" →
Selects DOC/DOCX/PDF file →
System validates file (type, size) →
If DOC/DOCX: Convert to PDF →
Store original + PDF in Supabase Storage →
Admin configures signature placement (drag & drop on PDF preview) →
Saves Template
```

### 3. Admin Configures Customer Settings
```
Admin → Customer List →
Selects Customer →
Opens "Settings" tab →
Chooses default form template from dropdown →
Adds optional notes →
Saves Settings
```

### 4. Send Form Request
```
Admin → Selects Customer →
System checks if customer has assigned form (from settings) →
If yes: Pre-selects assigned form →
If no: Admin selects form manually →
System generates unique signing token →
System creates signing URL (e.g., app.com/sign/abc123xyz) →
Admin clicks "Send via WhatsApp" button →
WhatsApp opens with pre-filled message containing link →
Admin sends message from their own WhatsApp →
Admin confirms "Mark as Sent" →
Status: "Sent"
```

### 5. Customer Receives & Opens
```
Customer → Receives WhatsApp →
Clicks Signing Link →
Token validated (checks expiry) →
Document (PDF) loads in browser →
Signature boxes highlighted →
Status: "Opened"
```

### 6. Customer Signs Document
```
Customer → Reviews full document (scrollable PDF) →
Can zoom and read all content →
Scrolls to bottom/continues to sign →
Enters full name in text field →
Draws signature on canvas (touch-optimized) →
Checks "I agree" checkbox →
Reviews signature preview →
Clicks "Submit Signature" →
Status: "Signed"
```
```
Customer → Views uploaded document →
Scrolls to signature area(s) →
Clicks signature box →
Draws signature on canvas →
Optionally types name/date →
Clicks Submit →
Backend overlays signature on PDF →
PDF stored in Supabase Storage →
Status: "Signed"
```

### 7. Admin Tracks Status
```
Admin → Views Dashboard →
Sees real-time status updates →
Filters by status/date/customer →
Downloads signed PDF →
Views signature details
```

---

## Customer Management (CRUD)

### Customer List View

The customer section provides complete CRUD (Create, Read, Update, Delete) operations with comprehensive document status tracking.

#### List View Features
```
┌────────────────────────────────────────────────────────────────────────┐
│ Customers                                    [+ Add Customer] [Sync]   │
├────────────────────────────────────────────────────────────────────────┤
│ Search: [___________]  Filter: [All ▼] [Export]                       │
├────────────────────────────────────────────────────────────────────────┤
│ Name          Phone          Email         Documents  Status  Action   │
├────────────────────────────────────────────────────────────────────────┤
│ John Doe      +1234567890    john@ex.com   3/5       🟢 Active  [...]  │
│               📄 Last sent: 2 days ago                                  │
│               ✅ Signed: 3  ⏳ Pending: 2                               │
├────────────────────────────────────────────────────────────────────────┤
│ Jane Smith    +1234567891    jane@ex.com   5/5       🟢 Active  [...]  │
│               📄 Last sent: 1 week ago                                  │
│               ✅ Signed: 5  ⏳ Pending: 0                               │
├────────────────────────────────────────────────────────────────────────┤
│ Bob Johnson   +1234567892    bob@ex.com    0/1       🟡 Pending [...]  │
│               📄 Last sent: 3 days ago                                  │
│               ✅ Signed: 0  ⏳ Pending: 1                               │
└────────────────────────────────────────────────────────────────────────┘
```

#### Filter Options
- **All Customers**
- **Active Customers** (has signed at least one document)
- **Pending Signatures** (has documents awaiting signature)
- **Never Sent** (no documents sent)
- **Expired Documents** (has expired unsigned documents)
- **With Assigned Forms** (has default form assigned)
- **No Assigned Forms** (needs form assignment)

#### Sort Options
- Name (A-Z, Z-A)
- Last Activity (Recent first)
- Documents Sent (Most/Least)
- Signature Rate (High/Low)
- Date Added (Newest/Oldest)

### Customer Detail View

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                    [Edit] [Delete]│
├─────────────────────────────────────────────────────────────────────┤
│ John Doe                                                             │
│ 📞 +1234567890  ✉️ john@example.com                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Tabs: [Info] [Documents] [Settings] [Activity]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ DOCUMENT STATUS SUMMARY                                             │
│ ┌───────────────┬───────────────┬───────────────┬─────────────┐    │
│ │ Total Sent    │ Signed        │ Pending       │ Expired     │    │
│ │      5        │      3        │      2        │      0      │    │
│ └───────────────┴───────────────┴───────────────┴─────────────┘    │
│                                                                      │
│ RECENT DOCUMENTS                                [+ Send Document]    │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Gym Liability Waiver                             ✅ Signed    │   │
│ │ Sent: Jan 15, 2025 → Signed: Jan 16, 2025                    │   │
│ │ [View Document]                                               │   │
│ ├──────────────────────────────────────────────────────────────┤   │
│ │ Personal Training Agreement                      ⏳ Pending   │   │
│ │ Sent: Jan 20, 2025 → Expires: Jan 27, 2025                   │   │
│ │ [Resend] [View]                                               │   │
│ ├──────────────────────────────────────────────────────────────┤   │
│ │ COVID-19 Acknowledgment                          ✅ Signed    │   │
│ │ Sent: Dec 10, 2024 → Signed: Dec 10, 2024                    │   │
│ │ [View Document]                                               │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Customer Detail Tabs

#### 1. Info Tab
- Personal Information (Name, Email, Phone, DOB, Address)
- Account Status (Active/Inactive)
- Arbox Customer ID
- Date Added
- Last Activity
- Edit inline or via modal

#### 2. Documents Tab
- List all documents sent to customer
- Status indicators with color coding:
  - 🟢 Signed (green)
  - 🟡 Pending (yellow)
  - 🔵 Opened (blue)
  - ⚫ Expired (gray)
  - 🔴 Failed (red)
- Timeline view of document lifecycle
- Quick actions: Resend, View, Download
- Filter by status, date range, template

#### 3. Settings Tab
- Default form template assignment
- Custom settings (reminder frequency, language, etc.)
- Notes field
- WhatsApp preferences
- Auto-send configuration

#### 4. Activity Tab
- Chronological activity feed
- Events:
  - Document sent
  - Document opened
  - Document signed
  - Settings changed
  - Customer updated
- Includes timestamps, IP addresses, user agents
- Admin actions logged

### CRUD Operations

#### Create Customer
```javascript
POST /api/customers
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "date_of_birth": "1990-01-15",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001",
  "arbox_customer_id": "arbox-123" // optional
}

Response:
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "is_active": true,
  "total_documents_sent": 0,
  "total_documents_signed": 0,
  "created_at": "2025-01-20T10:00:00Z"
}
```

#### Read Customer (with document status)
```javascript
GET /api/customers/:id?include=documents,settings

Response:
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "total_documents_sent": 5,
  "total_documents_signed": 3,
  "last_document_sent_at": "2025-01-20T10:00:00Z",
  "last_document_signed_at": "2025-01-16T14:30:00Z",
  "document_summary": {
    "signed": 3,
    "pending": 2,
    "opened": 1,
    "expired": 0,
    "failed": 0
  },
  "settings": {
    "default_form_template_id": "template-uuid",
    "default_form_template_name": "Gym Liability Waiver"
  },
  "recent_documents": [
    {
      "id": "doc-uuid",
      "form_template_name": "Gym Liability Waiver",
      "status": "signed",
      "sent_at": "2025-01-15T10:00:00Z",
      "signed_at": "2025-01-16T14:30:00Z"
    }
  ]
}
```

#### Update Customer
```javascript
PUT /api/customers/:id
{
  "first_name": "John",
  "last_name": "Doe-Smith",
  "email": "newemail@example.com",
  "phone_number": "+1234567890",
  "is_active": true
}

Response: Updated customer object
```

#### Delete Customer (Soft Delete)
```javascript
DELETE /api/customers/:id

// Marks customer as deleted (sets deleted_at timestamp)
// Does not actually remove from database
// All associated form requests remain intact
```

#### List Customers with Filters
```javascript
GET /api/customers?page=1&limit=20&filter=pending&sort=last_activity

Query Parameters:
- page: Page number (default: 1)
- limit: Results per page (default: 20, max: 100)
- filter: all | active | pending | never_sent | expired | with_forms | no_forms
- sort: name_asc | name_desc | activity_desc | documents_desc | signature_rate
- search: Search by name, email, or phone

Response:
{
  "data": [...customers],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  },
  "summary": {
    "total_customers": 150,
    "active_customers": 120,
    "pending_signatures": 45
  }
}
```

### Document Status Tracking

#### Status Display Logic
- **🟢 Active**: Has signed at least one document
- **🟡 Pending**: Has documents awaiting signature
- **⚪ New**: Never sent any documents
- **🔴 Expired**: Has expired unsigned documents

#### Document Statistics Per Customer
```javascript
GET /api/customers/:id/document-status

Response:
{
  "customer_id": "uuid",
  "statistics": {
    "total_sent": 5,
    "signed": 3,
    "pending": 2,
    "opened": 1,
    "expired": 0,
    "failed": 0,
    "signature_rate": 60.0, // percentage
    "avg_time_to_sign_hours": 12.5
  },
  "by_template": [
    {
      "template_name": "Gym Liability Waiver",
      "sent": 2,
      "signed": 2,
      "pending": 0
    },
    {
      "template_name": "PT Agreement",
      "sent": 3,
      "signed": 1,
      "pending": 2
    }
  ],
  "recent_activity": [
    {
      "event": "document_signed",
      "template": "Gym Liability Waiver",
      "timestamp": "2025-01-16T14:30:00Z"
    }
  ]
}
```

### Bulk Operations

```javascript
POST /api/customers/bulk-action
{
  "action": "send_document",
  "customer_ids": ["uuid1", "uuid2", "uuid3"],
  "form_template_id": "template-uuid"
}

POST /api/customers/bulk-action
{
  "action": "assign_form",
  "customer_ids": ["uuid1", "uuid2"],
  "form_template_id": "template-uuid"
}

POST /api/customers/bulk-action
{
  "action": "delete",
  "customer_ids": ["uuid1", "uuid2"]
}
```

---

## Dashboard

### Dashboard Overview

The dashboard provides real-time insights into document activity, customer engagement, and system performance.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                        Jan 20, 2025 10:30 AM│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ KEY METRICS (Last 30 Days)                                          │
│ ┌────────────┬────────────┬────────────┬────────────┬────────────┐ │
│ │Total       │Documents   │Documents   │Pending     │Avg Sign    │ │
│ │Customers   │Sent        │Signed      │Signatures  │Time        │ │
│ │   156      │    342     │    298     │    44      │  8.3 hrs   │ │
│ │ +12 (8%)   │ +45 (15%)  │ +40 (15%)  │ +4 (10%)   │ -2.1 hrs   │ │
│ └────────────┴────────────┴────────────┴────────────┴────────────┘ │
│                                                                      │
│ ┌─────────────────────────────┬────────────────────────────────┐   │
│ │ RECENT EVENTS               │ RECENTLY ACTIVE CUSTOMERS      │   │
│ ├─────────────────────────────┼────────────────────────────────┤   │
│ │ 2 min ago                   │ John Doe                       │   │
│ │ ✅ John Doe signed          │ 📄 Signed Gym Waiver           │   │
│ │    "Gym Liability Waiver"   │ 🕐 2 minutes ago               │   │
│ │                             │ [View Customer]                │   │
│ │ 15 min ago                  ├────────────────────────────────┤   │
│ │ 📤 Admin sent document to   │ Jane Smith                     │   │
│ │    Jane Smith               │ 👁️ Opened PT Agreement         │   │
│ │                             │ 🕐 15 minutes ago              │   │
│ │ 1 hour ago                  │ [View Customer]                │   │
│ │ 👁️ Bob Johnson opened       ├────────────────────────────────┤   │
│ │    "PT Agreement"           │ Sarah Williams                 │   │
│ │                             │ 📤 Received COVID Form         │   │
│ │ 2 hours ago                 │ 🕐 1 hour ago                  │   │
│ │ 📤 Admin sent document to   │ [View Customer]                │   │
│ │    Sarah Williams           ├────────────────────────────────┤   │
│ │                             │ [View All Customers]           │   │
│ │ [View All Events]           │                                │   │
│ └─────────────────────────────┴────────────────────────────────┘   │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ DOCUMENTS BY STATUS                                         │    │
│ │                                                             │    │
│ │ ████████████████████████████ Signed (298) - 87%            │    │
│ │ ████ Pending (44) - 13%                                     │    │
│ │ █ Expired (8) - 2%                                          │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│ ⚠️ ATTENTION REQUIRED                                                │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 8 documents expiring in next 3 days                          │   │
│ │ 5 customers with pending signatures over 5 days             │   │
│ │ [Send Reminders]                            [View Details]   │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ACTIVITY TIMELINE (Last 7 Days)                                     │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │     📊 Chart showing documents sent vs signed by day         │   │
│ │     Line graph or bar chart                                  │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Dashboard API Endpoints

#### Get Dashboard Overview
```javascript
GET /api/dashboard

Response:
{
  "stats": {
    "total_customers": 156,
    "customers_change_30d": 12,
    "documents_sent_30d": 342,
    "documents_sent_change": 45,
    "documents_signed_30d": 298,
    "documents_signed_change": 40,
    "pending_signatures": 44,
    "pending_change": 4,
    "avg_signature_time_hours": 8.3,
    "avg_time_change": -2.1,
    "signature_rate": 87.1
  },
  "alerts": {
    "expiring_soon": 8,
    "pending_over_5_days": 5,
    "failed_deliveries": 2
  }
}
```

#### Get Recent Events
```javascript
GET /api/dashboard/recent-events?limit=20

Response:
{
  "events": [
    {
      "id": "event-uuid",
      "type": "document_signed",
      "customer_name": "John Doe",
      "customer_id": "customer-uuid",
      "form_template_name": "Gym Liability Waiver",
      "timestamp": "2025-01-20T10:28:00Z",
      "time_ago": "2 minutes ago",
      "icon": "✅"
    },
    {
      "id": "event-uuid",
      "type": "document_sent",
      "customer_name": "Jane Smith",
      "customer_id": "customer-uuid",
      "form_template_name": "PT Agreement",
      "admin_name": "Admin User",
      "timestamp": "2025-01-20T10:15:00Z",
      "time_ago": "15 minutes ago",
      "icon": "📤"
    },
    {
      "id": "event-uuid",
      "type": "document_opened",
      "customer_name": "Bob Johnson",
      "customer_id": "customer-uuid",
      "form_template_name": "PT Agreement",
      "timestamp": "2025-01-20T09:30:00Z",
      "time_ago": "1 hour ago",
      "icon": "👁️"
    }
  ]
}
```

#### Get Recently Active Customers
```javascript
GET /api/dashboard/recent-customers?limit=10

Response:
{
  "customers": [
    {
      "id": "customer-uuid",
      "name": "John Doe",
      "last_activity": {
        "type": "document_signed",
        "form_name": "Gym Liability Waiver",
        "timestamp": "2025-01-20T10:28:00Z",
        "time_ago": "2 minutes ago"
      },
      "document_summary": {
        "total": 5,
        "signed": 4,
        "pending": 1
      }
    },
    {
      "id": "customer-uuid",
      "name": "Jane Smith",
      "last_activity": {
        "type": "document_opened",
        "form_name": "PT Agreement",
        "timestamp": "2025-01-20T10:15:00Z",
        "time_ago": "15 minutes ago"
      },
      "document_summary": {
        "total": 3,
        "signed": 2,
        "pending": 1
      }
    }
  ]
}
```

#### Get Status Breakdown
```javascript
GET /api/dashboard/charts/status-breakdown

Response:
{
  "breakdown": [
    { "status": "signed", "count": 298, "percentage": 87.1 },
    { "status": "pending", "count": 44, "percentage": 12.9 },
    { "status": "opened", "count": 12, "percentage": 3.5 },
    { "status": "expired", "count": 8, "percentage": 2.3 },
    { "status": "failed", "count": 2, "percentage": 0.6 }
  ]
}
```

#### Get Activity Timeline
```javascript
GET /api/dashboard/charts/activity-timeline?days=7

Response:
{
  "timeline": [
    {
      "date": "2025-01-14",
      "sent": 45,
      "signed": 38,
      "opened": 42
    },
    {
      "date": "2025-01-15",
      "sent": 52,
      "signed": 44,
      "opened": 48
    },
    // ... more days
  ]
}
```

### Real-time Updates

For live dashboard updates, implement WebSocket or Server-Sent Events:

```javascript
// WebSocket connection
const ws = new WebSocket('wss://your-app.herokuapp.com/dashboard/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update dashboard with new event
  // {
  //   "type": "document_signed",
  //   "customer_name": "John Doe",
  //   "form_template_name": "Gym Waiver",
  //   "timestamp": "2025-01-20T10:28:00Z"
  // }
};
```

---

## Customer Management (CRUD)

### Overview
The customer settings feature allows admins to pre-configure which form template each customer should receive by default. This streamlines the sending process and ensures customers always get the correct documents.

### Settings Structure
```json
{
  "customer_id": "uuid",
  "default_form_template_id": "uuid",
  "settings": {
    "auto_send_on_signup": false,
    "reminder_frequency_days": 3,
    "preferred_language": "en",
    "custom_message": "Please sign your waiver"
  },
  "notes": "VIP customer - priority handling"
}
```

### Use Cases

#### 1. New Customer Onboarding
```
Customer signs up via Arbox →
Webhook triggers sync to system →
Auto-assign default waiver form →
Optionally auto-send form request
```

#### 2. Different Forms for Different Customer Types
```
Gym Members → Liability Waiver
Personal Training Clients → PT Agreement + Liability Waiver
Corporate Members → Corporate Agreement
Minors → Parental Consent Form
```

#### 3. Streamlined Sending
```
Admin clicks customer →
System shows assigned form (pre-selected) →
Admin confirms and sends →
No need to search for correct form
```

### Admin Interface Features

**Customer List View:**
- Shows which customers have forms assigned (icon indicator)
- Filter: "Customers with no assigned form"
- Bulk assign forms to multiple customers

**Customer Detail View:**
```
┌─────────────────────────────────┐
│ Customer: John Doe              │
├─────────────────────────────────┤
│ Tabs: [Info] [Settings] [Forms]│
│                                 │
│ Settings Tab:                   │
│ ┌─────────────────────────────┐ │
│ │ Default Form Template:      │ │
│ │ [Dropdown: Select Form]     │ │
│ │                             │ │
│ │ Notes:                      │ │
│ │ [Text Area]                 │ │
│ │                             │ │
│ │ [Save Settings]             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Send Form Flow:**
```
1. Select customer
2. System checks customer_settings
3. If default_form_template_id exists:
   → Pre-select that form
   → Show indicator: "Using customer's default form"
4. Admin can override if needed
5. Send
```

### API Integration

**Get Customer with Settings:**
```javascript
GET /api/customers/:id?include=settings

Response:
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "settings": {
    "default_form_template_id": "template-uuid",
    "default_form_template_name": "Gym Liability Waiver",
    "notes": "VIP customer"
  }
}
```

**Bulk Assign Forms:**
```javascript
POST /api/customer-settings/bulk-assign
{
  "customer_ids": ["uuid1", "uuid2", "uuid3"],
  "form_template_id": "template-uuid"
}
```

### Database Queries

**Find customers without assigned forms:**
```sql
SELECT c.* 
FROM customers c
LEFT JOIN customer_settings cs ON c.id = cs.customer_id
WHERE cs.id IS NULL;
```

**Most used form templates:**
```sql
SELECT 
  ft.name,
  COUNT(cs.id) as assigned_count
FROM form_templates ft
JOIN customer_settings cs ON ft.id = cs.default_form_template_id
GROUP BY ft.id
ORDER BY assigned_count DESC;
```

---

## Key Features

### Must-Have (MVP)

#### Authentication & Security
- ✅ Google Sign-In authentication
- ✅ Row-level security (RLS)
- ✅ Secure token-based signing URLs
- ✅ Audit trail for all actions

#### Customer Management (CRUD)
- ✅ **Full customer CRUD (Create, Read, Update, Delete)**
- ✅ **Customer list with document status indicators**
- ✅ **Customer detail view with tabs (Info, Documents, Settings, Activity)**
- ✅ **Document status tracking per customer (sent/signed/pending counts)**
- ✅ **Customer search and filtering**
- ✅ **Bulk operations (assign forms, send docs, delete)**
- ✅ **Soft delete with restore capability**
- ✅ Customer sync from Arbox
- ✅ Customer settings - assign default forms

#### Dashboard
- ✅ **Real-time dashboard with key metrics**
- ✅ **Recent document events feed (live updates)**
- ✅ **Recently active customers section**
- ✅ **Document status breakdown charts**
- ✅ **Activity timeline graph**
- ✅ **Attention required alerts (expiring, pending)**
- ✅ **Statistics (30-day trends, signature rates)**

#### Document Management
- ✅ **Document upload (DOC/DOCX/PDF)**
- ✅ **Automatic DOC/DOCX to PDF conversion**
- ✅ **Visual signature position configurator**
- ✅ Document storage in Supabase
- ✅ Signed document download

#### Signing Workflow
- ✅ **Simple WhatsApp share via wa.me links (no API needed)**
- ✅ **Send from admin's own WhatsApp account**
- ✅ **Pre-filled messages with document details**
- ✅ **Message template customization**
- ✅ Mobile-first public signing page (no login required)
- ✅ Accessible to anyone with link - WCAG 2.1 AA compliant
- ✅ Full document content visible and readable before signing
- ✅ Responsive PDF viewer with zoom and scroll
- ✅ Touch-optimized signature canvas for mobile devices
- ✅ Name + Signature collection
- ✅ Works on all devices: mobile (iOS/Android), tablet, desktop
- ✅ Portrait and landscape orientation support
- ✅ PDF signature overlay with metadata
- ✅ Manual status tracking (created → sent → opened → signed)
- ✅ Signature canvas with drag & drop placement
- ✅ PDF signature overlay
- ✅ Real-time WhatsApp delivery status
- ✅ Status tracking (pending → sent → opened → signed)

### Nice-to-Have (Future)
- 📋 Bulk send to multiple customers
- 📊 Advanced analytics and reporting
- 🔔 Email notifications for status changes
- 📱 Mobile app for customers
- 🌐 Multi-language support
- 🔄 Automated reminders for unsigned forms based on customer settings
- 🎨 Custom branding/white-label signing pages
- ✍️ Multiple signature types (typed, drawn, uploaded)
- 📄 Document template library/marketplace
- 🔐 Two-factor authentication for admins
- 💾 Auto-save draft responses
- 📧 Email fallback if WhatsApp fails
- 📝 Digital watermarking on signed documents
- 🔒 Document encryption at rest
- 📋 Multiple signers per document
- 🎯 Smart form recommendation based on customer profile
- 📅 Scheduled document sending
- 🔄 Document version control

---

## Testing Strategy

### Unit Tests
- API endpoint tests
- Database query tests
- Integration module tests
- Utility function tests

### Integration Tests
- Arbox API integration
- Twilio WhatsApp delivery
- DocuSign workflow
- Webhook processing

### End-to-End Tests
- Complete user flows
- Authentication flows
- Form sending process
- Status update workflows

---

## Deployment Checklist

### Pre-Deploy
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] Domain configured (if custom)
- [ ] API keys validated

### Post-Deploy
- [ ] Verify Google Sign-In works
- [ ] Test Arbox integration
- [ ] Test WhatsApp share button (wa.me link)
- [ ] Test document signing flow
- [ ] Check error logging
- [ ] Verify PDF generation and signature overlay

---

## Monitoring & Maintenance

### Monitoring
- Set up Heroku application monitoring
- Configure Supabase performance alerts
- Monitor Twilio usage and credits
- Track DocuSign API usage
- Set up error tracking (e.g., Sentry)

### Maintenance
- Regular security updates
- Database backups (automated via Supabase)
- Log rotation and archival
- API usage monitoring
- Performance optimization

---

## Cost Estimation

### Monthly Operational Costs
- **Heroku**: $7-25 (Eco/Basic dynos) or $25-50 (Standard)
- **Supabase**: $0-25 (Free tier up to 500MB - Pro for 8GB)
- **Domain (optional)**: ~$12/year ($1/month)
- **WhatsApp**: $0 (using wa.me links, free)
- **Total**: ~$10-50/month

### Cost Savings vs External Services
- **WhatsApp Business API (Twilio)**: $0.005-0.01 per message (eliminated)
- **DocuSign**: $40-100/month (eliminated)
- **HelloSign**: $20-60/month (eliminated)
- **Estimated Total Savings**: $60-160/month

### Scale Considerations
- **Low Volume** (0-100 forms/month): Free tier possible (~$10/month)
- **Medium Volume** (100-1000 forms/month): ~$25-35/month
- **High Volume** (1000+ forms/month): ~$40-60/month + higher Supabase storage

### ROI Benefits
- No per-message WhatsApp fees
- No per-document signing fees
- Predictable monthly costs
- Scales with actual usage

---

## Technical Approach Decisions

### Why Custom Form Signing?

**Advantages:**
- ✅ **Cost Savings**: No per-document or monthly signing service fees
- ✅ **Full Control**: Complete customization of signing experience
- ✅ **Data Ownership**: All data stays in your infrastructure
- ✅ **No API Limits**: No third-party rate limits or quotas
- ✅ **Branding**: Fully white-label experience
- ✅ **Privacy**: Better data privacy for customers
- ✅ **Integration**: Seamless integration with your workflow

**Trade-offs:**
- ⚠️ **Development Time**: More initial development required
- ⚠️ **Maintenance**: Responsibility for bug fixes and updates
- ⚠️ **Legal**: May need legal review for validity (varies by jurisdiction)
- ⚠️ **Features**: Advanced features (e.g., notarization) not available

### Form Builder Approach
- **JSON-based Schema**: Flexible and extensible form definitions
- **React Components**: Reusable field components
- **Validation**: Client and server-side validation
- **Responsive**: Mobile-first design for signing on any device

### PDF Generation Strategy
- **pdf-lib**: Lightweight, browser-compatible, good for adding signatures
- **PDFKit**: Server-side generation with rich formatting
- **Strategy**: Use PDFKit for generation, pdf-lib for signature overlay

### WhatsApp Alternatives
If WhatsApp is unavailable or expensive:
- **SMS Fallback**: Send SMS instead of WhatsApp
- **Email**: Traditional email with signing links
- **Both**: WhatsApp primary, email backup
- **Custom**: In-app notifications (if building mobile app later)

---

## Support & Documentation

### User Documentation
- Admin user guide
- FAQ section
- Video tutorials
- Troubleshooting guide

### Developer Documentation
- API documentation (Swagger)
- Setup guide
- Architecture documentation
- Deployment procedures

---

## Timeline Summary

- **Week 1**: Foundation & Setup (Auth, Database, Basic API)
- **Week 2**: Core Integrations (Arbox, WhatsApp, Token System)
- **Week 2-3**: PDF Generation & Signature Processing (parallel)
- **Week 3**: Frontend Development (Admin + Public Signing)
- **Week 4**: Dashboard, Testing & Polish
- **Week 5** (Optional): Additional features and refinements

**Total**: 4-5 weeks for MVP

### Detailed Breakdown
- **Backend Core**: 1.5 weeks
- **Integrations**: 1 week
- **Custom Signing System**: 1.5 weeks
- **Frontend**: 1 week
- **Testing & Polish**: 1 week

---

## Next Steps

1. **Immediate Actions**:
   - Set up Supabase project and create storage buckets
   - Create Heroku app
   - Get Arbox API credentials
   - Set up Google OAuth credentials

2. **Week 1 Kickoff**:
   - Initialize Git repository
   - Set up development environment
   - Create database schema in Supabase
   - Test PDF generation libraries
   - Create project roadmap in GitHub

3. **Technical Proof of Concept**:
   - Build simple form-to-PDF conversion
   - Test signature canvas and overlay
   - Verify WhatsApp message delivery
   - Validate Arbox API access

4. **Legal & Compliance** (Recommended):
   - Review electronic signature laws in your jurisdiction
   - Add terms of service for signing
   - Ensure GDPR/privacy compliance if applicable
   - Add signature disclosure statements

5. **Stakeholder Review**:
   - Review technical architecture
   - Confirm requirements
   - Approve service choices
   - Set success metrics
   - Define launch criteria
