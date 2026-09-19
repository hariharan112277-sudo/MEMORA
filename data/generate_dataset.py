"""
Generates the synthetic learner-interaction dataset used to train MEMORA's
retention-prediction model.

Each row simulates one quiz attempt: a learner revising a concept after some
number of days, with a quiz accuracy, response time, and attempt count. The
target (retention_label) is derived from the Ebbinghaus curve with added
noise, so the dataset reflects believable, if simulated, forgetting behavior.

Run:
    python data/generate_dataset.py
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.ebbinghaus import retention  # noqa: E402

CONCEPTS = [
    ("Data Structures", 0.40), ("Operating Systems", 0.60), ("DBMS Normalization", 0.70),
    ("ML Fundamentals", 0.50), ("Computer Networks", 0.55), ("OOP Concepts", 0.35),
    ("Algorithm Design", 0.50), ("Probability & Statistics", 0.65), ("Neural Networks", 0.60),
    ("Software Engineering", 0.40), ("Discrete Mathematics", 0.55), ("Computer Architecture", 0.50),
]

N_LEARNERS = 40
N_SAMPLES = 5200
RANDOM_SEED = 42


def generate(n_samples: int = N_SAMPLES, n_learners: int = N_LEARNERS, seed: int = RANDOM_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_samples):
        learner_id = f"L{rng.integers(1, n_learners + 1):03d}"
        concept_name, difficulty = CONCEPTS[rng.integers(0, len(CONCEPTS))]
        concept_id = concept_name.lower().replace(" ", "_").replace("&", "and")

        # Base memory strength: harder concepts decay faster (lower S), with
        # per-learner variation representing differing aptitude/engagement.
        base_strength = (1 - difficulty) * 10 + rng.normal(0, 1.2)
        base_strength = max(1.5, base_strength)

        days_since_last_review = float(rng.integers(0, 22))
        attempt_count = int(rng.integers(1, 6))

        true_retention = retention(base_strength, days_since_last_review)

        ability = rng.normal(0, 0.07)
        raw_accuracy = 0.65 * true_retention + 0.25 * ability + rng.normal(0, 0.10) + 0.05 * (1 - difficulty)
        quiz_accuracy = np.clip(raw_accuracy, 0.0, 1.0)

        raw_rt = rng.normal(22 - 10 * true_retention, 4)
        response_time = np.clip(raw_rt, 3.0, 40.0)

        raw_label = true_retention + rng.normal(0, 0.06)
        retention_label = np.clip(raw_label, 0.0, 1.0)

        rows.append({
            "learner_id": learner_id,
            "concept_id": concept_id,
            "concept_name": concept_name,
            "difficulty": round(difficulty, 2),
            "days_since_last_review": days_since_last_review,
            "quiz_accuracy": round(float(quiz_accuracy), 3),
            "response_time": round(float(response_time), 2),
            "attempt_count": attempt_count,
            "retention_label": round(float(retention_label), 3),
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate()
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
    print(df.head())
