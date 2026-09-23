const { Pool } = require('pg');

let pool;

async function connectPostgres() {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Verify the connection on startup
  const client = await pool.connect();
  console.log('✅ PostgreSQL connected');
  client.release();
}

/**
 * Returns the shared pg Pool.
 * Call connectPostgres() once at app startup before using this.
 */
function getPool() {
  if (!pool) throw new Error('PostgreSQL pool not initialised — call connectPostgres() first');
  return pool;
}

module.exports = { connectPostgres, getPool };
