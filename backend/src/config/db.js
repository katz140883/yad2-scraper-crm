require("dotenv").config();
const { Pool } = require("pg");

// Check if DATABASE_URL is provided (standard for Railway, Heroku, etc.)
const connectionString = process.env.DATABASE_URL;

// Configuration object for the Pool
const poolConfig = connectionString
  ? { connectionString: connectionString }
  : { // Fallback to individual variables if DATABASE_URL is not set (for local dev)
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

// Add SSL configuration for production environments like Railway if needed
// Railway typically requires SSL for external connections
if (connectionString && !connectionString.includes("localhost")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to the PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Export pool if needed for transactions
};

