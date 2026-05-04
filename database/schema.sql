-- Internal Ledger System - Database Schema
-- Project: BRD v1.2.0

CREATE DATABASE IF NOT EXISTS internal_ledger;
USE internal_ledger;

-- Users table
-- Stores each person and their current balance
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
-- Immutable audit trail — rows are NEVER deleted or edited
-- type: 'deposit' adds to balance, 'deduct' subtracts from balance
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('deposit','deduct') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed data — initial users and their opening deposits
INSERT INTO users (name, email, balance) VALUES
('Palak', 'palak@office.com', 500.00),
('Rahul', 'rahul@office.com', 300.00),
('Sneha', 'sneha@office.com', 150.00);

INSERT INTO transactions (user_id, type, amount, description) VALUES
(1, 'deposit', 500.00, 'Initial deposit'),
(2, 'deposit', 300.00, 'Initial deposit'),
(3, 'deposit', 150.00, 'Initial deposit');

password_hash VARCHAR(255) NOT NULL DEFAULT '',