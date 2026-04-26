import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://146bc222f76d737247dc83017a701ee9@o4509921943158784.ingest.us.sentry.io/4511287040540672',

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Print useful info to console during development
  debug: false,
});
