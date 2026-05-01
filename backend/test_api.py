import pytest
from fastapi.testclient import TestClient
from main import app

# TestClient simulates HTTP requests without needing the server running
client = TestClient(app)

# BALANCE TESTS

def test_get_balance_valid_user():
    """Valid user should return their balance"""
    response = client.get("/balance/1")
    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert "name" in data

def test_get_balance_invalid_user():
    """Non-existent user should return 404"""
    response = client.get("/balance/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# TRANSACTION TESTS

def test_deposit_increases_balance():
    """Deposit should increase balance by exact amount"""
    # Get balance before
    before = client.get("/balance/2").json()["balance"]

    # Make deposit
    response = client.post("/transact", json={
        "user_id": 2,
        "type": "deposit",
        "amount": 50.00,
        "description": "test deposit"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["new_balance"] == before + 50.00

def test_deduct_decreases_balance():
    """Valid deduction should decrease balance"""
    response = client.post("/transact", json={
        "user_id": 1,
        "type": "deduct",
        "amount": 10.00,
        "description": "test deduction"
    })
    assert response.status_code == 200
    assert "new_balance" in response.json()

def test_insufficient_funds_rejected():
    """
    CRITICAL TEST — sub-zero balance must be prevented.
    This is the core business rule of the entire system.
    """
    response = client.post("/transact", json={
        "user_id": 3,
        "type": "deduct",
        "amount": 99999.00,
        "description": "attempt overdraft"
    })
    assert response.status_code == 400
    assert "Insufficient funds" in response.json()["detail"]

def test_negative_amount_rejected():
    """Pydantic should reject negative amounts before business logic runs"""
    response = client.post("/transact", json={
        "user_id": 1,
        "type": "deposit",
        "amount": -100
    })
    assert response.status_code == 422

def test_invalid_transaction_type():
    """Only 'deposit' and 'deduct' are valid types"""
    response = client.post("/transact", json={
        "user_id": 1,
        "type": "steal",
        "amount": 100
    })
    assert response.status_code == 400

# AUDIT TRAIL TESTS

def test_transactions_returns_list():
    """Audit trail should return a list"""
    response = client.get("/transactions/1")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_transactions_max_20():
    """Audit trail should never return more than 20 records"""
    response = client.get("/transactions/1")
    assert len(response.json()) <= 20