import 'dotenv/config';

// Require the framework and instantiate it

// ESM
import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' });
})

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT || '3000') });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();