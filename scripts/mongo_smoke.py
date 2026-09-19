"""
Mongo smoke test script for MEMORA.

Exercises MongoDB connection, seed initialization, reading learner data,
quiz update bookkeeping, and state reset against MONGO_URI.

Run:
    python scripts/mongo_smoke.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from storage import store


def main():
    print("Running Mongo Smoke Test...")
    print(f"  Backend: {Config.STORAGE_BACKEND}")
    print(f"  Mongo URI: {Config.MONGO_URI}")
    print(f"  Mongo DB: {Config.MONGO_DB}")

    # Set storage backend to mongo temporarily for this test
    Config.STORAGE_BACKEND = "mongo"

    try:
        store.reset()
        print("✓ Reset and seed insert successful.")

        learners = store.list_learners()
        print(f"✓ Found {len(learners)} learners in Mongo.")
        assert len(learners) >= 2, "Expected at least 2 seed learners."

        concept = store.get_concept("L_HARIHARAN", "data_structures")
        print(f"✓ Read concept data_structures: strength={concept['strength']}")

        res = store.add_quiz_result("L_HARIHARAN", "data_structures", True, response_time=12.5)
        print(f"✓ Quiz update success: new strength={res['new_strength']}, review_count={res['review_count']}")

        store.reset()
        print("✓ Reset back to seed state successful.")

        print("\nALL MONGO SMOKE CHECKS PASSED SUCCESSFULLY!")

    except Exception as e:
        print(f"\n❌ Mongo Smoke Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
