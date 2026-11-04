'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, examsAPI } from '@/lib/api';
import { Plus, ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  title: '',
  description: '',
  subjectId: '',
  classId: '',
  examDate: '',
  duration: '60',
  totalMarks: '100',
  passMark: '50',
};

export default function ExamsPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const { data, isLoading } = useQuery({
    queryKey: ['exams', page],
    queryFn: () => examsAPI.list({ page, limit: 20 }).then(r => r.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data.data),
    enabled: showCreate && canCreate,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
    enabled: showCreate && canCreate,
  });

  const createExam = useMutation({
    mutationFn: () => examsAPI.create({
      ...form,
      examDate: new Date(form.examDate).toISOString(),
      duration: Number(form.duration),
      totalMarks: Number(form.totalMarks),
      passMark: Number(form.passMark),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      toast.success('Exam created');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Could not create the exam. Check the details and try again.'),
  });

  const exams = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <DashboardLayout title="Exams & Grading" allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{pagination?.total || 0} exams total</p>
            {canCreate && (
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Exam
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {exams.map((exam: any) => {
                const isPast = new Date(exam.examDate) < new Date();
                return (
                  <div key={exam.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary-600" />
                      </div>
                      <span className={`badge ${isPast ? 'badge-gray' : 'badge-green'}`}>
                        {isPast ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{exam.subject?.name} • {exam.class?.name}</p>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm text-gray-500">
                      <span>{formatDate(exam.examDate)}</span>
                      <span>{exam.duration} min • {exam.totalMarks} marks</span>
                    </div>
                  </div>
                );
              })}
              {!exams.length && (
                <div className="col-span-3 text-center py-12 text-gray-400">No exams scheduled</div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Exam</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Exam Title</label>
                <input className="input" placeholder="e.g. Grade 7 Mathematics Test" value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Notes about this exam" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Subject</label>
                  <select className="select" value={form.subjectId} onChange={e => setForm(v => ({ ...v, subjectId: e.target.value }))}>
                    <option value="">Select…</option>
                    {(subjects || []).map((subject: any) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="select" value={form.classId} onChange={e => setForm(v => ({ ...v, classId: e.target.value }))}>
                    <option value="">Select…</option>
                    {(classes || []).map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Exam Date and Time</label>
                  <input className="input" type="datetime-local" value={form.examDate} onChange={e => setForm(v => ({ ...v, examDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input className="input" type="number" min="1" value={form.duration} onChange={e => setForm(v => ({ ...v, duration: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Marks</label>
                  <input className="input" type="number" min="1" value={form.totalMarks} onChange={e => setForm(v => ({ ...v, totalMarks: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Pass Mark</label>
                  <input className="input" type="number" min="0" value={form.passMark} onChange={e => setForm(v => ({ ...v, passMark: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); createExam.reset(); }}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.title.trim() || !form.subjectId || !form.classId || !form.examDate || Number(form.duration) < 1 || Number(form.totalMarks) < 1 || Number(form.passMark) < 0 || createExam.isPending}
                onClick={() => createExam.mutate()}
              >
                {createExam.isPending ? 'Creating…' : 'Create Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
