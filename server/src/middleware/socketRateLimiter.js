const { getPubClient } = require('../config/redis');

/**
 * Redis-backed rate limiter for socket events.
 * Uses a sliding window counter per user per event.
 *
 * @param {string} eventName  - label for the Redis key
 * @param {number} maxRequests - max allowed in the window
 * @param {number} windowSecs  - window size in seconds
 */
function createSocketRateLimiter(eventName, maxRequests, windowSecs) {
  return async function rateLimitMiddleware(userId, callback) {
    const redis = getPubClient();
    const key   = `rl:${eventName}:${userId}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        // First request in this window — set expiry
        await redis.expire(key, windowSecs);
      }
      if (current > maxRequests) {
        const ttl = await redis.ttl(key);
        if (callback) callback({
          status: 'error',
          message: `Too many messages. Try again in ${ttl}s.`,
          code: 'RATE_LIMITED',
        });
        return false; // blocked
      }
      return true; // allowed
    } catch (err) {
      // If Redis fails, allow the request (fail open)
      console.error('Rate limiter error:', err.message);
      return true;
    }
  };
}

// 30 messages per 10 seconds per user
const messageSendLimiter = createSocketRateLimiter('message:send', 30, 10);

module.exports = { messageSendLimiter };
