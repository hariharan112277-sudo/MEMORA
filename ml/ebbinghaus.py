"""
Core cognitive model for MEMORA.

Implements the Ebbinghaus forgetting curve and the spaced-revision rules
used across the prediction, quiz, and scheduling endpoints. This mirrors
the client-side logic in the frontend prototype, so predictions made here
are consistent with what the dashboard shows.
"""

import math


def retention(strength: float, days_since_review: float) -> float:
    """
    Predicted retention R(t) for a concept.

    R(t) = e^(-t / S)

    strength (S): memory strength in days — larger S means slower decay.
    days_since_review (t): time elapsed since the concept was last revised.
    """
    if strength <= 0:
        return 0.0
    t = max(0.0, days_since_review)
    return math.exp(-t / strength)


def days_until_threshold(strength: float, threshold: float = 0.8) -> float:
    """
    Days from the last review until predicted retention drops to `threshold`.

    Solves R(t) = e^(-t/S) = threshold for t:
        t = -S * ln(threshold)
    """
    threshold = min(max(threshold, 0.0001), 0.9999)
    return max(0.0, -strength * math.log(threshold))


def update_strength(strength: float, correct: bool, difficulty: float = 0.5) -> float:
    """
    Update memory strength after a quiz attempt (spaced-repetition style).

    A correct answer grows S (the concept is revised further into the
    future before it needs review again). A wrong answer shrinks S
    (the concept decays faster and will be flagged for earlier revision).
    `difficulty` (0-1) dampens the growth for harder concepts.
    """
    if correct:
        growth = 1.4 + (1 - difficulty) * 0.4  # harder concepts grow less per success
        return strength * growth
    else:
        return max(1.0, strength * 0.55)


def status_for(r: float) -> str:
    """Classify a retention value into the same bands the dashboard uses."""
    if r < 0.5:
        return "critical"
    if r < 0.75:
        return "weak"
    return "stable"


def curve_points(strength: float, max_days: int = 21, step: int = 3):
    """Sample points along the retention curve, for charting."""
    return [
        {"day": d, "retention": round(retention(strength, d) * 100, 2)}
        for d in range(0, max_days + 1, step)
    ]
