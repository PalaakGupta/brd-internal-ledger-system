from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection
from datetime import datetime, timedelta
from models import TransactionRequest, UserCreate, LoginRequest, ResourceCreate
from auth import verify_password, create_token
import logging
from fastapi.responses import StreamingResponse
import csv
import io

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
    description="Shared resource and fund manager. Tracks deposits, consumption, bookings and group balances.",
    version="3.0.0"
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


@app.get("/")
def root():
    return {"status": "Internal Ledger API is running", "version": "3.0.0"}


@app.post("/login")
def login(request: LoginRequest):
    logger.info(f"Login attempt — email:{request.email}")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, balance, password_hash, is_admin FROM users WHERE email = %s", (request.email,))
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
            "email": user["email"],
            "is_admin": bool(user["is_admin"])
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/balance/{user_id}")
def get_balance(user_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        cursor.close()
        conn.close()


@app.get("/transactions/{user_id}")
def get_transactions(user_id: int):
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


@app.get("/summary/{user_id}")
def get_summary(user_id: int):
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


@app.post("/transact")
def transact(request: TransactionRequest):
    logger.info(f"Transaction — user_id:{request.user_id} type:{request.type} amount:{request.amount}")
    if request.type not in ["deposit", "deduct"]:
        raise HTTPException(status_code=400, detail="type must be 'deposit' or 'deduct'")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT balance FROM users WHERE id = %s", (request.user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        current_balance = float(user["balance"])
        if request.type == "deduct":
            if request.amount > current_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds. Balance: {current_balance}, Requested: {request.amount}"
                )
            new_balance = current_balance - request.amount
        else:
            new_balance = current_balance + request.amount
        cursor.execute("UPDATE users SET balance = %s WHERE id = %s", (new_balance, request.user_id))
        cursor.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, %s, %s, %s)",
            (request.user_id, request.type, request.amount, request.description)
        )
        conn.commit()
        logger.info(f"Transaction complete — user_id:{request.user_id} new_balance:{new_balance}")
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


@app.get("/group")
def get_group():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                u.id,
                u.name,
                u.email,
                u.balance,
                COALESCE(SUM(CASE WHEN t.type='deposit' THEN t.amount ELSE 0 END), 0) as total_deposited,
                COALESCE(SUM(CASE WHEN t.type='deduct' THEN t.amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN t.type='deduct'
                    AND MONTH(t.created_at) = MONTH(CURRENT_DATE())
                    AND YEAR(t.created_at) = YEAR(CURRENT_DATE())
                    THEN t.amount ELSE 0 END), 0) as spent_this_month
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id
            GROUP BY u.id, u.name, u.email, u.balance
            ORDER BY u.balance DESC
        """)
        users = cursor.fetchall()

        cursor.execute("SELECT SUM(balance) as total_fund, COUNT(*) as member_count FROM users")
        fund_stats = cursor.fetchone()

        cursor.execute("""
            SELECT AVG(balance) as avg_balance FROM users
        """)
        avg = cursor.fetchone()

        for u in users:
            avg_bal = float(avg["avg_balance"] or 0)
            u_bal = float(u["balance"])
            u["owes"] = round(max(0, avg_bal - u_bal), 2)
            u["surplus"] = round(max(0, u_bal - avg_bal), 2)

        return {
            "users": users,
            "total_fund": float(fund_stats["total_fund"] or 0),
            "member_count": int(fund_stats["member_count"]),
            "avg_balance": float(avg["avg_balance"] or 0)
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/activity")
def get_activity():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                t.id, t.type, t.amount, t.description,
                t.created_at, u.name as user_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 30
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@app.get("/owing")
def get_owing():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT AVG(balance) as avg_balance FROM users")
        avg = cursor.fetchone()
        avg_balance = float(avg["avg_balance"] or 0)

        cursor.execute("""
            SELECT id, name, email, balance
            FROM users
            WHERE balance < %s
            ORDER BY balance ASC
        """, (avg_balance,))
        users = cursor.fetchall()

        result = []
        for u in users:
            result.append({
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "balance": float(u["balance"]),
                "owes": round(avg_balance - float(u["balance"]), 2),
                "avg_balance": round(avg_balance, 2)
            })
        return result
    finally:
        cursor.close()
        conn.close()


@app.get("/resources")
def get_resources():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM resources ORDER BY category, price ASC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@app.post("/consume")
def consume(user_id: int, resource_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM resources WHERE id = %s", (resource_id,))
        resource = cursor.fetchone()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        if resource.get("category") == "bookable":
            avail = resource.get("available_units")
            if avail is not None and avail <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"{resource['name']} is fully booked. No units available."
                )

        cursor.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        current_balance = float(user["balance"])
        price = float(resource["price"])

        if price > current_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds. Balance: {current_balance}, Cost: {price}"
            )

        new_balance = current_balance - price

        cursor.execute("UPDATE users SET balance = %s WHERE id = %s", (new_balance, user_id))

        if resource.get("category") == "bookable" and resource.get("available_units") is not None:
            cursor.execute(
                "UPDATE resources SET available_units = available_units - 1 WHERE id = %s",
                (resource_id,)
            )

        cursor.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, 'deduct', %s, %s)",
            (user_id, price, f"{resource['icon']} {resource['name']}")
        )
        conn.commit()

        low_balance = new_balance < 50

        logger.info(f"Consumed {resource['name']} — user_id:{user_id} new_balance:{new_balance}")
        return {
            "message": f"{resource['icon']} {resource['name']} logged",
            "new_balance": new_balance,
            "amount": price,
            "low_balance_warning": low_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Consume failed: {e}")
    finally:
        cursor.close()
        conn.close()


@app.post("/register")
def register(user: UserCreate):
    """
    Creates a new user account with a hashed password.
    This is what the registration form calls.
    """
    from auth import hash_password  # import here to keep it clean
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Hash the password before storing — never store plain text
        hashed = hash_password(user.password)
        
        cursor.execute(
            "INSERT INTO users (name, email, balance, password_hash) VALUES (%s, %s, 0.00, %s)",
            (user.name, user.email, hashed)
        )
        conn.commit()
        logger.info(f"New user registered — email:{user.email}")
        return {"message": "Account created. You can now login.", "user_id": cursor.lastrowid}
    except Exception as e:
        conn.rollback()
        # MySQL error 1062 = duplicate entry (email already exists)
        if "1062" in str(e):
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail=f"Could not create account: {e}")
    finally:
        cursor.close()
        conn.close()

@app.get("/admin/users")
def admin_get_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.balance, u.is_admin,
                COUNT(t.id) as transaction_count
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id
            GROUP BY u.id
            ORDER BY u.id
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@app.post("/admin/resource")
def admin_add_resource(resource: ResourceCreate):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO resources (name, price, icon, category, total_units, available_units) VALUES (%s, %s, %s, %s, %s, %s)",
            (resource.name, resource.price, resource.icon,
             resource.category, resource.total_units, resource.total_units)
        )
        conn.commit()
        return {"message": "Resource added", "id": cursor.lastrowid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.delete("/admin/resource/{resource_id}")
def admin_delete_resource(resource_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM resources WHERE id = %s", (resource_id,))
        conn.commit()
        return {"message": "Resource deleted"}
    finally:
        cursor.close()
        conn.close()


@app.post("/admin/deposit")
def admin_deposit(user_id: int, amount: float, description: str = "Admin deposit"):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        new_balance = float(user["balance"]) + amount
        cursor.execute("UPDATE users SET balance = %s WHERE id = %s", (new_balance, user_id))
        cursor.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, 'deposit', %s, %s)",
            (user_id, amount, f"[Admin] {description}")
        )
        conn.commit()
        return {"message": "Deposit successful", "new_balance": new_balance}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/export/transactions/{user_id}")
def export_user_transactions(user_id: int):
    """
    Downloads all transactions for one user as a CSV file.
    The browser receives it as a file download automatically.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get user name for the filename
        cursor.execute("SELECT name FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get ALL transactions, not just last 20
        cursor.execute("""
            SELECT id, type, amount, description, created_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cursor.fetchall()

        # Build CSV in memory using StringIO — no file saved on disk
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "type", "amount", "description", "created_at"])
        writer.writeheader()
        writer.writerows(rows)
        output.seek(0)  # Go back to start of the string

        filename = f"{user['name'].lower()}_transactions.csv"

        # StreamingResponse sends the CSV as a downloadable file
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    finally:
        cursor.close()
        conn.close()


@app.get("/export/group")
def export_group_transactions():
    """
    Admin endpoint — downloads ALL transactions from ALL users as CSV.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                t.id, u.name as user_name, t.type, 
                t.amount, t.description, t.created_at
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """)
        rows = cursor.fetchall()

        output = io.StringIO()
        writer = csv.DictWriter(
            output, 
            fieldnames=["id", "user_name", "type", "amount", "description", "created_at"]
        )
        writer.writeheader()
        writer.writerows(rows)
        output.seek(0)

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=group_transactions.csv"}
        )
    finally:
        cursor.close()
        conn.close()



@app.post("/book")
def book_resource(user_id: int, resource_id: int, duration_minutes: int = 60):
    """
    Books a resource for a specified duration.
    Deducts cost, decrements available_units, creates booking record.
    Duration examples: locker=1440(1 day), pod=60-120, meeting=as needed
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get resource
        cursor.execute("SELECT * FROM resources WHERE id = %s", (resource_id,))
        resource = cursor.fetchone()
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

        if resource["category"] != "bookable":
            raise HTTPException(status_code=400, detail="This resource cannot be booked")

        # Check availability
        avail = resource.get("available_units")
        if avail is not None and avail <= 0:
            raise HTTPException(status_code=400, detail=f"{resource['name']} is fully booked")

        # Get user balance
        cursor.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        price = float(resource["price"])
        current_balance = float(user["balance"])

        if price > current_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds. Balance: {current_balance}, Cost: {price}"
            )

        new_balance = current_balance - price
        ends_at = datetime.utcnow() + timedelta(minutes=duration_minutes)

        # Deduct balance
        cursor.execute("UPDATE users SET balance = %s WHERE id = %s", (new_balance, user_id))

        # Decrement availability
        cursor.execute(
            "UPDATE resources SET available_units = available_units - 1 WHERE id = %s",
            (resource_id,)
        )

        # Create booking record
        cursor.execute(
            """INSERT INTO bookings (user_id, resource_id, duration_minutes, ends_at) 
               VALUES (%s, %s, %s, %s)""",
            (user_id, resource_id, duration_minutes, ends_at)
        )

        # Log transaction
        cursor.execute(
            "INSERT INTO transactions (user_id, type, amount, description) VALUES (%s, 'deduct', %s, %s)",
            (user_id, price, f"{resource['icon']} {resource['name']} ({duration_minutes} min)")
        )

        conn.commit()
        logger.info(f"Booked {resource['name']} — user:{user_id} until:{ends_at}")

        return {
            "message": f"{resource['icon']} {resource['name']} booked",
            "ends_at": ends_at.isoformat(),
            "duration_minutes": duration_minutes,
            "new_balance": new_balance,
            "low_balance_warning": new_balance < 50
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Booking failed: {e}")
    finally:
        cursor.close()
        conn.close()


@app.post("/release/{booking_id}")
def release_booking(booking_id: int):
    """
    Releases a booking — makes the unit available again.
    Does NOT refund the cost — booking was already used.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "active":
            raise HTTPException(status_code=400, detail="Booking is already released")

        # Mark booking as released
        cursor.execute(
            "UPDATE bookings SET status = 'released' WHERE id = %s",
            (booking_id,)
        )

        # Increment available_units back
        cursor.execute(
            "UPDATE resources SET available_units = available_units + 1 WHERE id = %s",
            (booking["resource_id"],)
        )

        conn.commit()
        logger.info(f"Released booking {booking_id}")
        return {"message": "Resource released successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Release failed: {e}")
    finally:
        cursor.close()
        conn.close()


@app.get("/bookings/{user_id}")
def get_user_bookings(user_id: int):
    """Returns all active bookings for a user"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                b.id, b.duration_minutes, b.booked_at, 
                b.ends_at, b.status,
                r.name as resource_name, r.icon
            FROM bookings b
            JOIN resources r ON b.resource_id = r.id
            WHERE b.user_id = %s
            ORDER BY b.booked_at DESC
        """, (user_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@app.get("/bookings/resource/{resource_id}")
def get_resource_bookings(resource_id: int):
    """Admin — who has booked a specific resource"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                b.id, b.booked_at, b.ends_at, b.status,
                b.duration_minutes, u.name as user_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.resource_id = %s AND b.status = 'active'
            ORDER BY b.booked_at DESC
        """, (resource_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)