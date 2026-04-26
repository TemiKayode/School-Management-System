'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { studentsAPI, classesAPI } from '@/lib/api';
import { Plus, Edit, Trash2, Eye, UserCheck, UserX, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

type Student = {
  id: string;
  admissionNo: string;
  enrolledAt: string;
  parentName?: string;
  gender?: string;
  user?: { name?: string; email?: string };
  class?: { name?: string };
  feePayments?: { status: string }[];
};

const EMPTY_FORM = { name: '', email: '', password: '', admissionNo: '', classId: '', parentName: '', parentPhone: '' };

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentsAPI.list({ limit: 500 }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students-all'] }); toast.success('Student removed'); },
    onError: () => toast.error('Failed to delete'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => studentsAPI.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-all'] });
      toast.success('Student added');
      setShowAdd(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add student'),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.list().then(r => r.data.data?.data ?? r.data.data ?? []),
  });

  const students: Student[] = data?.data || [];

  const columns = useMemo<ColumnDef<Student, any>[]>(() => [
    {
      accessorFn: row => row.user?.name,
      id: 'name',
      header: 'Student',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {row.original.user?.name?.[0] || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.original.user?.name || '—'}</p>
            <p className="text-xs text-gray-400">{row.original.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'admissionNo',
      header: 'Admission No.',
      cell: ({ getValue }) => <span className="font-mono text-sm text-gray-600">{getValue()}</span>,
    },
    {
      accessorFn: row => row.class?.name,
      id: 'class',
      header: 'Class',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? <span className="badge badge-blue text-xs">{v}</span> : <span className="text-gray-300 text-sm">—</span>;
      },
    },
    {
      accessorKey: 'parentName',
      header: 'Parent / Guardian',
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'enrolledAt',
      header: 'Enrolled',
      cell: ({ getValue }) => <span className="text-sm text-gray-500">{formatDate(getValue() as string)}</span>,
    },
    {
      id: 'feeStatus',
      header: 'Fee Status',
      enableSorting: false,
      cell: ({ row }) => {
        const payments = row.original.feePayments ?? [];
        const hasPending = payments.some(p => p.status === 'PENDING');
        const hasPaid    = payments.some(p => p.status === 'PAID');
        if (payments.length === 0) return <span className="text-xs text-gray-300 font-medium">Not Applied</span>;
        if (hasPending) return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      },
    },
    {
      id: 'registration',
      header: 'Registration',
      enableSorting: false,
      cell: ({ row }) => {
        const enrolled = !!row.original.enrolledAt;
        const hasClass = !!row.original.class?.name;
        if (!enrolled) return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        );
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <CheckCircle className="w-3 h-3" /> {hasClass ? 'Approved' : 'Enrolled'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5 justify-end">
          <button title="View" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button
            title="Delete"
            onClick={() => { if (confirm(`Remove ${row.original.user?.name}?`)) deleteMutation.mutate(row.original.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [deleteMutation]);

  const active = students.length;
  const classes = [...new Set(students.map(s => s.class?.name).filter(Boolean))].length;

  return (
    <>
    <DashboardLayout title="Students" allowedRoles={['ADMIN', 'TEACHER']}>
      <div className="space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Students', value: active, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Classes',        value: classes, icon: UserX, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'New This Month', value: students.filter(s => {
              const d = new Date(s.enrolledAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length, icon: Edit, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card flex items-center gap-4 !py-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* DataTable */}
        <div className="card">
          <DataTable
            data={students}
            columns={columns}
            searchPlaceholder="Search by name, email, class…"
            pageSize={15}
            isLoading={isLoading}
            toolbar={
              <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> Add Student
              </button>
            }
          />
        </div>
      </div>
    </DashboardLayout>

    {showAdd && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Student</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="john@school.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Temporary password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="label">Admission No.</label>
                <input className="input" placeholder="S2024001" value={form.admissionNo} onChange={e => setForm(f => ({ ...f, admissionNo: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Class</label>
              <select className="select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">Select class…</option>
                {(classesData || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Parent / Guardian Name</label>
                <input className="input" placeholder="Parent name" value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Parent Phone</label>
                <input className="input" placeholder="+1 555 000 0000" value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Cancel</button>
            <button
              className="btn-primary flex-1"
              disabled={!form.name || !form.email || !form.password || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? 'Adding…' : 'Add Student'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
