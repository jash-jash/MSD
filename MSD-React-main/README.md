# HyperAttend – Modular React Frontend

This is a modularized React (Vite) frontend for **HyperAttend**, wired to your deployed backend.

## Quick Start

```bash
cd hyperattend-frontend-modular
cp .env.sample .env   # set VITE_API_URL to your backend base URL
npm i
npm run dev
```

## Build for Production

```bash
npm run build
npm run preview
```

## Structure

- `src/components/*` – Reusable UI components (Glass, Sidebar, StatCard, StudentList)
- `src/pages/*` – Pages (Login, Student, Teacher, Calendar, Analytics, Notifications, Settings)
- `src/utils/*` – `api.js` (fetch helper), `storage.js` (localStorage)
- `src/App.jsx` – App wiring + routes + global styles
- `.env.sample` – Set `VITE_API_URL` to your backend

Enjoy!
