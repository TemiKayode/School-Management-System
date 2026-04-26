'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarDays,
  ClipboardList, DollarSign, Library, Bus, Bell, MessageSquare,
  BarChart3, Settings, LogOut, ChevronLeft, Megaphone,
  BookMarked, UserCheck, Layers, ChevronRight,
} from 'lucide-react';

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string | number;
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard, roles: ['ADMIN'] },
      { label: 'Dashboard',   href: '/teacher/dashboard', icon: LayoutDashboard, roles: ['TEACHER'] },
      { label: 'Dashboard',   href: '/student/dashboard', icon: LayoutDashboard, roles: ['STUDENT'] },
      { label: 'Dashboard',   href: '/parent/dashboard',  icon: LayoutDashboard, roles: ['PARENT'] },
      { label: 'Analytics',   href: '/admin/reports',     icon: BarChart3,       roles: ['ADMIN', 'TEACHER'] },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students',    href: '/admin/students',    icon: GraduationCap,   roles: ['ADMIN', 'TEACHER'] },
      { label: 'Teachers',    href: '/admin/teachers',    icon: Users,           roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Classes',     href: '/admin/classes',     icon: Layers,          roles: ['ADMIN', 'TEACHER'] },
      { label: 'Timetable',   href: '/admin/timetable',   icon: CalendarDays,    roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Attendance',  href: '/admin/attendance',  icon: UserCheck,       roles: ['ADMIN', 'TEACHER'] },
      { label: 'Exams',       href: '/admin/exams',       icon: ClipboardList,   roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Assignments', href: '/admin/assignments', icon: BookMarked,      roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Fees',        href: '/admin/fees',        icon: DollarSign,      roles: ['ADMIN', 'STUDENT'] },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Library',     href: '/admin/library',     icon: Library,         roles: ['ADMIN', 'STUDENT'] },
      { label: 'Transport',   href: '/admin/transport',   icon: Bus,             roles: ['ADMIN'] },
      { label: 'E-Learning',  href: '/elearning',         icon: BookOpen,        roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', href: '/announcements',  icon: Megaphone,       roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
      { label: 'Messages',    href: '/messages',          icon: MessageSquare,   roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
      { label: 'Notifications', href: '/notifications',  icon: Bell,            roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings',    href: '/settings',          icon: Settings,        roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    ],
  },
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:   { label: 'Administrator', color: 'text-violet-700', bg: 'bg-violet-50' },
  TEACHER: { label: 'Teacher',       color: 'text-blue-700',   bg: 'bg-blue-50'   },
  STUDENT: { label: 'Student',       color: 'text-green-700',  bg: 'bg-green-50'  },
  PARENT:  { label: 'Parent',        color: 'text-orange-700', bg: 'bg-orange-50' },
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || '';
  const roleMeta = ROLE_META[role] || { label: role, color: 'text-gray-600', bg: 'bg-gray-100' };

  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter((item, idx, arr) => {
        if (!user || !item.roles.includes(role)) return false;
        return arr.findIndex(i => i.label === item.label) === idx;
      }),
    }))
    .filter(g => g.items.length > 0);

  // Deduplicate Dashboard across groups
  const seenLabels = new Set<string>();
  const dedupedGroups = visibleGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (seenLabels.has(item.label)) return false;
      seenLabels.add(item.label);
      return true;
    }),
  })).filter(g => g.items.length > 0);

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
      style={{ minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-slate-100 h-16 flex-shrink-0 overflow-hidden', collapsed ? 'px-4 justify-center' : 'px-5 gap-3')}>
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 leading-tight">SchoolMS</p>
            <p className="text-2xs text-slate-400 font-medium">Management System</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors z-20"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-slate-500" />
          : <ChevronLeft className="w-3 h-3 text-slate-500" />
        }
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
        {dedupedGroups.map((group) => (
          <div key={group.title} className="mb-1">
            {!collapsed && (
              <p className="px-3 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-widest">
                {group.title}
              </p>
            )}
            {collapsed && group.title !== dedupedGroups[0].title && (
              <div className="mx-3 my-1 border-t border-slate-100" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60',
                      collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5 gap-3',
                      active
                        ? 'bg-gradient-to-r from-primary-50 to-violet-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    )}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-500" />
                    )}
                    <Icon className={cn('flex-shrink-0 transition-colors', collapsed ? 'w-5 h-5' : 'w-4.5 h-4.5', active ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600')} style={{ width: collapsed ? 20 : 18, height: collapsed ? 20 : 18 }} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-2xs font-bold flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-slate-100 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button onClick={clearAuth} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <span className={cn('text-2xs font-semibold px-1.5 py-0.5 rounded-full', roleMeta.bg, roleMeta.color)}>
                  {roleMeta.label}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </div>
            <button
              onClick={clearAuth}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
