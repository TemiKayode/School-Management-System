'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, Settings, LogOut, ChevronRight, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

// Breadcrumb auto-generator from pathname
function Breadcrumbs({ title }: { title: string }) {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return <h1 className="text-xl font-bold text-gray-900">{title}</h1>;
  return (
    <div className="flex items-center gap-1.5">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const label = isLast ? title : part.charAt(0).toUpperCase() + part.slice(1);
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
            {isLast
              ? <span className="text-sm font-semibold text-gray-900">{label}</span>
              : <span className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer capitalize">{label}</span>
            }
          </div>
        );
      })}
    </div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsAPI.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = (notifications as any[]).filter((n: any) => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-card-lg border border-gray-100 overflow-hidden animate-slide-down z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
          {unread > 0 && (
            <span className="badge badge-indigo text-2xs">{unread} new</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={() => markAllMutation.mutate()}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto scrollbar-hide divide-y divide-gray-50">
        {(notifications as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">All caught up!</p>
          </div>
        ) : (notifications as any[]).slice(0, 8).map((n: any) => (
          <button key={n.id} onClick={() => !n.read && markOneMutation.mutate(n.id)}
            className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors', !n.read && 'bg-primary-50/40')}>
            <div className="flex items-start gap-3">
              <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', n.read ? 'bg-gray-200' : 'bg-primary-500')} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate', n.read ? 'text-gray-600' : 'text-gray-900')}>{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>
                <p className="text-2xs text-gray-300 mt-1">{formatDate(n.createdAt, { dateStyle: 'medium', timeStyle: 'short' } as any)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-slate-50/50">
        <Link href="/notifications" onClick={onClose}
          className="flex items-center justify-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
          View all notifications <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const roleMeta: Record<string, { color: string; bg: string }> = {
    ADMIN:   { color: 'text-violet-700', bg: 'bg-violet-50' },
    TEACHER: { color: 'text-blue-700',   bg: 'bg-blue-50'   },
    STUDENT: { color: 'text-green-700',  bg: 'bg-green-50'  },
    PARENT:  { color: 'text-orange-700', bg: 'bg-orange-50' },
  };
  const meta = roleMeta[user?.role || ''] || { color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-card-lg border border-gray-100 overflow-hidden animate-slide-down z-50">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-base font-bold text-primary-700">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <span className={cn('mt-2 inline-block text-2xs font-semibold px-2 py-0.5 rounded-full', meta.bg, meta.color)}>
          {user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="py-1.5">
        <Link href="/settings" onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Settings className="w-4 h-4 text-gray-400" /> Settings
        </Link>
        <button onClick={() => { clearAuth(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [search, setSearch] = useState('');
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then(r => r.data.data),
    refetchInterval: 30000,
  });
  const unreadCount = (notifications as any[]).filter((n: any) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 z-10 border-b border-white/70 bg-white/70 backdrop-blur-md">
      {/* Left: breadcrumb */}
      <Breadcrumbs title={title} />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search anything…"
            className="pl-8 pr-4 py-2 text-sm border border-white/60 rounded-xl bg-white/80 text-gray-700 placeholder:text-gray-400 shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 focus:bg-white
                       transition-all duration-150 w-56 focus:w-72"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Notification bell */}
        <div ref={notifsRef} className="relative">
          <button
            onClick={() => { setShowNotifs(v => !v); setShowUser(false); }}
            className={cn(
              'relative p-2.5 rounded-xl transition-colors',
              showNotifs ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200/70' : 'text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm'
            )}
          >
            <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200/70 mx-1" />

        {/* User avatar */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setShowUser(v => !v); setShowNotifs(false); }}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors',
              showUser ? 'bg-primary-50 ring-1 ring-primary-200/70' : 'hover:bg-white hover:shadow-sm'
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{user?.name?.split(' ')[0]}</p>
              <p className="text-2xs text-gray-400 leading-tight capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <ChevronRight className={cn('w-3.5 h-3.5 text-gray-400 transition-transform hidden md:block', showUser && 'rotate-90')} />
          </button>
          {showUser && <UserMenu onClose={() => setShowUser(false)} />}
        </div>
      </div>
    </header>
  );
}
