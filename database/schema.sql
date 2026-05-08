CREATE DATABASE IF NOT EXISTS internal_ledger;
USE internal_ledger;

    -- Users table
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    balance       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    password_hash VARCHAR(255)  NOT NULL DEFAULT '',
    is_admin      BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table — immutable audit trail, never deleted or edited
CREATE TABLE IF NOT EXISTS transactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT           NOT NULL,
    type        ENUM('deposit','deduct') NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Resources table — consumables and bookable items
CREATE TABLE IF NOT EXISTS resources (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    icon            VARCHAR(10)   DEFAULT '📦',
    category        VARCHAR(50)   NOT NULL DEFAULT 'consumable',
    total_units     INT           DEFAULT NULL,
    available_units INT           DEFAULT NULL,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Seed Data
-- ==============================================

-- Default users (password: password123)
INSERT INTO users (name, email, balance, password_hash, is_admin) VALUES
('Palak', 'palak@office.com', 500.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE),
('Rahul', 'rahul@office.com', 300.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE),
('Sneha', 'sneha@office.com', 150.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE),
('Admin', 'admin@office.com', 0.00,
 '$2b$12$N/Zu49JBiab3rsKT4Eqyku7DqS06nyI1f2HVOF7q2tuEK1Fe3RYVy', TRUE);
 ('Mishal', 'mishal@office.com', 0.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE),
    
-- Opening deposits for non-admin users
INSERT INTO transactions (user_id, type, amount, description) VALUES
(1, 'deposit', 500.00, 'Initial deposit'),
(2, 'deposit', 300.00, 'Initial deposit'),
(3, 'deposit', 150.00, 'Initial deposit');

-- Consumable resources
INSERT INTO resources (name, price, icon, category) VALUES
('Coffee',     20.00, '☕', 'consumable'),
('Tea',        10.00, '🍵', 'consumable'),
('Samosa',     15.00, '🥟', 'consumable'),
('Biscuits',    5.00, '🍪', 'consumable'),
('Cold Drink', 25.00, '🥤', 'consumable'),
('Maggi',      20.00, '🍜', 'consumable');

-- Bookable resources
INSERT INTO resources (name, price, icon, category, total_units, available_units) VALUES
('Sleeping Pod',   50.00, '🛏️', 'bookable',  5,  3),
('Meeting Room A', 100.00, '🏢', 'bookable',  1,  1),
('Locker',         20.00, '🔒', 'bookable', 10,  7);

USE internal_ledger;

-- Bookings table — tracks who booked what and when
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT NOT NULL DEFAULT 60,
    ends_at TIMESTAMP NOT NULL,
    status ENUM('active', 'released', 'expired') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Add to schema.sql as well