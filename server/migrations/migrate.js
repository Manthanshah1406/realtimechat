/**
 * Simple migration runner.
 * Executes every *.sql file in this directory in alphabetical order.
 * Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const sqlFiles = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.log('No migration files found.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      console.log(`▶ Running ${file} ...`);
      await client.query(sql);
      console.log(`  ✅ ${file} done`);
    }
    console.log('\n✅ All migrations complete.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
