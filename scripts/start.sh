#!/bin/bash
# start.sh
# Starts MySQL, backend and frontend together
# Usage: bash scripts/start.sh

echo ""
echo "======================================"
echo "  Starting Internal Ledger System"
echo "======================================"

# ── Start MySQL (Windows) ─────────────────
echo ""
echo "[1/3] Starting MySQL..."

# Try to start MySQL80 service (Windows)
# If already running, net start will just say so — not an error
net start MySQL80 2>/dev/null && echo "  MySQL started." || echo "  MySQL already running."

# ── Start Backend ─────────────────────────
echo ""
echo "[2/3] Starting FastAPI backend..."

cd backend
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

# Start uvicorn in background, save process ID
uvicorn main:app --port 8080 &
BACKEND_PID=$!
echo "  Backend running on http://localhost:8080"
echo "  API docs at http://localhost:8080/docs"
echo "  Process ID: $BACKEND_PID"

cd ..

# Wait 2 seconds for backend to be ready before starting frontend
sleep 2

# ── Start Frontend ────────────────────────
echo ""
echo "[3/3] Starting React frontend..."

cd frontend
npm run dev &
FRONTEND_PID=$!
echo "  Frontend running on http://localhost:5173"
echo "  Process ID: $FRONTEND_PID"

cd ..

# ── Ready ─────────────────────────────────
echo ""
echo "======================================"
echo "  Everything is running."
echo ""
echo "  Open: http://localhost:5173"
echo ""
echo "  Demo logins:"
echo "  User:  palak@office.com / password123"
echo "  Admin: admin@office.com / password123"
echo ""
echo "  Press Ctrl+C to stop everything"
echo "======================================"

# When Ctrl+C pressed — kill both servers cleanly
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'; exit" SIGINT SIGTERM

# Keep script alive so Ctrl+C works
wait