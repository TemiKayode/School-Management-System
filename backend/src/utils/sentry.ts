import * as Sentry from '@sentry/node';
import { Express } from 'express';
import logger from './logger';

// Load profiling integration only if the native binary is available
function getProfilingIntegration() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    return nodeProfilingIntegration();
  } catch {
    logger.warn('Sentry profiling native module unavailable — profiling disabled');
    return null;
  }
}

export function initSentry(app: Express) {
  if (!process.env.SENTRY_DSN) {
    logger.warn('SENTRY_DSN not set — Sentry disabled');
    return;
  }

  const profiling = getProfilingIntegration();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
      ...(profiling ? [profiling] : []),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: profiling ? 1.0 : 0,
    environment: process.env.NODE_ENV || 'development',
  });

  logger.info('Sentry initialized');
}

export function sentryRequestHandler() {
  return Sentry.expressErrorHandler();
}

export function captureError(err: Error, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
