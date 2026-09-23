const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPool } = require('../config/db');

const router = Router();

router.use(authMiddleware);

// GET /api/users/search?q=alice  — find users by username (excludes self)
router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json({ users: [] });

    const { rows } = await getPool().query(
      `SELECT id, username, avatar_url
       FROM users
       WHERE username ILIKE $1
         AND id <> $2
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/users  — list all users except self (for group creation)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, username, avatar_url FROM users WHERE id <> $1 ORDER BY username`,
      [req.user.id]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
