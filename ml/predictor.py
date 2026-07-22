"""
Loads the trained RandomForestRegressor and exposes a single predict()
function used by the API routes. Falls back to the pure Ebbinghaus formula
(no ML) if the model hasn't been trained yet, so the API works out of the
box even before `python ml/train_model.py` has been run.
"""

import os
import joblib
import pandas as pd

from config import Config
from ml.ebbinghaus import retention

_model_bundle = None
_load_attempted = False


def _load_model():
    global _model_bundle, _load_attempted
    if _load_attempted:
        return _model_bundle
    _load_attempted = True
    if os.path.exists(Config.MODEL_FILE):
        _model_bundle = joblib.load(Config.MODEL_FILE)
    return _model_bundle


def is_ml_available() -> bool:
    return _load_model() is not None


def predict_retention(difficulty: float, days_since_last_review: float,
                       quiz_accuracy: float, response_time: float,
                       attempt_count: int, strength_fallback: float = 6.0) -> dict:
    """
    Returns predicted retention (0-1) plus which method produced it.

    If the trained model is available, uses it directly. Otherwise falls
    back to the closed-form Ebbinghaus formula using `strength_fallback`
    as the assumed memory strength.
    """
    bundle = _load_model()
    if bundle is not None:
        model = bundle["model"]
        features = bundle["features"]
        row = pd.DataFrame([{
            "difficulty": difficulty,
            "days_since_last_review": days_since_last_review,
            "quiz_accuracy": quiz_accuracy,
            "response_time": response_time,
            "attempt_count": attempt_count,
        }])[features]
        pred = float(model.predict(row)[0])
        pred = min(max(pred, 0.0), 1.0)
        return {"retention": round(pred, 4), "method": "random_forest"}

    pred = retention(strength_fallback, days_since_last_review)
    return {"retention": round(pred, 4), "method": "ebbinghaus_fallback"}
