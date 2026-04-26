'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, BookMarked, Clock, CheckCircle2, AlertCircle, FileText, Users, X, ChevronRight, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  totalPoints?: number;
  subject?: { name: string };
  class?: { name: string; _count?: { students: number } };
  createdBy?: { name: string };
  _count?: { submissions: number };
}

interface Submission {
  id: string;
  studentId: string;
  content?: string;
  score?: number;
  feedback?: string;
  student: { id: string; admissionNo: string; user?: { name: string; avatar?: string } };
}

interface SubmissionsData {
  submitted: Submission[];
  pending: { studentId: string; studentName?: string; admissionNo: string; status: string }[];
  totalStudents: number;
  submittedCount: number;
  pendingCount: number;
}

function urgency(dueDate: string) {
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return { label: 'Overdue', cls: 'badge-red' };
  if (days < 2) return { label: 'Due Soon', cls: 'badge-yellow' };
  return { label: `${Math.ceil(days)}d left`, cls: 'badge-green' };
}

function SubmissionsPanel({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SubmissionsData>({
    queryKey: ['submissions', assignment.id],
    queryFn: () => api.get(`/assignments/${assignment.id}/submissions`).then(r => r.data.data),
  });

  const grade = useMutation({
    mutationFn: ({ subId, score, feedback }: { subId: string; score: number; feedback: string }) =>
      api.put(`/assignments/${assignment.id}/submissions/${subId}/grade`, { score, feedback }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions', assignment.id] }); setGradingId(null); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-gray-900">{assignment.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{assignment.class?.name} · {assignment.subject?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : data ? (
            <>
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Submission Progress</span>
                  <span className="text-gray-500">{data.submittedCount}/{data.totalStudents}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: data.totalStudents ? `${(data.submittedCount / data.totalStudents) * 100}%` : '0%' }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">{data.submittedCount} submitted</span>
                  <span className="text-amber-600 font-medium">{data.pendingCount} pending</span>
                </div>
              </div>

              {/* Submitted */}
              {data.submitted.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Submitted</p>
                  <div className="space-y-2">
                    {data.submitted.map(sub => (
                      <div key={sub.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-xs font-bold text-green-700">
                              {sub.student.user?.name?.[0] ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sub.student.user?.name}</p>
                              <p className="text-xs text-gray-400">{sub.student.admissionNo}</p>
                            </div>
                          </div>
                          {sub.score != null ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                              <Star className="w-3 h-3" />{sub.score}/{assignment.totalPoints ?? 100}
                            </span>
                          ) : (
                            <button
                              onClick={() => { setGradingId(sub.id); setGradeForm({ score: '', feedback: '' }); }}
                              className="text-xs text-primary-600 hover:underline font-medium"
                            >
                              Grade
                            </button>
                          )}
                        </div>
                        {sub.content && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{sub.content}</p>}
                        {sub.feedback && <p className="text-xs text-green-600 mt-1 italic">&quot;{sub.feedback}&quot;</p>}

                        {gradingId === sub.id && (
                          <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
                            <div className="flex gap-2">
                              <input
                                className="input flex-1 text-sm py-1.5"
                                type="number"
                                placeholder={`Score (/${assignment.totalPoints ?? 100})`}
                                value={gradeForm.score}
                                onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))}
                              />
                            </div>
                            <input
                              className="input text-sm py-1.5"
                              placeholder="Feedback (optional)"
                              value={gradeForm.feedback}
                              onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <button className="btn-secondary text-xs py-1.5 flex-1" onClick={() => setGradingId(null)}>Cancel</button>
                              <button
                                className="btn-primary text-xs py-1.5 flex-1"
                                disabled={!gradeForm.score || grade.isPending}
                                onClick={() => grade.mutate({ subId: sub.id, score: Number(gradeForm.score), feedback: gradeForm.feedback })}
                              >
                                {grade.isPending ? 'Saving…' : 'Save Grade'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {data.pending.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Not Submitted</p>
                  <div className="space-y-2">
                    {data.pending.map(p => (
                      <div key={p.studentId} className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-amber-200 bg-amber-50/50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                          {p.studentName?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.studentName}</p>
                          <p className="text-xs text-gray-400">{p.admissionNo}</p>
                        </div>
                        <span className="ml-auto text-xs text-amber-600 font-medium">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssignmentCard({ a, role, onViewSubmissions }: { a: Assignment; role: string; onViewSubmissions: () => void }) {
  const u = urgency(a.dueDate);
  const total = a.class?._count?.students ?? 0;
  const submitted = a._count?.submissions ?? 0;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {a.subject?.name && <span className="font-medium text-primary-600">{a.subject.name}</span>}
              {a.class?.name && <> · {a.class.name}</>}
              {a.createdBy?.name && <> · {a.createdBy.name}</>}
            </p>
          </div>
        </div>
        <span className={`badge ${u.cls} flex-shrink-0`}>{u.label}</span>
      </div>

      {a.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{a.description}</p>}

      {(role === 'TEACHER' || role === 'ADMIN') && total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{submitted}/{total} submitted</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {(role === 'TEACHER' || role === 'ADMIN') && (
          <button onClick={onViewSubmissions} className="flex items-center gap-1 text-primary-600 hover:underline font-medium">
            View submissions <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: '', description: '', dueDate: '', subjectId: '', classId: '', totalPoints: '100' };

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/assignments').then(r => r.data.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data.data).catch(() => []),
    enabled: role === 'TEACHER' || role === 'ADMIN',
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data).catch(() => []),
    enabled: role === 'TEACHER' || role === 'ADMIN',
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/assignments', { ...body, totalPoints: Number(body.totalPoints) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setShowAdd(false); setForm(EMPTY_FORM); },
  });

  const now = Date.now();
  const allData: Assignment[] = data || [];
  const assignments = allData.filter(a => {
    if (filter === 'active') return new Date(a.dueDate).getTime() >= now;
    if (filter === 'overdue') return new Date(a.dueDate).getTime() < now;
    return true;
  });

  const counts = {
    all: allData.length,
    active: allData.filter(a => new Date(a.dueDate).getTime() >= now).length,
    overdue: allData.filter(a => new Date(a.dueDate).getTime() < now).length,
  };

  const totalSubmissions = allData.reduce((s, a) => s + (a._count?.submissions ?? 0), 0);

  return (
    <>
    <DashboardLayout
      title="Assignments"
      subtitle={`${counts.active} active · ${counts.overdue} overdue`}
      allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}
      actions={
        (role === 'TEACHER' || role === 'ADMIN') ? (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        {(role === 'TEACHER' || role === 'ADMIN') && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Assignments', value: counts.all, icon: BookMarked, color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: 'Active', value: counts.active, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Submissions', value: totalSubmissions, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
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
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(['all', 'active', 'overdue'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BookMarked className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No assignments</p>
            <p className="empty-state-desc">{filter === 'overdue' ? 'No overdue assignments — great!' : 'Create an assignment to get started.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignments.map(a => (
              <AssignmentCard key={a.id} a={a} role={role} onViewSubmissions={() => setSelectedAssignment(a)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>

    {/* Submissions side panel */}
    {selectedAssignment && (
      <SubmissionsPanel assignment={selectedAssignment} onClose={() => setSelectedAssignment(null)} />
    )}

    {/* Create modal */}
    {showAdd && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Assignment</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input className="input" placeholder="Assignment title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="Instructions for students…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Subject</label>
                <select className="select" value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">Select…</option>
                  {(subjects || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select className="select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">Select…</option>
                  {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Due Date</label>
                <input className="input" type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Total Points</label>
                <input className="input" type="number" min="1" value={form.totalPoints} onChange={e => setForm(f => ({ ...f, totalPoints: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Cancel</button>
            <button
              className="btn-primary flex-1"
              disabled={!form.title || !form.dueDate || !form.classId || create.isPending}
              onClick={() => create.mutate(form)}
            >
              {create.isPending ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
