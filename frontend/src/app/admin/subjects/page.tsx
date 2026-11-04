'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
}

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('1');

  const { data, isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/subjects', { name, code, credits: Number(credits) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setName('');
      setCode('');
      setCredits('1');
      setShowAdd(false);
    },
  });

  return (
    <DashboardLayout
      title="Subjects"
      subtitle={`${(data || []).length} subjects`}
      allowedRoles={['ADMIN']}
      actions={<button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New Subject</button>}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (data || []).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BookOpen className="w-6 h-6 text-gray-400" /></div>
          <p className="empty-state-title">No subjects yet</p>
          <p className="empty-state-desc">Add a subject to use it in assignments and exams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data || []).map(subject => (
            <div key={subject.id} className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary-600" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                <p className="text-sm text-gray-500">{subject.code} · {subject.credits} credit{subject.credits === 1 ? '' : 's'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Subject</h2>
            <div className="space-y-4">
              <div><label className="label">Subject Name</label><input className="input" placeholder="e.g. Mathematics" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><label className="label">Subject Code</label><input className="input" placeholder="e.g. MATH-7" value={code} onChange={e => setCode(e.target.value)} /></div>
              <div><label className="label">Credits</label><input className="input" type="number" min="1" step="1" value={credits} onChange={e => setCredits(e.target.value)} /></div>
              {create.isError && <p className="text-sm text-red-600">Couldn’t save the subject. Check that its code is unique and try again.</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); create.reset(); }}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!name.trim() || !code.trim() || !credits || Number(credits) < 1 || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? 'Saving…' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
