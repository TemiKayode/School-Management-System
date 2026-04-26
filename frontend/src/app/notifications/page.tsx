'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { notificationsAPI } from '@/lib/api';
import { Bell, CheckCheck, BellRing, BellOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsAPI.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = (notifications || []).filter((n: any) => !n.read).length;
  const push = usePushSubscription();

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Push notification opt-in */}
        {push.isSupported && (
          <div className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Browser Push Notifications</p>
                <p className="text-xs text-gray-500">
                  {push.isSubscribed ? 'You will receive push alerts in this browser.' : 'Get instant alerts even when the tab is closed.'}
                </p>
              </div>
            </div>
            <button
              onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
              disabled={push.isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                push.isSubscribed
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {push.isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {push.isLoading ? 'Please wait…' : push.isSubscribed ? 'Unsubscribe' : 'Enable'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (notifications || []).length === 0 ? (
          <div className="card text-center py-16">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(notifications || []).map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.read && markOneMutation.mutate(n.id)}
                className={`card cursor-pointer transition-all hover:shadow-md ${!n.read ? 'border-primary-200 bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(n.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
