'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { BookOpen, Users, ClipboardList, CheckCircle, TrendingUp, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Class {
  id: string;
  name: string;
  grade: string;
  _count?: { students: number };
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  subject?: { name: string };
  _count?: { submissions: number };
}

interface TimetableSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject?: { name: string };
  class?: { name: string };
}

function greetingFor(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${name?.split(' ')[0]}`;
}

function todayName() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function TeacherDashboard() {
  const { user } = useAuthStore();

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => api.get('/classes/my').then(r => r.data.data).catch(() => []),
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/assignments').then(r => r.data.data).catch(() => []),
  });

  const { data: timetable } = useQuery({
    queryKey: ['timetable-my'],
    queryFn: () => api.get('/timetable/my').then(r => r.data.data).catch(() => []),
  });

  const { data: stats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/dashboard/teacher').then(r => r.data.data).catch(() => ({})),
  });

  const today = todayName().toUpperCase();
  const now = new Date().getHours() * 60 + new Date().getMinutes();

  const todaySlots: TimetableSlot[] = (timetable || [])
    .filter((s: TimetableSlot) => s.dayOfWeek === today)
    .sort((a: TimetableSlot, b: TimetableSlot) => timeToMins(a.startTime) - timeToMins(b.startTime));

  const currentSlot = todaySlots.find((s: TimetableSlot) => timeToMins(s.startTime) <= now && timeToMins(s.endTime) > now);
  const nextSlot = todaySlots.find((s: TimetableSlot) => timeToMins(s.startTime) > now);

  const pendingAssignments = (assignments || []).filter((a: Assignment) => new Date(a.dueDate).getTime() >= Date.now());
  const overdueAssignments = (assignments || []).filter((a: Assignment) => new Date(a.dueDate).getTime() < Date.now());

  const totalStudents = (classes || []).reduce((s: number, c: Class) => s + (c._count?.students ?? 0), 0);

  return (
    <DashboardLayout
      title="Teacher Dashboard"
      subtitle={`${todayName()} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
      allowedRoles={['TEACHER']}
    >
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-violet-700 p-6 text-white">
          <div className="relative z-10">
            <p className="text-white/70 text-sm font-medium">{greetingFor(user?.name || 'Teacher')}</p>
            <h2 className="text-2xl font-bold mt-1">Ready to inspire today?</h2>
            <div className="flex items-center gap-4 mt-4">
              {currentSlot ? (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium">Now: {currentSlot.subject?.name} · {currentSlot.class?.name}</span>
                </div>
              ) : nextSlot ? (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm">Next: {nextSlot.subject?.name} at {nextSlot.startTime}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-sm">No more classes today</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'My Classes', value: (classes || []).length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Active Assignments', value: pendingAssignments.length, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Overdue', value: overdueAssignments.length, icon: AlertTriangle, color: overdueAssignments.length > 0 ? 'text-red-600' : 'text-gray-400', bg: overdueAssignments.length > 0 ? 'bg-red-50' : 'bg-gray-50' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="card xl:col-span-1">
            <div className="section-header">
              <h3 className="section-title">Today's Schedule</h3>
              <Link href="/admin/timetable" className="section-action">View all <ChevronRight className="w-3 h-3" /></Link>
            </div>
            {todaySlots.length === 0 ? (
              <div className="empty-state py-8">
                <p className="empty-state-title">No classes today</p>
                <p className="empty-state-desc">Enjoy your free day!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot, i) => {
                  const isPast = timeToMins(slot.endTime) < now;
                  const isCurrent = slot === currentSlot;
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? 'bg-primary-50 ring-1 ring-primary-200' : isPast ? 'opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="text-right w-12 flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">{slot.startTime}</p>
                        <p className="text-2xs text-gray-400">{slot.endTime}</p>
                      </div>
                      <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${isCurrent ? 'bg-primary-500' : 'bg-gray-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{slot.subject?.name}</p>
                        <p className="text-xs text-gray-500">{slot.class?.name}</p>
                      </div>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Classes */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">My Classes</h3>
              <Link href="/admin/classes" className="section-action">All <ChevronRight className="w-3 h-3" /></Link>
            </div>
            {classesLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : (classes || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No classes assigned yet</p>
            ) : (
              <div className="space-y-2">
                {(classes || []).slice(0, 5).map((cls: Class) => (
                  <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                      {cls.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                      <p className="text-xs text-gray-500">Grade {cls.grade} · {cls._count?.students ?? 0} students</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Assignments</h3>
              <Link href="/admin/assignments" className="section-action">All <ChevronRight className="w-3 h-3" /></Link>
            </div>
            {assignmentsLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
            ) : (assignments || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No assignments yet</p>
            ) : (
              <div className="space-y-2">
                {(assignments || []).slice(0, 5).map((a: Assignment) => {
                  const overdue = new Date(a.dueDate).getTime() < Date.now();
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                        <p className="text-xs text-gray-500">{a.subject?.name} · Due {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <span className="text-xs text-gray-400">{a._count?.submissions ?? 0} submitted</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
