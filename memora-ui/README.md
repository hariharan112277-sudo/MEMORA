# Memora UI

React + Vite + Tailwind dashboard for the [MEMORA](https://github.com/hariharan112277-sudo/MEMORA) retention engine.

## Run
```bash
# 1. start the backend (from the MEMORA repo)
python app.py            # http://localhost:5000

# 2. start the UI
cd memora-ui
npm install
npm run dev              # http://localhost:5173
```

Point at another backend by copying `.env.example` to `.env` and editing `VITE_API_URL`.

## Build
```bash
npm run build && npm run preview
```
Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages). For SPA routing add a fallback to `index.html`. Set `CORS_ORIGIN` on the backend to your UI origin.

## Pages
Dashboard · Concepts (search, filter, add/delete, add learner) · Schedule · Analytics · About

## Notes
- Quiz option numbering: `OPTION_BASE` in `src/components/QuizModal.jsx` (0 by default; set to 1 if your API is 1-based).
