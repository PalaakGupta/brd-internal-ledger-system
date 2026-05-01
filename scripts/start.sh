#!/bin/bash
set -e

cd backend
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

sleep 2

cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait