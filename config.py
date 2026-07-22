import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    PORT = int(os.getenv("PORT", 5000))
    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "json")  # "json" or "mongo"

    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB = os.getenv("MONGO_DB", "memora")

    RETENTION_THRESHOLD = float(os.getenv("RETENTION_THRESHOLD", 0.8))
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    STORAGE_FILE = os.path.join(BASE_DIR, "storage", "db.json")
    DATASET_FILE = os.path.join(DATA_DIR, "dataset.csv")
    MODEL_FILE = os.path.join(MODELS_DIR, "retention_model.joblib")
