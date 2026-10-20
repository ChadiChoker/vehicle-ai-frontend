# Vehicle AI Frontend

A React interface for AI vehicle damage assessment: upload pickup and return photos, run the analysis, and see detected damage highlighted on the photos along with cost estimates.

**Live demo:** [vehicle-ai-frontend.vercel.app](https://vehicle-ai-frontend.vercel.app) · **Backend:** [vehicle-ai-backend](https://github.com/ChadiChoker/vehicle-ai-backend)

Checking a vehicle at pickup and again at return usually means comparing photos by eye. This single-page app walks a user through an inspection step by step. It creates the inspection, uploads photos for each side of the vehicle, starts the AI analysis on the backend, and shows the results as a damage report next to annotated images.

## Features

- **Guided workflow**: create inspection, upload pickup photo, upload return photo, analyze.
- **Side selection**: tag photos as front, rear, left, or right.
- **Damage highlights**: draws detected damage regions on the uploaded photos with an HTML canvas.
- **Damage report**: lists each issue with its label, severity, and estimated cost, plus the total estimated cost.
- **Simple states**: buttons are disabled while a request is running or before an inspection exists.

## Tech Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · ESLint · deployed on Vercel

## Architecture

- **Single component**: the whole flow lives in `src/App.tsx`.
- **API calls**: uses `fetch` against `${VITE_API_URL}/api/inspections/...`:
  - `POST /api/inspections`
  - `POST /api/inspections/:id/photos`
  - `POST /api/inspections/:id/analyze`
  - `GET /api/inspections/:id/results`
- **Rendering**: results are matched to photos by `photoId`, and each photo is drawn on its own `<canvas>` with circles around the bounding boxes.
- **Dev proxy**: `vite.config.ts` proxies `/api` to `http://localhost:8000`.

```mermaid
flowchart LR
    UI[React app] -- REST --> API[vehicle-ai-backend]
    API -- inference --> HF[Hugging Face]
```

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of [vehicle-ai-backend](https://github.com/ChadiChoker/vehicle-ai-backend), either local on port 8000 or deployed

### Install

```bash
git clone https://github.com/ChadiChoker/vehicle-ai-frontend.git
cd vehicle-ai-frontend
npm install
```

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend, without `/api` |

The repo ships with `.env.production`, which points at the deployed backend (`https://vehicle-ai-backend.onrender.com`). For local development, create `.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

> The backend allows CORS from `http://localhost:5173` by default, which matches the Vite dev server.

### Scripts

```bash
npm run dev       # start the Vite dev server (http://localhost:5173)
npm run build     # type-check and build for production
npm run preview   # preview the production build
npm run lint      # run ESLint
```

---

Built by [Chadi Choker](https://github.com/ChadiChoker) · [Portfolio](https://github.com/ChadiChoker/portfolio)
