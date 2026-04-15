# Service Envelope Dashboard - Phase 2

React web dashboard for the MAPUA Colleges Service Envelope Processing System.

## 🎯 Overview

The dashboard provides a user-friendly interface for:
- Service request submission and tracking
- Real-time status monitoring
- Service administration
- Email approval management
- Audit logs and reporting

## 🛠️ Tech Stack

- **React 18.x** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (Lightning fast HMR)
- **Tailwind CSS** - Utility-first styling
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

## 📁 Project Structure

```
src/
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── RequestDetailPage.tsx
│   ├── ServiceBuilderPage.tsx
│   ├── ApprovalPage.tsx
│   └── AdminPage.tsx
├── components/         # Reusable components
├── services/          # API client
│   └── api.ts         # Axios configuration
├── hooks/             # Custom React hooks
│   └── useAuth.ts
├── context/           # React Context
│   └── AuthContext.tsx
├── types/             # TypeScript interfaces
│   └── index.ts
├── App.tsx            # Main app with routing
├── App.css            # Global styles (Tailwind)
└── main.tsx           # Entry point
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env file
Copy `.env.example` to `.env` and update:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

## 🔗 API Integration

The dashboard communicates with the Phase 1 API server (Express.js on port 8000).

### Authentication

1. Login page collects email/password
2. JWT token stored in localStorage
3. Token automatically added to all requests
4. Token refresh on 401 response

## 📋 Pages & Status

- [x] **LoginPage** - Auth entry point (✅ Complete)
- [x] **DashboardPage** - Request list + filters (✅ Complete)
- [ ] **RequestDetailPage** - Single request view + timeline
- [ ] **ServiceBuilderPage** - Service configuration UI
- [ ] **ApprovalPage** - Web approval interface
- [ ] **AdminPage** - Audit logs + admin tools

## 🔐 Demo Credentials

```
Email: admin@mapua.edu.ph
Password: admin123
```

## 🎨 UI/UX

### Color Scheme
- Primary: Blue (#1976d2)
- Success: Green (#4caf50)
- Warning: Orange (#ff9800)
- Error: Red (#f44336)

## 📦 Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview

# Lint
npm run lint
```

## 🤝 Related Projects

- **API Server:** `service-envelope-cli-v2` (port 8000)
- **Documentation:** PHASE_2_CONTEXT.  md

---

**Status:** 🟡 In Development (Phase 2 - React Dashboard)  
**Last Updated:** April 15, 2026

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
