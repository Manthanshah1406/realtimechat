const Redis = require('ioredis');

let pubClient;
let subClient;

function createRedisClient() {
  const url = process.env.REDIS_URL;

  // Upstash uses rediss:// (TLS) — ioredis needs tls option explicitly
  const isTLS = url?.startsWith('rediss://');

  return new Redis(url, {
    tls: isTLS ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 500, 2000);
    },
  });
}

async function connectRedis() {
  pubClient = createRedisClient();
  subClient = createRedisClient();

  pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
  subClient.on('error', (err) => console.error('Redis sub error:', err.message));

  await pubClient.ping();
  console.log('✅ Redis connected');
}

function getPubClient() {
  if (!pubClient) throw new Error('Redis not initialised — call connectRedis() first');
  return pubClient;
}

function getSubClient() {
  if (!subClient) throw new Error('Redis not initialised — call connectRedis() first');
  return subClient;
}

module.exports = { connectRedis, getPubClient, getSubClient };
