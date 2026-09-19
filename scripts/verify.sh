#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"

echo "Starting MEMORA API verification against ${BASE_URL}..."

# 1. Health check
echo -n "Checking GET /api/health ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"ml_model_loaded"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 2. List learners
echo -n "Checking GET /api/learners ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/learners")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"learners"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 3. List concepts
echo -n "Checking GET /api/concepts ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/concepts?learner_id=L_HARIHARAN")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"concepts"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 4. Analytics
echo -n "Checking GET /api/analytics ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/analytics?learner_id=L_HARIHARAN")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"overall_retention"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 5. Weak concepts
echo -n "Checking GET /api/concepts/weak ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/concepts/weak?learner_id=L_HARIHARAN")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"weak_concepts"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 6. Predict retention
echo -n "Checking POST /api/retention/predict ... "
res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/retention/predict" -H "Content-Type: application/json" -d '{"learner_id":"L_HARIHARAN","concept_id":"data_structures"}')
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"retention_formula"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 7. Schedule generate
echo -n "Checking POST /api/schedule/generate ... "
res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/schedule/generate" -H "Content-Type: application/json" -d '{"learner_id":"L_HARIHARAN"}')
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"schedule"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 8. Quiz questions
echo -n "Checking GET /api/quiz/questions ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/quiz/questions?learner_id=L_HARIHARAN&concept_id=data_structures&limit=2")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"questions"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 9. Quiz attempt
echo -n "Checking POST /api/quiz/attempt ... "
res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/quiz/attempt" -H "Content-Type: application/json" -d '{"learner_id":"L_HARIHARAN","concept_id":"data_structures","question_id":"ds_q01","selected_option":1,"response_time":10.5}')
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"correct"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 10. Day advance
echo -n "Checking POST /api/day/advance ... "
res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/day/advance" -H "Content-Type: application/json" -d '{"by":1}')
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"current_day"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 11. Dashboard served
echo -n "Checking GET /dashboard ... "
res=$(curl -s -w "\n%{http_code}" "${BASE_URL}/dashboard")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q 'MEMORA'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

# 12. Reset
echo -n "Checking POST /api/reset ... "
res=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/reset")
code=$(echo "$res" | tail -n1)
body=$(echo "$res" | sed '$d')
if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"status"'; then
  echo "FAILED (code $code)"
  exit 1
fi
echo "OK"

echo ""
echo "ALL CHECKS PASSED SUCCESSFULLY!"
