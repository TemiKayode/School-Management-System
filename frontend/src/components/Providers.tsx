'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Show cached data instantly, refetch silently in background after 2 min
            staleTime: 2 * 60 * 1000,
            // Keep unused data in memory for 10 min (survives page navigation)
            gcTime: 10 * 60 * 1000,
            // Don't hammer the server on every window focus
            refetchOnWindowFocus: false,
            // Only retry once on failure
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
