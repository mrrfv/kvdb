const opts = {
    schema: {
        body: {
            type: "object",
            properties: {
                name: { type: "string" },
                value: { type: "string" },
            },
            required: ["name", "value"],
        },
    },
};

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(fastify, options) {
  fastify.patch("/key", opts, async (request, reply) => {
    // Check if the value is too large
    if (request.body.value.length > parseInt(process.env.MAX_VALUE_LENGTH)) {
      return reply.code(400).send({ error: "Value too large" });
    }

    // Connect to Postgres
    const client = await fastify.pg.connect();
    // Update the key
    try {
      // First check if it exists
      // Read-only checking is not needed here because a read-only key won't be found (we're searching based on rw keys)
      const result = await client.query("SELECT * FROM keys WHERE name = $1 LIMIT 1", [request.body.name]);
      if (result.rows.length === 0) {
        // If it doesn't, return an error
        return reply.code(404).send({ error: "Key with this name does not exist. Ensure you're not using a read-only key." });
      }
      // Otherwise, update the key as well as the last accessed time
      await client.query("UPDATE keys SET value = $1, last_accessed = CURRENT_TIMESTAMP WHERE name = $2", [request.body.value, request.body.name]);
      // Return a success message
      return reply.code(200).send({ success: true });
    } catch (err) {
      // If anything goes wrong, return an error
      return reply.code(500).send({ error: "Internal Server Error" });
    } finally {
      client.release();
    }
  });
}

export default routes;
