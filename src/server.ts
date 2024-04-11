import fastify from "fastify";
import dotenv from "dotenv";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifyCors from "@fastify/cors";

import { serializerCompiler, validatorCompiler, jsonSchemaTransform, ZodTypeProvider } from 'fastify-type-provider-zod';
import routes from "./routes"; // Supondo que você tenha um arquivo que exporta todas as rotas
import { errorHandler } from "./error-handler";

dotenv.config();

export const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.register(fastifyCors, {
  origin: '*',
});

app.register(fastifySwagger, {
  swagger: {
    consumes: ['application/json'],
    produces: ['application/json'],
    info: {
      title: 'pass.in API',
      description: 'API specifications for the pass.in application backend.',
      version: '1.0.0'
    },
  },
  transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUI, { routePrefix: '/docs' });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

routes.forEach(route => app.register(route));

app.setErrorHandler(errorHandler);

const start = async () => {
  try {
    await app.listen({ port: process.env.PORT || 3333, host: '0.0.0.0' });
    console.log('HTTP server running!');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
