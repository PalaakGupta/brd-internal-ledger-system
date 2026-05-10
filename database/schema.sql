
DROP DATABASE IF EXISTS internal_ledger;
CREATE DATABASE internal_ledger;
USE internal_ledger;
-- TABLES

CREATE TABLE users (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(100)  NOT NULL,
    email             VARCHAR(150)  NOT NULL UNIQUE,
    balance           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    password_hash     VARCHAR(255)  NOT NULL DEFAULT '',
    is_admin          BOOLEAN       NOT NULL DEFAULT FALSE,
    total_contributed DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_consumed    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Shared fund — the single jar everyone contributes to
CREATE TABLE fund (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    total_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Immutable audit trail — never deleted or edited
CREATE TABLE transactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT           NOT NULL,
    type        ENUM('deposit','deduct') NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Consumables and bookable shared resources
CREATE TABLE resources (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    icon            VARCHAR(10)   DEFAULT '📦',
    category        VARCHAR(50)   NOT NULL DEFAULT 'consumable',
    total_units     INT           DEFAULT NULL,
    available_units INT           DEFAULT NULL,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Tracks who booked what and for how long
CREATE TABLE bookings (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    resource_id      INT NOT NULL,
    booked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT NOT NULL DEFAULT 60,
    ends_at          TIMESTAMP NOT NULL,
    status           ENUM('active','released','expired') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);
-- SEED DATA

-- Initial shared jar balance
INSERT INTO fund (total_balance) VALUES (0.00);

-- Users — all passwords are: password123
INSERT INTO users (name, email, balance, password_hash, is_admin, total_contributed) VALUES
('Palak',  'palak@office.com',  500.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE, 500.00),
('Rahul',  'rahul@office.com',  300.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE, 300.00),
('Sneha',  'sneha@office.com',  150.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE, 150.00),
('Mishal', 'mishal@office.com', 200.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', FALSE, 200.00),
('Admin',  'admin@office.com',    0.00,
 '$2b$12$bE8sPQeSHlBf569prNbfoOPNhcpu9EFO7AoomAScBb/eldEVBleUi', TRUE,    0.00);

-- Set shared jar = sum of all deposits
UPDATE fund SET total_balance = 1150.00;

-- Opening deposit transactions
INSERT INTO transactions (user_id, type, amount, description) VALUES
(1, 'deposit', 500.00, 'Initial deposit'),
(2, 'deposit', 300.00, 'Initial deposit'),
(3, 'deposit', 150.00, 'Initial deposit'),
(4, 'deposit', 200.00, 'Initial deposit');

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
('Sleeping Pod',   50.00, '🛏️', 'bookable',  5,  5),
('Meeting Room A', 100.00, '🏢', 'bookable',  1,  1),
('Locker',         20.00, '🔒', 'bookable', 10, 10);