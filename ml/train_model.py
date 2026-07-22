"""
Trains the retention-prediction model described in the Methodology & Design
slide: a RandomForestRegressor that predicts a learner's retention on a
concept from their recent quiz behavior.

Run (from project root):
    python ml/train_model.py
"""

import os
import sys
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config  # noqa: E402

FEATURES = ["difficulty", "days_since_last_review", "quiz_accuracy", "response_time", "attempt_count"]
TARGET = "retention_label"


def load_dataset(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset not found at {path}. Run `python data/generate_dataset.py` first."
        )
    return pd.read_csv(path)


def train(df: pd.DataFrame):
    X = df[FEATURES]
    y = df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    return model, {"mae": round(mae, 4), "r2": round(r2, 4), "n_train": len(X_train), "n_test": len(X_test)}


if __name__ == "__main__":
    df = load_dataset(Config.DATASET_FILE)
    model, metrics = train(df)

    os.makedirs(Config.MODELS_DIR, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, Config.MODEL_FILE)

    print("Training complete.")
    print(f"  MAE: {metrics['mae']}   R^2: {metrics['r2']}")
    print(f"  Train rows: {metrics['n_train']}   Test rows: {metrics['n_test']}")
    print(f"Model saved to {Config.MODEL_FILE}")
