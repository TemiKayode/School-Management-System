'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reportsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

type ReportTab = 'academic' | 'attendance' | 'financial';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('academic');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const academicQuery = useQuery({
    queryKey: ['report-academic'],
    queryFn: () => reportsAPI.academic().then(r => r.data.data),
    enabled: tab === 'academic',
  });

  const attendanceQuery = useQuery({
    queryKey: ['report-attendance', from, to],
    queryFn: () => reportsAPI.attendance({ from, to }).then(r => r.data.data),
    enabled: tab === 'attendance',
  });

  const financialQuery = useQuery({
    queryKey: ['report-financial', from, to],
    queryFn: () => reportsAPI.financial({ from, to }).then(r => r.data.data),
    enabled: tab === 'financial',
  });

  return (
    <DashboardLayout title="Analytics & Reports" allowedRoles={['ADMIN', 'TEACHER']}>
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { id: 'academic',   label: 'Academic',   icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'attendance', label: 'Attendance',  icon: <Users className="w-4 h-4" /> },
            { id: 'financial',  label: 'Financial',   icon: <DollarSign className="w-4 h-4" /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Date filters for attendance & financial */}
        {tab !== 'academic' && (
          <div className="card flex gap-4 flex-wrap">
            <div>
              <label className="label">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
            </div>
          </div>
        )}

        {/* Academic Report */}
        {tab === 'academic' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-icon bg-blue-50"><BarChart3 className="w-6 h-6 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{academicQuery.data?.total || 0}</p>
                <p className="text-sm text-gray-500">Total Results</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-green-50"><TrendingUp className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{academicQuery.data?.average || '0.00'}</p>
                <p className="text-sm text-gray-500">Average Score</p>
              </div>
            </div>
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Top Students</h4>
              <div className="space-y-2">
                {(academicQuery.data?.topStudents || []).slice(0, 3).map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <span className="flex-1 truncate">{r.student?.user?.name || '—'}</span>
                    <span className="font-semibold">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attendance Report */}
        {tab === 'attendance' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'PRESENT', label: 'Present', color: 'text-green-700', bg: 'bg-green-50' },
              { key: 'ABSENT',  label: 'Absent',  color: 'text-red-700',   bg: 'bg-red-50' },
              { key: 'LATE',    label: 'Late',    color: 'text-yellow-700', bg: 'bg-yellow-50' },
              { key: 'EXCUSED', label: 'Excused', color: 'text-blue-700',  bg: 'bg-blue-50' },
            ].map((item) => (
              <div key={item.key} className={`${item.bg} rounded-xl p-5 text-center`}>
                <p className={`text-4xl font-bold ${item.color}`}>
                  {attendanceQuery.data?.summary?.[item.key] || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">{item.label}</p>
              </div>
            ))}
            {attendanceQuery.data && (
              <div className="col-span-2 sm:col-span-4 card">
                <p className="text-lg font-semibold text-gray-900">
                  Overall Attendance Rate: <span className="text-green-600">{attendanceQuery.data.attendanceRate}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">Total records: {attendanceQuery.data.total}</p>
              </div>
            )}
          </div>
        )}

        {/* Financial Report */}
        {tab === 'financial' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="stat-icon bg-green-50"><DollarSign className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialQuery.data?.collected?.total || 0)}
                </p>
                <p className="text-sm text-gray-500">Collected ({financialQuery.data?.collected?.count || 0} payments)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-orange-50"><DollarSign className="w-6 h-6 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialQuery.data?.pending?.total || 0)}
                </p>
                <p className="text-sm text-gray-500">Pending ({financialQuery.data?.pending?.count || 0} payments)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
