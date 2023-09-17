/**
 * @type {import('fastify').RouteShorthandOptions}
 * @const
 */
const opts = {
  schema: {
    querystring: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
};

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes(fastify, options) {
  fastify.delete("/key", opts, async (request, reply) => {
    // Connect to Postgres
    const client = await fastify.pg.connect();
    // Delete the key
    try {
      // First check if it exists
      // Read-only checking is not needed here because a read-only key won't be found (we're searching based on rw keys)
      const result = await client.query(
        "SELECT * FROM keys WHERE name = $1 LIMIT 1",
        [request.query.name]
      );
      if (result.rows.length === 0) {
        // If it doesn't, return an error
        return reply
          .code(404)
          .send({ error: "Key with this name does not exist. Ensure you're not using a read-only key." });
      }
      // Otherwise, delete the key
      await client.query("DELETE FROM keys WHERE name = $1", [
        request.query.name,
      ]);
    } catch (err) {
      // If anything goes wrong, return an error
      return reply.code(500).send({ error: "Internal Server Error" });
    } finally {
      client.release();
    }
    return { success: true };
  });
}

export default routes;
