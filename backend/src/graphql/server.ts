import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Server as HttpServer } from 'http';
import express from 'express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { verifyToken } from '../utils/jwt';
import { getRedis } from '../config/redis';
import logger from '../utils/logger';

export async function createGraphQLServer(httpServer: HttpServer) {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      logger.error('GraphQL error', error);
      return { message: error.message, code: error.extensions?.code };
    },
  });

  await server.start();

  return expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization;
      let user = null;
      let token = null;

      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        try {
          const redis = getRedis();
          const blacklisted = await redis.get(`blacklist:${token}`);
          if (!blacklisted) {
            user = verifyToken(token);
          }
        } catch {
          // invalid token — user stays null
        }
      }

      return { user, token };
    },
  });
}
