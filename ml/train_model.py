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
    import json
    from datetime import datetime, timezone
    import sklearn

    df = load_dataset(Config.DATASET_FILE)
    model, metrics = train(df)

    os.makedirs(Config.MODELS_DIR, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, Config.MODEL_FILE)

    importances = dict(zip(FEATURES, [round(float(fi), 4) for fi in model.feature_importances_]))
    importances_sorted = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metrics_path = os.path.join(Config.MODELS_DIR, "metrics.json")
    dataset_version = "v1"
    existing_history = []
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                existing_data = json.load(f)
                existing_history = existing_data.get("history", [])
        except Exception:
            existing_history = []

    metrics_payload = {
        "dataset_version": dataset_version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "features": FEATURES,
        "mae": metrics["mae"],
        "r2": metrics["r2"],
        "n_train": metrics["n_train"],
        "n_test": metrics["n_test"],
        "feature_importances": importances_sorted,
    }
    if existing_history:
        metrics_payload["history"] = existing_history

    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)

    print("Training complete.")
    print(f"  MAE: {metrics['mae']}   R^2: {metrics['r2']}")
    print(f"  Train rows: {metrics['n_train']}   Test rows: {metrics['n_test']}")
    print(f"Model saved to {Config.MODEL_FILE}")
    print(f"Metrics saved to {metrics_path}")
    print("\nFeature Importances:")
    print(f"  {'Feature':<25} {'Importance':<10}")
    print("  " + "-" * 36)
    for feat, imp in importances_sorted.items():
        print(f"  {feat:<25} {imp:<10.4f}")

