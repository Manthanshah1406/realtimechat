const jwt = require('jsonwebtoken');

/**
 * REST route middleware — attaches decoded user to req.user.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Socket.IO middleware — attaches decoded user to socket.user.
 * Token is passed via handshake auth: { token: '...' }
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: no token'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error: invalid token'));
  }
}

module.exports = { authMiddleware, socketAuthMiddleware };
