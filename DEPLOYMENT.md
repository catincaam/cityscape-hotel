# Cityscape Hotel - Deployment Guide

This project has three deployable parts:

1. `frontend` - React app
2. `backend` - Node.js/Express API
3. `ml-service` - Python prediction service

Recommended hosting:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Railway MySQL
- ML service: Render or Railway

## 1. Database

Create a hosted MySQL database, then copy its connection values into the backend environment variables:

```env
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...
DB_HOST=...
DB_DIALECT=mysql
```

The app uses Sequelize sync on backend startup, so the tables are created/updated when the backend boots.

## 2. Backend

Deploy the `backend` folder as a Node service.

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Required environment variables:

```env
PORT=9001
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...
DB_HOST=...
DB_DIALECT=mysql
JWT_SECRET=...
FRONTEND_URL=https://your-frontend-domain.vercel.app
APP_URL=https://your-frontend-domain.vercel.app
API_PUBLIC_URL=https://your-backend-domain.onrender.com
ML_SERVICE_URL=https://your-ml-service-domain.onrender.com/predict
DEMO_SEED_TOKEN=change-this-demo-token
GOOGLE_CLIENT_ID=...
GEMINI_API_KEY=...
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_PASSWORD=...
```

## Optional: demo data

For a richer live demo, set `DEMO_SEED_TOKEN` on the backend service and call:

```powershell
Invoke-WebRequest `
  -Uri "https://your-backend-domain/api/admin/dashboard/seed-demo-data" `
  -Method POST `
  -Headers @{ "x-demo-seed-token" = "your-demo-seed-token" }
```

The demo seed only replaces generated users with emails ending in `@cityscape.local`.

To move the admin catalog from the local database to production without generating new admin content:

```powershell
cd backend
npm run export:catalog

$catalog = Get-Content .\catalog-export.json -Raw
Invoke-WebRequest `
  -Uri "https://your-backend-domain/api/admin/dashboard/import-catalog" `
  -Method POST `
  -Headers @{ "x-demo-seed-token" = "your-demo-seed-token" } `
  -ContentType "application/json" `
  -Body $catalog
```

## 3. ML Service

Deploy the `ml-service` folder as a Python web service.

Start command:

```bash
python app.py
```

The hosting platform will provide the `PORT` variable automatically.

After deploy, set the backend variable:

```env
ML_SERVICE_URL=https://your-ml-service-domain/predict
```

## 4. Frontend

Deploy the `frontend` folder as a React app.

Build command:

```bash
npm install && npm run build
```

Output directory:

```txt
build
```

Required environment variables:

```env
REACT_APP_API_URL=https://your-backend-domain.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 5. Google OAuth

In Google Cloud Console, add the deployed frontend URL to authorized JavaScript origins:

```txt
https://your-frontend-domain.vercel.app
```

Keep `http://localhost:3000` for local development.

## 6. Gmail

Use a Gmail App Password, not the normal Gmail password. Store it only in backend environment variables.
