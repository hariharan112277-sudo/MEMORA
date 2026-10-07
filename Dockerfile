# Stage 1: Build React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/memora-ui
COPY memora-ui/package*.json ./
RUN npm ci
COPY memora-ui/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-builder /app/memora-ui/dist ./memora-ui/dist

# Generate synthetic dataset and train model at build time
RUN python data/generate_dataset.py && python ml/train_model.py

ENV PORT=5000
EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
