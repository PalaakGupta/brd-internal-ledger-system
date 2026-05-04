from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_connection
from models import TransactionRequest, UserCreate, LoginRequest
from auth import verify_password, create_token, decode_token
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

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please login again.")
    return payload


# HEALTH CHECK
@app.get("/", summary="Health check", description="Simple endpoint to verify that the API is running.")
def root():
    logger.info("Health check called")
    return {"status": "Internal Ledger API is running"}

@app.post("/login", summary="User login")
def login(request: LoginRequest):
    logger.info(f"Login attempt — email:{request.email}")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id, name, email, balance, password_hash FROM users WHERE email = %s", (request.email,))
        user = cursor.fetchone()

        if not user or not verify_password(request.password, user["password_hash"]):
            logger.warning(f"Login failed — email:{request.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token(user["id"], user["email"])
        logger.info(f"Login success — user_id:{user['id']}")

        return {
            "token": token,
            "user_id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    finally:
        cursor.close()
        conn.close()



# GET BALANCE
@app.get("/balance/{user_id}", summary="Get user balance", description="Returns the current balance for a user.")
def get_balance(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied. You can only view your own balance.")
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
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"Balance returned — user_id:{user_id} balance:{user['balance']}")
        return user
    finally:
        cursor.close()
        conn.close()

# GET TRANSACTIONS 
@app.get("/transactions/{user_id}", summary="Get user transactions", description="Returns the last 20 transactions for a user.")
def get_transactions(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied. You can only view your own transactions.")
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

@app.get("/summary/{user_id}", summary="Get monthly summary")
def get_summary(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END), 0) as total_deposited,
                COALESCE(SUM(CASE WHEN type='deduct' THEN amount ELSE 0 END), 0) as total_spent,
                COUNT(*) as transaction_count
            FROM transactions
            WHERE user_id = %s
            AND MONTH(created_at) = MONTH(CURRENT_DATE())
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        """, (user_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

# POST TRANSACT
@app.post("/transact", summary="Create new transaction", description="Creates a new transaction for a user.")
def transact(request: TransactionRequest, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != request.user_id:
        raise HTTPException(status_code=403, detail="Access denied. You can only create transactions for your own account.")

    logger.info(f"Transaction request — user_id:{request.user_id} type:{request.type} amount:{request.amount}")
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

        logger.info(f"Transaction complete — user_id:{request.user_id} type:{request.type} amount:{request.amount} new_balance:{new_balance}")

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
        logger.error(f"Transaction failed — user_id:{request.user_id} error:{e}")
        raise HTTPException(status_code=500, detail=f"Transaction failed: {e}")
    finally:
        cursor.close()
        conn.close()


# CREATE USER
@app.post("/users", summary="Create new user", description="Creates a new user with zero balance. Returns the new user's ID.")
def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    logger.info(f"Create user request — name:{user.name} email:{user.email}")
    """Creates a new user with zero balance"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s)",
            (user.name, user.email)
        )
        conn.commit()
        logger.info(f"User created — user_id:{cursor.lastrowid}")
        return {"message": "User created", "user_id": cursor.lastrowid}
        

    except Exception as e:
        conn.rollback()
        logger.error(f"Create user failed — error:{e}")
        raise HTTPException(status_code=400, detail=f"Could not create user: {e}")
    finally:
        cursor.close()
        conn.close()

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)