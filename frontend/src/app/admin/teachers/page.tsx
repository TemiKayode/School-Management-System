'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, Users, BookOpen, Clock, GraduationCap, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Teacher {
  id: string;
  employeeNo: string;
  department?: string;
  qualification?: string;
  user?: { name: string; email: string; phone?: string; avatar?: string; createdAt: string };
  subjects?: { id: string; name: string }[];
  classes?: { id: string; name: string; grade: string; _count?: { students: number } }[];
  timetable?: { id: string; dayOfWeek: string; startTime: string; endTime: string; subject?: { name: string }; class?: { name: string } }[];
  _count?: { classes: number; timetable: number };
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const [open, setOpen] = useState(false);
  const name = teacher.user?.name ?? 'Unknown';
  const slotCount = teacher._count?.timetable ?? 0;
  const classCount = teacher._count?.classes ?? 0;
  const hasFull = slotCount >= 5;

  return (
    <div className="card transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700 flex-shrink-0">
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{name}</h3>
              <p className="text-xs text-gray-500">{teacher.user?.email}</p>
              {teacher.department && <p className="text-xs text-primary-600 mt-0.5">{teacher.department}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${hasFull ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {hasFull ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {hasFull ? 'Active' : 'Partial'}
              </span>
              <button onClick={() => setOpen(o => !o)} className="p-1 rounded-lg hover:bg-gray-100">
                {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{classCount} {classCount === 1 ? 'class' : 'classes'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slotCount} slots/wk</span>
            {(teacher.subjects?.length ?? 0) > 0 && (
              <div className="flex gap-1 flex-wrap">
                {teacher.subjects!.map(s => <span key={s.id} className="badge badge-blue">{s.name}</span>)}
              </div>
            )}
          </div>

          {open && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {/* Classes */}
              {(teacher.classes?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Classes</p>
                  <div className="flex flex-wrap gap-2">
                    {teacher.classes!.map(c => (
                      <div key={c.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-lg">
                        <GraduationCap className="w-3 h-3" />
                        {c.name} · {c._count?.students ?? 0} students
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Timetable mini-grid */}
              {(teacher.timetable?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weekly Schedule</p>
                  <div className="grid grid-cols-5 gap-1">
                    {DAYS.map(day => {
                      const daySlots = teacher.timetable!.filter(s => s.dayOfWeek === day);
                      return (
                        <div key={day} className="min-h-[40px]">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">{day.slice(0, 3)}</p>
                          {daySlots.length === 0
                            ? <div className="h-6 rounded bg-gray-50" />
                            : daySlots.map(s => (
                              <div key={s.id} className="text-[10px] bg-primary-50 text-primary-700 rounded px-1 py-0.5 mb-0.5 truncate">
                                {s.startTime} {s.subject?.name}
                              </div>
                            ))
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {teacher.employeeNo && <p className="text-xs text-gray-400">Employee No: {teacher.employeeNo}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', employeeNo: '', department: '', qualification: '' };

export default function TeachersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get('/teachers').then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['teachers-stats'],
    queryFn: () => api.get('/teachers/stats').then(r => r.data.data).catch(() => null),
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/teachers', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); qc.invalidateQueries({ queryKey: ['teachers-stats'] }); setShowAdd(false); setForm(EMPTY_FORM); },
    onError: (err: any) => { const msg = err?.response?.data?.message || 'Failed to add teacher'; toast.error(msg); },
  });

  const teachers: Teacher[] = (data || []).filter((t: Teacher) => {
    const q = search.toLowerCase();
    return !q || t.user?.name?.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q) || t.user?.email?.toLowerCase().includes(q);
  });

  const withClasses = teachers.filter(t => (t._count?.classes ?? 0) > 0).length;
  const withFullTimetable = teachers.filter(t => (t._count?.timetable ?? 0) >= 5).length;
  const freeTeachers = teachers.filter(t => (t._count?.classes ?? 0) === 0).length;

  return (
    <DashboardLayout
      title="Teachers"
      subtitle={`${teachers.length} staff members`}
      allowedRoles={['ADMIN']}
      actions={
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: teachers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'With Classes', value: withClasses, icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Full Timetable', value: withFullTimetable, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Free / Unassigned', value: freeTeachers, icon: AlertCircle, color: freeTeachers > 0 ? 'text-amber-600' : 'text-gray-400', bg: freeTeachers > 0 ? 'bg-amber-50' : 'bg-gray-50' },
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

        {/* Timetable coverage bar */}
        {teachers.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-gray-700 mb-3">Timetable Coverage</p>
            <div className="space-y-2">
              {teachers.map(t => {
                const slots = t._count?.timetable ?? 0;
                const pct = Math.min(100, (slots / 10) * 100);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-600 truncate">{t.user?.name}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 50 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{slots} slots/wk</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <input className="input max-w-sm" placeholder="Search by name, department, email…" value={search} onChange={e => setSearch(e.target.value)} />

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : teachers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No teachers found</p>
            <p className="empty-state-desc">Add your first teacher to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {teachers.map(t => <TeacherCard key={t.id} teacher={t} />)}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Add Teacher</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="jane@school.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="Default: Teacher@123" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Employee No.</label>
                  <input className="input" placeholder="T002" value={form.employeeNo} onChange={e => setForm(f => ({ ...f, employeeNo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" placeholder="Mathematics" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Qualification</label>
                <input className="input" placeholder="B.Ed Mathematics" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.name || !form.email || create.isPending}
                onClick={() => create.mutate(form)}
              >
                {create.isPending ? 'Adding…' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
