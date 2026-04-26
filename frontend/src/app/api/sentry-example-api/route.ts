import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A faulty API route to test Sentry's server-side error reporting.
export async function GET() {
  throw new Error('Sentry Server-Side Test Error — SchoolMS API route');
  // eslint-disable-next-line no-unreachable
  return NextResponse.json({ data: 'Testing Sentry Error...' });
}
