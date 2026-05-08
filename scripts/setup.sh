#!/bin/bash
# setup.sh
# Run once when setting up the project on a new machine
# Usage: bash scripts/setup.sh

set -e

echo ""
echo "======================================"
echo "  Internal Ledger — Project Setup"
echo "======================================"

# ── Check required tools ──────────────────
echo ""
echo "[1/4] Checking required tools..."

if ! command -v python &>/dev/null; then
  echo "ERROR: Python not found. Install Python 3.10+"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node LTS"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm not found."
  exit 1
fi

echo "  Python : $(python --version)"
echo "  Node   : $(node --version)"
echo "  npm    : $(npm --version)"

# ── Backend setup ─────────────────────────
echo ""
echo "[2/4] Setting up Python backend..."

cd backend

if [ ! -d "venv" ]; then
  echo "  Creating virtual environment..."
  python -m venv venv
else
  echo "  Virtual environment already exists."
fi

# Activate — works on both Windows Git Bash and Mac/Linux
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

echo "  Installing Python packages..."
pip install -r requirements.txt --quiet
echo "  Packages installed."

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo ""
  echo "  Creating .env template..."
  cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=internal_ledger
EOF
  echo "  .env created — IMPORTANT: open backend/.env and add your MySQL password"
else
  echo "  .env already exists."
fi

cd ..

# ── Frontend setup ────────────────────────
echo ""
echo "[3/4] Setting up React frontend..."

cd frontend

if [ ! -d "node_modules" ]; then
  echo "  Installing npm packages..."
  npm install --silent
else
  echo "  node_modules already exists."
fi

echo "  Frontend ready."
cd ..

# ── Database instructions ─────────────────
echo ""
echo "[4/4] Database setup..."
echo ""
echo "  MySQL setup is manual (one time only):"
echo "  1. Make sure MySQL is running"
echo "  2. Open MySQL Workbench"
echo "  3. Open and run: database/schema.sql"
echo "  This creates all tables and seed data."
echo ""
echo "  OR run from command line:"
echo "  mysql -u root -p < database/schema.sql"

# ── Done ──────────────────────────────────
echo ""
echo "======================================"
echo "  Setup complete."
echo ""
echo "  Next steps:"
echo "  1. Edit backend/.env — add MySQL password"
echo "  2. Run database/schema.sql in MySQL"
echo "  3. Run: bash scripts/start.sh"
echo "======================================"
echo ""