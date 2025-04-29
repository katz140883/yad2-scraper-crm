-- Add role column to users table
ALTER TABLE users
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';

-- Optionally, create an index on the role column
CREATE INDEX idx_users_role ON users(role);

-- Optionally, update an existing user to be an admin (e.g., user_id 1)
-- UPDATE users SET role = 'admin' WHERE user_id = 1;
