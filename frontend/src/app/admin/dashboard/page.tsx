'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Users, GraduationCap, DollarSign, CheckCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const norm = data.map(v => max === min ? 0.5 : (v - min) / (max - min));
  const w = 80, h = 32, pad = 4;
  const pts = norm.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - v * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(' L')} L${w - pad},${h} L${pad},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${color})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.stats().then(r => r.data.data),
  });

  const totalAtt = (stats?.attendanceToday?.present || 0) + (stats?.attendanceToday?.absent || 0) +
    (stats?.attendanceToday?.late || 0) + (stats?.attendanceToday?.excused || 0);
  const attPct = totalAtt ? Math.round((stats?.attendanceToday?.present / totalAtt) * 100) : 0;

  const enrollmentData = {
    labels: MONTHS.slice(0, 6),
    datasets: [{
      label: 'Students',
      data: [210, 235, 228, 260, 248, 275],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
    }],
  };

  const attDonutData = {
    labels: ['Present', 'Absent', 'Late', 'Excused'],
    datasets: [{
      data: [
        stats?.attendanceToday?.present || 0,
        stats?.attendanceToday?.absent || 0,
        stats?.attendanceToday?.late || 0,
        stats?.attendanceToday?.excused || 0,
      ],
      backgroundColor: ['#22c55e', '#ef4444', '#eab308', '#3b82f6'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  const statCards = [
    {
      label: 'Total Students', value: stats?.totalStudents ?? 0,
      icon: GraduationCap, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50',
      trend: '+12', trendUp: true, sparkData: [210, 222, 228, 235, 248, 260, stats?.totalStudents || 275],
      sparkColor: '#6366f1', sub: 'enrolled this year',
    },
    {
      label: 'Total Teachers', value: stats?.totalTeachers ?? 0,
      icon: Users, iconColor: 'text-violet-600', iconBg: 'bg-violet-50',
      trend: '+2', trendUp: true, sparkData: [38, 38, 40, 40, 42, 44, stats?.totalTeachers || 46],
      sparkColor: '#8b5cf6', sub: 'active staff',
    },
    {
      label: 'Present Today', value: stats?.attendanceToday?.present ?? 0,
      icon: CheckCircle, iconColor: 'text-green-600', iconBg: 'bg-green-50',
      trend: `${attPct}%`, trendUp: attPct >= 80, sparkData: [88, 91, 87, 93, 89, 94, attPct],
      sparkColor: '#22c55e', sub: `${stats?.attendanceToday?.absent || 0} absent`,
    },
    {
      label: 'Pending Fees', value: formatCurrency(stats?.pendingFees?.total || 0),
      icon: DollarSign, iconColor: 'text-orange-600', iconBg: 'bg-orange-50',
      trend: `-8%`, trendUp: false, sparkData: [5200, 4800, 5100, 4600, 4900, 4400, stats?.pendingFees?.total || 4200],
      sparkColor: '#f97316', sub: `${stats?.pendingFees?.count || 0} students`,
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" allowedRoles={['ADMIN']}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 bg-gray-50" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card hover:shadow-md transition-shadow group cursor-default">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    {card.trendUp
                      ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                    <span className={`text-xs font-semibold ${card.trendUp ? 'text-green-600' : 'text-red-500'}`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
                <div className="mt-3">
                  <Sparkline data={card.sparkData} color={card.sparkColor} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Enrollment trend */}
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Enrollment Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">First 6 months of academic year</p>
              </div>
              <span className="badge badge-blue text-xs">+31% YoY</span>
            </div>
            <Line
              data={enrollmentData}
              options={{
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} students` } } },
                scales: {
                  y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
                  x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
                },
              }}
            />
          </div>

          {/* Attendance donut */}
          <div className="card flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Today&apos;s Attendance</h3>
                <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en', { dateStyle: 'long' })}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-44 h-44">
                <Doughnut
                  data={attDonutData}
                  options={{
                    cutout: '72%',
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} students` } } },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{attPct}%</span>
                  <span className="text-xs text-gray-400">present</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'Present', val: stats?.attendanceToday?.present || 0, color: 'bg-green-500' },
                { label: 'Absent', val: stats?.attendanceToday?.absent || 0, color: 'bg-red-500' },
                { label: 'Late', val: stats?.attendanceToday?.late || 0, color: 'bg-yellow-400' },
                { label: 'Excused', val: stats?.attendanceToday?.excused || 0, color: 'bg-blue-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-700 ml-auto">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Fee collection progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Fee Collection</h3>
              <a href="/admin/fees" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Tuition Fees', collected: 68000, total: 80000, color: '#6366f1' },
                { label: 'Transport Fees', collected: 12000, total: 18000, color: '#8b5cf6' },
                { label: 'Library Fees', collected: 3200, total: 4000, color: '#06b6d4' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500 text-xs">
                      {formatCurrency(item.collected)} / {formatCurrency(item.total)}
                    </span>
                  </div>
                  <ProgressBar value={item.collected} max={item.total} color={item.color} />
                  <p className="text-xs text-gray-400 mt-1">{Math.round((item.collected / item.total) * 100)}% collected</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming exams */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upcoming Exams</h3>
              <a href="/admin/exams" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {(stats?.recentExams || []).length ? (stats.recentExams || []).map((exam: any) => {
                const d = new Date(exam.examDate);
                const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
                return (
                  <div key={exam.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600">{d.getDate()}</span>
                      <span className="text-[9px] text-primary-400 uppercase">{MONTHS[d.getMonth()]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                      <p className="text-xs text-gray-400">{exam.subject?.name} · {exam.class?.name}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                      daysUntil <= 3 ? 'bg-red-50 text-red-600' :
                      daysUntil <= 7 ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                    </span>
                  </div>
                );
              }) : (
                <p className="text-sm text-gray-400 text-center py-8">No upcoming exams</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
