# brd-internal-ledger-system

# Internal Ledger System

A micro-accounting system for managing shared office resources like a snack bar or coffee fund. Users can deposit funds and log consumption, with a strict no-overdraft policy and full audit trail.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | User interface |
| Backend  | FastAPI (Python) | Business logic and API |
| Database | MySQL 8.0 | Persistent storage |
| Testing  | Pytest | Automated API tests |
| Automation | Bash | Setup and start scripts |

## Project Structure
```
brd-internal-ledger-system/
├── backend/
│   ├── main.py          
│   ├── database.py      
│   ├── models.py        
│   ├── test_api.py      
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── BalanceCard.jsx
│           ├── TransactionForm.jsx
│           └── AuditTrail.jsx
            ├── Login.jsx
│           └── SummaryBar.jsx
├── database/
│   └── schema.sql
└── scripts/
├── setup.sh
└── start.sh
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js LTS
- MySQL 8.0 running on localhost

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd brd-internal-ledger-system

# Run setup script
bash scripts/setup.sh
```

Then initialise the database by running `database/schema.sql` in MySQL Workbench.

Update `backend/.env` with your MySQL password.

### Running the App

```bash
bash scripts/start.sh
```

Or manually:

```bash
# Terminal 1 — Backend
cd backend
venv\Scripts\activate
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`  
API runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance/{user_id}` | Get user balance |
| GET | `/transactions/{user_id}` | Get last 20 transactions |
| POST | `/transact` | Deposit or deduct funds |
| POST | `/users` | Create new user |

## Core Business Rules

- Balance can never go below zero — enforced in backend, not frontend
- Transactions are immutable — never deleted or edited
- Every deduction requires sufficient funds verified before processing
- Audit trail always shows last 20 transactions

## Running Tests

```bash
cd backend
venv\Scripts\activate
pytest test_api.py -v
```

9 tests covering balance checks, deposits, deductions, overdraft prevention, and audit trail.

## Deployment Notes

For production deployment:
- Frontend → Vercel (connect GitHub repo, auto-deploys)
- Backend → Railway (supports Python + MySQL)
- Update CORS origins in `main.py` to production URL
- Move credentials to platform environment variables