#!/bin/bash
set -e

echo "Setting up Internal Ledger System..."

command -v python >/dev/null 2>&1 || { echo "Python not found. Install Python 3.10+"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js not found. Install Node LTS"; exit 1; }

echo "Python: $(python --version)"
echo "Node: $(node --version)"

echo ""
echo "Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    python -m venv venv
fi

source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
pip install -r requirements.txt --quiet

if [ ! -f ".env" ]; then
    echo "DB_HOST=localhost" > .env
    echo "DB_USER=root" >> .env
    echo "DB_PASSWORD=your_password_here" >> .env
    echo "DB_NAME=internal_ledger" >> .env
    echo ".env created — update your MySQL password before running"
fi

cd ..

echo ""
echo "Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
cd ..

echo ""
echo "Setting up database..."
echo "Make sure MySQL is running. Then run:"
echo "  mysql -u root -p internal_ledger < database/schema.sql"
echo "Or open database/schema.sql in MySQL Workbench and execute it."

echo ""
echo "Done. Run: bash scripts/start.sh"