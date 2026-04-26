import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://146bc222f76d737247dc83017a701ee9@o4509921943158784.ingest.us.sentry.io/4511287040540672',

  environment: process.env.NODE_ENV,

  // Capture 100% of traces in development, 20% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session Replay — capture 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
    }),
  ],

  // Debug mode in development only
  debug: false,
});
