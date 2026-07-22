FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate the synthetic dataset and train the model at build time so the
# image is ready to serve ML-backed predictions immediately.
RUN python data/generate_dataset.py && python ml/train_model.py

ENV PORT=5000
EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
