import crypto from "crypto";

/**
 * @type {import('fastify').RouteShorthandOptions}
 * @const
 */
const opts = {
  schema: {
    body: {
      type: "object",
      properties: {
        name: { type: "string" }, // Optional, default will be random
      },
    },
  },
  config: {
    rateLimit: {
      max: process.env.KEY_CREATION_RATELIMIT_MAX_REQUESTS ? parseInt(process.env.KEY_CREATION_RATELIMIT_MAX_REQUESTS) : 1,
      timeWindow: process.env.KEY_CREATION_RATELIMIT_TIME_WINDOW || "1 minute",
    },
  }
};

// Function to verify the key name is valid (no special characters, spaces, etc.)
function isValidKeyName(keyName) {
    // Check if the key name is too long
    if (keyName.length > parseInt(process.env.MAX_KEY_LENGTH) ||
        keyName.length < parseInt(process.env.MIN_KEY_LENGTH)
    ) {
        return false;
    }
    // Check if the key name contains any special characters
    if (keyName.match(/[^a-zA-Z0-9-_]/g)) {
        return false;
    }
    // Check if the key name contains any spaces
    if (keyName.match(/\s/g)) {
        return false;
    }
    // If everything's good, return true
    return true;
}

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(fastify, options) {
  fastify.post("/key", opts, async (request, reply) => {
    // Get the key names
    // ro means read-only
    let keyName = "";
    let roKeyName = "readonly-" + crypto.randomBytes(parseInt(process.env.MAX_KEY_LENGTH) / 2 - 9).toString("hex");

    // If no name was provided, or a custom name's disallowed, generate a random key name
    if (process.env.FORCE_RANDOM_KEY == "1" ||
        !request.body.name ||
        !isValidKeyName(request.body.name)) {
        keyName = crypto.randomBytes(parseInt(process.env.MAX_KEY_LENGTH) / 2).toString("hex");
    } else {
        // Otherwise, use the provided name
        keyName = request.body.name;
    }

    // Connect to Postgres
    const client = await fastify.pg.connect();
    // Insert the key
    try {
        // First check if it already exists
        // We're checking for both the read-write and read-only keys to avoid collisions
        // This should probably be done in a cleaner way
        const result = await client.query("SELECT * FROM keys WHERE name = $1 OR roname = $2 OR name = $2 OR roname = $1", [keyName, roKeyName]);
        if (result.rows.length > 0) {
            // If it does, return an error
            return reply.code(409).send({ error: "Key with this name already exists" });
        }
        // Otherwise, insert the key
        await client.query("INSERT INTO keys (name, roname, last_accessed) VALUES ($1, $2, CURRENT_TIMESTAMP)", [keyName, roKeyName]);
    } catch (err) {
        fastify.log.error(err);
        // If anything goes wrong, return an error
        return reply.code(500).send({ error: "Internal Server Error" });
    } finally {
        client.release();
    }

    return { name: keyName, name_readonly: roKeyName, success: true };
  });
}

export default routes;
