/**
 * @type {import('fastify').RouteShorthandOptions}
 * @const
 */
const opts = {
  schema: {
    querystring: {
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
}

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(fastify, options) {
  fastify.get("/key", opts, async (request, reply) => {
    // Connect to Postgres
    const client = await fastify.pg.connect();
    // Get the key
    try {
      const result = await client.query("SELECT * FROM keys WHERE name = $1 OR roname = $1 LIMIT 1", [request.query.name]);
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Key with this name does not exist" });
      }
      // Update the last accessed time
      // Last accessed time is updated even for read-only keys
      await client.query("UPDATE keys SET last_accessed = CURRENT_TIMESTAMP WHERE name = $1 OR roname = $1", [request.query.name]);
      // Return the value
      return { value: result.rows[0].value };
    } catch (err) {
      return reply.code(500).send({ error: "Internal Server Error" });
    } finally {
      client.release();
    }
  });
}

export default routes;
