'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, Users, BookOpen, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  grade: string;
  section?: string;
  teacher?: { id: string; user?: { name: string } };
  _count?: { students: number; timetables: number };
  subjects?: { name: string }[];
}

function ClassCard({ cls }: { cls: Class }) {
  const [open, setOpen] = useState(false);

  const colors = ['bg-blue-50 text-blue-700', 'bg-violet-50 text-violet-700', 'bg-green-50 text-green-700', 'bg-orange-50 text-orange-700', 'bg-rose-50 text-rose-700'];
  const color = colors[(cls.name?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div className="card transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${color}`}>
          {cls.name?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Grade {cls.grade}{cls.section ? ` · Section ${cls.section}` : ''}</p>
            </div>
            <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {cls._count?.students ?? 0} students
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              {cls._count?.timetables ?? 0} periods/wk
            </div>
            {cls.teacher && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 ml-auto">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-2xs font-bold text-primary-700">
                  {cls.teacher.user?.name?.[0] ?? '?'}
                </div>
                <span className="truncate max-w-[100px]">{cls.teacher.user?.name}</span>
              </div>
            )}
          </div>

          {open && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-slide-down">
              {cls.subjects && cls.subjects.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.subjects.map(s => (
                      <span key={s.name} className="badge badge-blue">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', grade: '', section: '', teacherId: '', academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });

  const { data, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get('/teachers').then(r => r.data.data).catch(() => []),
    enabled: showAdd,
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/classes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setShowAdd(false);
      setForm({ name: '', grade: '', section: '', teacherId: '', academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });
    },
  });

  const classes: Class[] = (data || []).filter((c: Class) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.grade.toLowerCase().includes(search.toLowerCase())
  );

  const byGrade = classes.reduce<Record<string, Class[]>>((acc, c) => {
    const key = `Grade ${c.grade}`;
    (acc[key] ||= []).push(c);
    return acc;
  }, {});

  return (
    <DashboardLayout
      title="Classes"
      subtitle={`${(data || []).length} classes across all grades`}
      allowedRoles={['ADMIN', 'TEACHER']}
      actions={
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> New Class
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Classes', value: (data || []).length, icon: GraduationCap, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Total Students', value: (data || []).reduce((s: number, c: Class) => s + (c._count?.students ?? 0), 0), icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Grade Levels', value: Object.keys(byGrade).length, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
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

        {/* Search */}
        <input
          className="input max-w-sm"
          placeholder="Search classes or grades…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        ) : Object.keys(byGrade).length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><GraduationCap className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No classes found</p>
            <p className="empty-state-desc">Create your first class to get started.</p>
          </div>
        ) : (
          Object.entries(byGrade).sort(([a], [b]) => a.localeCompare(b)).map(([grade, gradeClasses]) => (
            <div key={grade}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{grade}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {gradeClasses.map(cls => <ClassCard key={cls.id} cls={cls} />)}
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Class</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Class Name</label>
                <input className="input" placeholder="e.g. Grade 10A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Grade</label>
                  <input className="input" placeholder="10" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Section</label>
                  <input className="input" placeholder="A" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Class Teacher</label>
                <select className="select" value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
                  <option value="">Assign later…</option>
                  {(teachersData || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.user?.name} {t.department ? `— ${t.department}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <input className="input" placeholder="2025-2026" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.name || !form.grade || create.isPending}
                onClick={() => create.mutate(form)}
              >
                {create.isPending ? 'Creating…' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
