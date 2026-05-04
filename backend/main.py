from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection
from models import TransactionRequest, UserCreate
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler("ledger.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)



app = FastAPI(
    title="Internal Ledger API",
    description="A micro-accounting API for managing shared office resources. Enforces double-entry logic and prevents sub-zero balances.",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# HEALTH CHECK
@app.get("/")
def root():
    logger.info("Health check called")
    return {"status": "Internal Ledger API is running"}


# GET BALANCE
@app.get("/balance/{user_id}")
def get_balance(user_id: int):
    logger.info(f"Balance request — user_id:{user_id}")
    """
    Returns the current balance for a user.
    Raises 404 if user doesn't exist.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True) 

    try:
        cursor.execute("SELECT id, name, email, balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            logger.warning(f"Balance request failed — user_id:{user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"Balance returned — user_id:{user_id} balance:{user['balance']}")
        return user
    finally:
        cursor.close()
        conn.close()

# GET TRANSACTIONS 
@app.get("/transactions/{user_id}")
def get_transactions(user_id: int):
    """
    Returns the last 20 transactions for a user.
    This is the immutable audit trail — nothing is ever deleted.
    """
    logger.info(f"Transactions request — user_id:{user_id}")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id, type, amount, description, created_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (user_id,))

        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

# POST TRANSACT
@app.post("/transact")
def transact(request: TransactionRequest):
    """
    Core business logic endpoint.
    
    For deposits: adds amount to balance, logs transaction.
    For deductions: checks balance FIRST, rejects if insufficient, 
                    then deducts and logs.
    
    This is STATE VALIDATION — the backend enforces the rules,
    not the frontend.
    """
    # Validate type — only 'deposit' or 'deduct' allowed
    if request.type not in ["deposit", "deduct"]:
        raise HTTPException(status_code=400, detail="type must be 'deposit' or 'deduct'")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Step 1: Get current balance
        cursor.execute("SELECT balance FROM users WHERE id = %s", (request.user_id,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        current_balance = float(user["balance"])

        # Step 2: If deducting, check for sufficient funds
        if request.type == "deduct":
            if request.amount > current_balance:
                logger.warning(f"Insufficient funds — user_id:{request.user_id} balance:{current_balance} requested:{request.amount}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds. Balance: {current_balance}, Requested: {request.amount}"
                )
            new_balance = current_balance - request.amount
        else:
            new_balance = current_balance + request.amount

        # Step 3: Update the balance
        cursor.execute(
            "UPDATE users SET balance = %s WHERE id = %s",
            (new_balance, request.user_id)
        )

        # Step 4: Log the transaction — immutable record
        cursor.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)",
            (request.user_id, request.type, request.amount, request.description)
        )

        # Step 5: Commit — makes both changes permanent together
        conn.commit()

        return {
            "message": "Transaction successful",
            "new_balance": new_balance,
            "type": request.type,
            "amount": request.amount
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {e}")
    finally:
        cursor.close()
        conn.close()


# CREATE USER
@app.post("/users")
def create_user(user: UserCreate):
    """Creates a new user with zero balance"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s)",
            (user.name, user.email)
        )
        conn.commit()
        return {"message": "User created", "user_id": cursor.lastrowid}

    except Exception as e:
        conn.rollback()
        logger.error(f"Transaction failed — user_id:{user.id} error:{e}")
        raise HTTPException(status_code=400, detail=f"Could not create user: {e}")
    finally:
        cursor.close()
        conn.close()