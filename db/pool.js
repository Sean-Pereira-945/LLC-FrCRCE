const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('SERVER ERROR: DATABASE_URL environment variable is missing.');
} else {
  console.log('DATABASE_CONFIG: DATABASE_URL found, length:', process.env.DATABASE_URL.length);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;

