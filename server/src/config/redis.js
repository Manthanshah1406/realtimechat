const Redis = require('ioredis');

// Two separate clients required by @socket.io/redis-adapter
// (one for publishing, one for subscribing)
let pubClient;
let subClient;

async function connectRedis() {
  pubClient = new Redis(process.env.REDIS_URL);
  subClient = new Redis(process.env.REDIS_URL);

  pubClient.on('error', (err) => console.error('Redis pub error:', err));
  subClient.on('error', (err) => console.error('Redis sub error:', err));

  // ioredis connects automatically — verify with a ping
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
