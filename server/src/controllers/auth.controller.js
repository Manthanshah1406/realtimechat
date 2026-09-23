const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;
    // body already validated by zod middleware

    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ username, email, password_hash });

    res.status(201).json({ token: signToken(user), user: sanitise(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    // body already validated by zod middleware

    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user: sanitise(user) });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitise(user) });
  } catch (err) {
    next(err);
  }
}

function sanitise(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = { signup, login, getMe };
