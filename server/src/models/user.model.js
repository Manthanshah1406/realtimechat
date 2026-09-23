const { getPool } = require('../config/db');

async function create({ username, email, password_hash, avatar_url = null }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [username, email, password_hash, avatar_url]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await getPool().query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await getPool().query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

module.exports = { create, findByEmail, findById };
