import 'dotenv/config';
import { 
  jsonSchemaTransform, 
  serializerCompiler, 
  validatorCompiler, 
  ZodTypeProvider } from 'fastify-type-provider-zod';
// ESM
import Fastify, { fastify } from 'fastify';
import { z } from 'zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

const app = Fastify({
  logger: true,
});

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'SampleApi',
      description: 'Sample backend service',
      version: '1.0.0',
    },
    servers: [],
  },
  transform: jsonSchemaTransform,

});

app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
});

// Declare a route
app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  // Define your schema
  schema: {
    description: "Hello World",
    tags: [`Hello World`],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return { 
      message: 'Hello, World!',
    };
  },
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT || '3000') });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
start();

