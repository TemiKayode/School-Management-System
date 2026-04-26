import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import { notFound } from '../../middleware/notFound';

export function buildTestApp(router: express.Router, prefix = '/api/v1/test') {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
