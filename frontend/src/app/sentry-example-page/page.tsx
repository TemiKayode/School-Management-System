'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryExamplePage() {
  const [isErrorThrown, setIsErrorThrown] = useState(false);

  function throwError() {
    setIsErrorThrown(true);
    throw new Error('Sentry Frontend Test Error — SchoolMS');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] p-6">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
          <span className="text-2xl">🐛</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sentry Test Page</h1>
        <p className="text-sm text-gray-500">
          Click the button below to throw a test error. If Sentry is wired up
          correctly you will see it appear in your{' '}
          <a
            href="https://orda-delivery.sentry.io/issues/"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline font-medium"
          >
            Sentry Issues
          </a>{' '}
          within a few seconds.
        </p>

        <button
          onClick={throwError}
          disabled={isErrorThrown}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 shadow-md hover:opacity-90 active:scale-[0.98] transition-all text-sm disabled:opacity-50"
        >
          {isErrorThrown ? 'Error thrown ✓' : 'Throw test error'}
        </button>

        <button
          onClick={() =>
            Sentry.captureMessage('SchoolMS Sentry test message', 'info')
          }
          className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all text-sm"
        >
          Send test message (no crash)
        </button>

        <p className="text-xs text-gray-400">
          This page is for development verification only. Remove or protect it before going live.
        </p>
      </div>
    </div>
  );
}
