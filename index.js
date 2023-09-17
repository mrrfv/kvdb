import "dotenv/config";
import Fastify from "fastify";
import createKey from "./routes/create-key.js";
import deleteKey from "./routes/delete-key.js";
import updateKey from "./routes/update-key.js";
import getKey from "./routes/get-key.js";

const fastify = Fastify({
  logger: true,
});

// Load fastify plugins
fastify.register(import("@fastify/compress"));
fastify.register(
  import("@fastify/cors", {
    origin: process.env.CORS_ORIGINS || false,
    methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
await fastify.register(import("@fastify/rate-limit"), {
  max: parseInt(process.env.MAX_REQUESTS_PER_SEC) || 5,
  timeWindow: "1 second",
});

// Response throttling
if (process.env.RESPONSE_THROTTLE_KBPS) {
  await fastify.register(import("@fastify/throttle"), {
    bytesPerSecond: parseInt(process.env.RESPONSE_THROTTLE_KBPS) * 1024,
    streamPayloads: true, // throttle the payload if it is a stream
    bufferPayloads: true, // throttle the payload if it is a Buffer
    stringPayloads: true, // throttle the payload if it is a string
  });
}
// Postgres database
fastify.register(import("@fastify/postgres"), {
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Load routes
fastify.register(createKey);
fastify.register(deleteKey);
fastify.register(updateKey);
fastify.register(getKey);

// Data auto-deletion
// We can't expect the script to be online 24/7, so the best we can do is
// to delete keys that haven't been accessed in a while:
// 1. At startup,
// 2. On an incoming request, if the last cleanup was more than 1 hour ago (to avoid frequent slowdowns).
// This is not perfect, but it's better than nothing.
async function deleteOldKeys() {
  // If this option is disabled, return
  if (!process.env.DELETE_DATA_AFTER_TIME) return;

  fastify.log.info("Deleting unaccessed keys...");
  // Connect to Postgres
  const client = await fastify.pg.connect();
  // Delete the keys
  try {
    await client.query(
      `DELETE FROM keys WHERE last_accessed < CURRENT_TIMESTAMP - INTERVAL '${process.env.DELETE_DATA_AFTER_TIME}'`,
    );
    fastify.log.info(`Deleted unaccessed keys older than ${process.env.DELETE_DATA_AFTER_TIME}.`);
  } catch (err) {
    fastify.log.error(err);
  } finally {
    client.release();
  }
}

// Create a hook to delete old keys on incoming requests
let lastCleanup;
fastify.addHook("onRequest", async (request, reply) => {
  // Check if the last cleanup was more than 1 hour ago
  if (
    !lastCleanup ||
    lastCleanup < Date.now() - 1000 * 60 * 60
  ) {
    // If it was, delete old keys
    await deleteOldKeys();
    // Update the last cleanup time
    lastCleanup = Date.now();
  }
});

// Respond to /healthcheck requests with a 200 OK
fastify.get("/healthcheck", async (request, reply) => {
  return reply.code(200).send();
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
    // Delete old keys at startup
    deleteOldKeys();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
