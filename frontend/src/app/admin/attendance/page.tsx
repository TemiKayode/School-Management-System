'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { attendanceAPI, classesAPI, api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Check, X, Clock, AlertCircle, Save, Users } from 'lucide-react';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, { label: string; short: string; ring: string; dot: string; text: string }> = {
  PRESENT: { label: 'Present', short: 'P', ring: 'ring-green-400 bg-green-50', dot: 'bg-green-500', text: 'text-green-700' },
  ABSENT:  { label: 'Absent',  short: 'A', ring: 'ring-red-400 bg-red-50',   dot: 'bg-red-500',   text: 'text-red-700'   },
  LATE:    { label: 'Late',    short: 'L', ring: 'ring-yellow-400 bg-yellow-50', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  EXCUSED: { label: 'Excused', short: 'E', ring: 'ring-blue-400 bg-blue-50', dot: 'bg-blue-500',  text: 'text-blue-700'  },
};

function cycle(current: Status): Status {
  return STATUSES[(STATUSES.indexOf(current) + 1) % STATUSES.length];
}

export default function AttendancePage() {
  const { accessToken } = useAuthStore();
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const queryClient = useQueryClient();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.list().then(r => r.data.data),
  });

  const { data: students = [] as any[], isFetching: loadingStudents } = useQuery<any[]>({
    queryKey: ['class-students', selectedClass],
    queryFn: () => api.get(`/classes/${selectedClass}/students`).then(r => r.data.data),
    enabled: !!selectedClass,
    onSuccess: (data: any[]) => {
      const map: Record<string, Status> = {};
      data.forEach((s: any) => { map[s.id] = 'PRESENT'; });
      setStatusMap(map);
    },
  } as any);

  const markMutation = useMutation({
    mutationFn: () =>
      attendanceAPI.markBulk({
        classId: selectedClass, date,
        records: students.map((s: any) => ({ studentId: s.id, status: statusMap[s.id] || 'PRESENT' })),
      }),
    onSuccess: () => { toast.success('Attendance saved'); queryClient.invalidateQueries({ queryKey: ['attendance'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const markAll = (s: Status) => {
    const m: Record<string, Status> = {};
    students.forEach((st: any) => { m[st.id] = s; });
    setStatusMap(m);
  };

  const counts = students.reduce((acc: Record<Status, number>, s: any) => {
    const st = statusMap[s.id] || 'PRESENT';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 });

  return (
    <DashboardLayout title="Attendance" allowedRoles={['ADMIN', 'TEACHER']}>
      <div className="space-y-5">
        {/* Controls */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label">Class</label>
              <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setStatusMap({}); }} className="input w-52">
                <option value="">Select class…</option>
                {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            </div>
            {students.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => markAll(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${STATUS_STYLE[s].ring} ring-1`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[s].dot}`} />
                    <span className={STATUS_STYLE[s].text}>All {STATUS_STYLE[s].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary strip */}
        {students.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {STATUSES.map(s => (
              <div key={s} className={`rounded-xl p-3 text-center ring-1 ${STATUS_STYLE[s].ring}`}>
                <p className={`text-2xl font-bold tabular-nums ${STATUS_STYLE[s].text}`}>{counts[s]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{STATUS_STYLE[s].label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Student grid */}
        {selectedClass ? (
          loadingStudents ? (
            <div className="card animate-pulse space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">No students in this class</p>
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">
                  {students.length} students · <span className="text-gray-400 text-xs">tap a student to cycle status</span>
                </p>
                <button onClick={() => markMutation.mutate()} disabled={markMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm py-2">
                  <Save className="w-4 h-4" />
                  {markMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
              <div className="divide-y">
                {students.map((student: any, i: number) => {
                  const status: Status = statusMap[student.id] || 'PRESENT';
                  const style = STATUS_STYLE[status];
                  return (
                    <button
                      key={student.id}
                      onClick={() => setStatusMap(prev => ({ ...prev, [student.id]: cycle(status) }))}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                    >
                      <span className="text-sm text-gray-300 w-5 tabular-nums">{i + 1}</span>
                      <div className={`w-9 h-9 rounded-full ring-2 ${style.ring} flex items-center justify-center flex-shrink-0 font-bold text-sm ${style.text} transition-all`}>
                        {student.user?.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{student.user?.name}</p>
                        <p className="text-xs text-gray-400">{student.admissionNo}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ring-1 ${style.ring} transition-all`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-300 group-hover:text-gray-400 transition-colors hidden sm:block">
                        tap to change →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div className="card text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Select a class to mark attendance</p>
            <p className="text-gray-400 text-sm mt-1">Choose a class and date above to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
