# TECH MART - Wholesale Mobile Store Management System

A professional desktop application for wholesale mobile shop management.

## Tech Stack
- **Frontend**: React 18 + Vite + Material UI
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (local)
- **Desktop**: Electron.js

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Community Edition (running as a service)

### Installation
```bash
# Install all dependencies
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
```

### Development
```bash
# Run both frontend and backend
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

### Default Login
- **Username**: admin
- **Password**: admin123

## Project Structure
```
WholeSaleApp/
├── backend/          # Express.js API server
├── frontend/         # React + Vite frontend
├── electron/         # Electron desktop app
├── assets/           # Logos, icons
├── backups/          # Database backups
└── installer/        # Windows installer scripts
```

## API Server
Backend runs on `http://localhost:5000/api`

## License
UNLICENSED - Proprietary Software


## Generated Installer: 

dist-electron/Tech Mart Setup 1.0.0.exe
 (~112 MB)
Local Dev Command: npm run electron:dev
Build Installer Command: npm run electron:build