'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    (async () => {
      try {
        // Fetch user profile with the new token
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = data.data;
        setAuth(user, accessToken, refreshToken);

        const dashMap: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          TEACHER: '/teacher/dashboard',
          STUDENT: '/student/dashboard',
          PARENT: '/parent/dashboard',
        };
        router.replace(dashMap[user.role] || '/');
      } catch {
        router.replace('/login?error=oauth_failed');
      }
    })();
  }, [params, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}
