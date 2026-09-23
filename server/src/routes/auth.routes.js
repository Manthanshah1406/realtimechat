const { Router } = require('express');
const { signup, login, getMe } = require('../controllers/auth.controller');
const { authMiddleware }       = require('../middleware/auth');
const { authLimiter }          = require('../middleware/rateLimiter');
const { validate, signupSchema, loginSchema } = require('../middleware/validate');

const router = Router();

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login',  authLimiter, validate(loginSchema),  login);
router.get('/me',      authMiddleware, getMe);

module.exports = router;
