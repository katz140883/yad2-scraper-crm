-- Initial database schema for Yad2 CRM

-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_id INTEGER NULL,
    whatsapp_qr_code TEXT NULL,
    whatsapp_session_data JSONB NULL,
    whatsapp_ready BOOLEAN DEFAULT FALSE
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id),
    plan_type VARCHAR(50) DEFAULT 'basic_monthly',
    status VARCHAR(50) NOT NULL DEFAULT 'inactive',
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leads table
CREATE TABLE leads (
    lead_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    yad2_listing_id VARCHAR(255) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NULL,
    phone_number VARCHAR(50) NULL,
    address TEXT NULL,
    apartment_size VARCHAR(50) NULL,
    rooms_count VARCHAR(50) NULL,
    publish_date VARCHAR(50) NULL,
    description TEXT NULL,
    listing_url TEXT NULL,
    status VARCHAR(50) DEFAULT 'new',
    scraped_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    whatsapp_message_sent BOOLEAN DEFAULT FALSE
);

-- Create admins table
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint from users to subscriptions
ALTER TABLE users ADD CONSTRAINT fk_user_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id);

-- Create indexes for performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_scraped_at ON leads(scraped_at);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Create a default admin user (password: admin123)
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '$2b$10$X7VYVy1Z5Z1Z5Z1Z5Z1Z5OQX7VYVy1Z5Z1Z5Z1Z5Z1Z5Z1Z5Z1Z5Z');
