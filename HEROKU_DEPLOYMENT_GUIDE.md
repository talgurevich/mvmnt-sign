# Heroku Deployment Guide

## Prerequisites
- Heroku account (you have this)
- Heroku CLI installed (already installed)
- Git repository set up (already done)

---

## Part 1: Deploy Backend API

### Step 1: Log in to Heroku
```bash
heroku login
```
Press any key when prompted to open browser and complete login.

### Step 2: Create Heroku App for Backend
```bash
cd backend
heroku create mvmnt-sign-api
```
This creates an app called `mvmnt-sign-api`. If this name is taken, Heroku will suggest alternatives or you can choose a different name.

### Step 3: Set Environment Variables for Backend
Run these commands one by one in the `backend` directory:

```bash
# Supabase Configuration
heroku config:set SUPABASE_URL=https://meqwsahhtxwihdqazesi.supabase.co
heroku config:set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcXdzYWhodHh3aWhkcWF6ZXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDQyMjgsImV4cCI6MjA3NjA4MDIyOH0.eBKEpETFw32DxI-J0vTPsUi8Jy2fZZ58g_uNhmKJ0N4
heroku config:set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcXdzYWhodHh3aWhkcWF6ZXNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUwNDIyOCwiZXhwIjoyMDc2MDgwMjI4fQ.Uj0_VGJhi9PYMZhE72Eh-R4mC2sodGa-9uwiCZtsnWg

# Application Configuration
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set SIGNING_TOKEN_SECRET=$(openssl rand -base64 32)
heroku config:set SIGNING_TOKEN_EXPIRY=7d

# Storage Buckets
heroku config:set STORAGE_BUCKET_TEMPLATES=form-templates
heroku config:set STORAGE_BUCKET_SIGNED_DOCS=signed-documents

# Company Info
heroku config:set COMPANY_NAME=MVMNT

# Arbox API (if you use it)
heroku config:set ARBOX_API_KEY=33b2b076-c6bd-5ba3-9afc-bbce4715
heroku config:set ARBOX_API_URL=https://api.arboxapp.com/index.php/api/v2

# Locale
heroku config:set DEFAULT_LOCALE=he-IL
heroku config:set DEFAULT_TIMEZONE=Asia/Jerusalem
heroku config:set DEFAULT_LANGUAGE=he

# Security
heroku config:set RATE_LIMIT_WINDOW_MS=900000
heroku config:set RATE_LIMIT_MAX_REQUESTS=100

# File Upload
heroku config:set MAX_FILE_SIZE=10485760
```

**IMPORTANT**: The FRONTEND_URL will be set after we deploy the frontend in Part 2.

### Step 4: Initialize Git in Backend Directory
```bash
# Make sure you're in the backend directory
cd backend

# Initialize a new git repo for this subdirectory
git init
git add .
git commit -m "Initial backend deployment"
```

### Step 5: Deploy Backend to Heroku
```bash
# Add Heroku remote
heroku git:remote -a mvmnt-sign-api

# Deploy
git push heroku master
```

### Step 6: Verify Backend Deployment
```bash
heroku open
```
This should open your backend API. You should see a JSON response with service info.

Or check the health endpoint:
```bash
curl https://mvmnt-sign-api.herokuapp.com/health
```

---

## Part 2: Deploy Frontend

### Step 1: Create Heroku App for Frontend
```bash
cd ../frontend
heroku create mvmnt-sign-app
```

### Step 2: Configure Frontend for Production Build

First, update the frontend to use environment variables. Create a `.env.production` file:

```bash
# In the frontend directory
cat > .env.production << 'EOF'
VITE_API_URL=https://mvmnt-sign-api.herokuapp.com
EOF
```

### Step 3: Add Static Server Package

The frontend needs a server to serve the built files. Add this to `package.json`:

```bash
npm install --save serve
```

Then update `package.json` scripts to include a start script for production.

### Step 4: Create Procfile for Frontend

A Procfile already needs to be created in the frontend directory:

```bash
echo "web: npm run build && npx serve -s dist -p \$PORT" > Procfile
```

### Step 5: Initialize Git in Frontend Directory
```bash
# Make sure you're in the frontend directory
cd frontend

# Initialize a new git repo
git init
git add .
git commit -m "Initial frontend deployment"
```

### Step 6: Deploy Frontend to Heroku
```bash
# Add Heroku remote
heroku git:remote -a mvmnt-sign-app

# Deploy
git push heroku master
```

### Step 7: Open Frontend App
```bash
heroku open
```

---

## Part 3: Connect Frontend and Backend

### Step 1: Update Backend CORS Settings

Now that you have your frontend URL, update the backend:

```bash
cd ../backend
heroku config:set FRONTEND_URL=https://mvmnt-sign-app.herokuapp.com
heroku config:set CORS_ORIGIN=https://mvmnt-sign-app.herokuapp.com
```

### Step 2: Restart Backend
```bash
heroku restart
```

---

## Part 4: Verify Everything Works

1. **Test Backend Health**:
   - Visit: `https://mvmnt-sign-api.herokuapp.com/health`
   - Should return JSON with status "healthy"

2. **Test Frontend**:
   - Visit: `https://mvmnt-sign-app.herokuapp.com`
   - Should load your application

3. **Test Full Flow**:
   - Log in to your app
   - Create a customer
   - Create a form template
   - Send a signing request
   - Sign the document

---

## Troubleshooting

### View Backend Logs
```bash
cd backend
heroku logs --tail
```

### View Frontend Logs
```bash
cd frontend
heroku logs --tail
```

### Restart Apps
```bash
# Backend
cd backend
heroku restart

# Frontend
cd frontend
heroku restart
```

### Check Environment Variables
```bash
# Backend
cd backend
heroku config

# Frontend
cd frontend
heroku config
```

---

## Alternative: Single App Deployment (Optional)

If you want to deploy both frontend and backend as a single Heroku app, you can:

1. Configure the backend to serve the frontend static files
2. Build the frontend and copy to backend's public directory
3. Deploy only the backend

Let me know if you want instructions for this approach!

---

## Important URLs After Deployment

- **Backend API**: https://mvmnt-sign-api.herokuapp.com
- **Frontend App**: https://mvmnt-sign-app.herokuapp.com
- **Backend Health Check**: https://mvmnt-sign-api.herokuapp.com/health
- **API Test**: https://mvmnt-sign-api.herokuapp.com/api/test

---

## Notes

1. **Free Tier**: Heroku free tier apps sleep after 30 minutes of inactivity. First request will be slow.
2. **Custom Domain**: You can add a custom domain in Heroku dashboard under "Settings" > "Domains"
3. **SSL**: Heroku provides SSL automatically for `.herokuapp.com` domains
4. **Database**: You're using Supabase (already configured), not Heroku Postgres

---

## Summary of What We're Deploying

**Backend App (`mvmnt-sign-api`)**:
- Node.js/Express server
- Connects to Supabase
- Handles all API requests
- Port assigned by Heroku automatically

**Frontend App (`mvmnt-sign-app`)**:
- React/Vite app
- Built into static files
- Served by simple HTTP server
- Connects to backend API

---

Ready to start? Begin with **Part 1, Step 1** above!
