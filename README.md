# brd-internal-ledger-system

## Backend environment setup

The backend loads environment variables from `backend/.env` via `python-dotenv`.

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in your DB values.
3. Run the backend from the `backend` folder:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

The backend uses `backend/database.py` to read `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
