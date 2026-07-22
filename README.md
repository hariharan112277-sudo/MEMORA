# MEMORA Backend

Flask REST API + ML layer for **MEMORA: Cognitive Learning Retention Intelligence
System**. Implements the architecture from the Review-II deck: a cognitive model
(Ebbinghaus forgetting curve) combined with a RandomForestRegressor that predicts
concept retention, weak-concept detection, and a personalized revision scheduler.

## Quick start

```bash
cd memora-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults work with no editing

# 1. Generate the synthetic training dataset (5,200 samples)
python data/generate_dataset.py

# 2. Train the retention-prediction model
python ml/train_model.py

# 3. Run the API
python app.py
```

The API is now live at `http://localhost:5000`. No database setup required —
learner/concept state is stored in `storage/db.json`, seeded automatically on
first run with the same two demo learners used in the frontend prototype
(`S R Hariharan`, `Aghilan M`).

Run the test suite:

```bash
pytest
```

## Project layout

```
memora-backend/
├── app.py                  Flask app + blueprint registration
├── config.py                Environment-driven configuration
├── requirements.txt
├── Dockerfile
├── Procfile                 For Render/Heroku-style deploys
├── ml/
│   ├── ebbinghaus.py         Core cognitive model: R(t) = e^(-t/S), scheduling math
│   ├── train_model.py        Trains the RandomForestRegressor
│   └── predictor.py          Loads the model; falls back to pure Ebbinghaus if untrained
├── data/
│   ├── generate_dataset.py   Builds the synthetic 5,200-row training dataset
│   └── dataset.csv           (generated)
├── storage/
│   └── store.py              JSON-file persistence by default; optional MongoDB
├── routes/
│   ├── health.py
│   ├── retention.py          POST /api/retention/predict
│   ├── concepts.py           GET  /api/concepts, /api/concepts/weak
│   ├── schedule.py           POST /api/schedule/generate
│   ├── quiz.py                POST /api/quiz/submit
│   └── misc.py                /api/learners, /api/day/advance, /api/reset
└── tests/
    └── test_api.py
```

## API reference

### `GET /api/health`
Service status and whether the trained ML model is loaded.

### `GET /api/learners`
Lists demo learners.

### `GET /api/concepts?learner_id=L_HARIHARAN`
All concepts for a learner with live-computed retention and status.

### `GET /api/concepts/weak?learner_id=L_HARIHARAN`
Only concepts flagged `weak` or `critical`, sorted by lowest retention first.

### `POST /api/retention/predict`
Two modes:

```jsonc
// Mode A — by stored learner/concept
{ "learner_id": "L_HARIHARAN", "concept_id": "data_structures" }

// Mode B — raw features, exercises the ML model directly
{ "difficulty": 0.5, "days_since_last_review": 6, "quiz_accuracy": 0.7,
  "response_time": 12.0, "attempt_count": 2 }
```

Mode A returns both the closed-form Ebbinghaus retention and the ML model's
prediction side by side, plus a curve for charting.

### `POST /api/schedule/generate`
```json
{ "learner_id": "L_HARIHARAN", "threshold": 0.8 }
```
Returns each concept's next-due day, soonest first — the same logic behind
the "Personalized Revision Schedule" panel in the frontend.

### `POST /api/quiz/submit`
```json
{ "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": true }
```
Updates the concept's memory strength (grows on a correct answer, shrinks on
a wrong one) and records the review day.

### `POST /api/day/advance`
```json
{ "by": 1 }
```
Advances the simulation clock — mirrors the "Advance +1 Day" button in the
frontend prototype.

### `POST /api/reset`
Resets all learner/concept state back to the seed demo data.

## Connecting the frontend prototype

The `memora-frontend.html` dashboard currently runs its Ebbinghaus/scheduling
logic client-side, using the exact same formulas as this backend. To wire it
up to this API instead:

1. Run this backend (`python app.py`), note the base URL (default
   `http://localhost:5000`).
2. In the frontend's `<script>`, replace the local `retention()`,
   `daysUntilThreshold()`, and `answerQuiz()` calls with `fetch()` calls to
   `/api/retention/predict`, `/api/schedule/generate`, and
   `/api/quiz/submit` respectively, using the same `learner_id`/`concept_id`
   values already in the `bank` object (`L_HARIHARAN`/`data_structures`, etc.
   — adjust IDs to match, they're listed in `storage/store.py`).
3. Set `CORS_ORIGIN` in `.env` to the origin the frontend is served from
   (or leave as `*` for local development).

## Switching to MongoDB

By default state is stored in `storage/db.json`. To use MongoDB instead:

```bash
# .env
STORAGE_BACKEND=mongo
MONGO_URI=mongodb://localhost:27017
MONGO_DB=memora
```

No code changes needed — `storage/store.py` exposes the same functions
regardless of backend.

## Retraining with a larger / real dataset

Replace `data/dataset.csv` with real learner-interaction data using the same
columns (`difficulty, days_since_last_review, quiz_accuracy, response_time,
attempt_count, retention_label`), then re-run `python ml/train_model.py`.
The script prints MAE and R² on a held-out test split so you can track
whether the swap improved prediction quality — useful evidence for the
"Model Optimization" item on the Current Challenges & Future Direction slide.
