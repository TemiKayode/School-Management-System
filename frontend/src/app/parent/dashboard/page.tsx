'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  GraduationCap, ClipboardList, DollarSign, Calendar,
  ChevronRight, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, BookOpen, ArrowRight, Users,
} from 'lucide-react';

// ── Health score computation ─────────────────────────────────────────────────
function computeHealthScore(attRate: number, avgGrade: number | null, pendingFees: number): number {
  const attScore   = Math.min(attRate, 100) * 0.40;
  const gradeScore = avgGrade !== null ? Math.min(avgGrade, 100) * 0.40 : 50 * 0.40;
  const feeScore   = pendingFees === 0 ? 100 : pendingFees < 5000 ? 60 : 20;
  return Math.round(attScore + gradeScore + feeScore * 0.20);
}

function healthMeta(score: number) {
  if (score >= 80) return { label: 'Excellent',    color: 'text-emerald-600', ring: '#22c55e', bg: 'bg-emerald-50',  badge: 'badge-green'  };
  if (score >= 65) return { label: 'Good',         color: 'text-blue-600',   ring: '#3b82f6', bg: 'bg-blue-50',    badge: 'badge-blue'   };
  if (score >= 50) return { label: 'Fair',         color: 'text-amber-600',  ring: '#eab308', bg: 'bg-amber-50',   badge: 'badge-yellow' };
  return              { label: 'Needs Attention', color: 'text-red-600',    ring: '#ef4444', bg: 'bg-red-50',     badge: 'badge-red'    };
}

// ── Circular health score ring (conic-gradient) ──────────────────────────────
function HealthRing({ score }: { score: number }) {
  const meta = healthMeta(score);
  const gradient = `conic-gradient(${meta.ring} 0% ${score}%, #f1f5f9 ${score}% 100%)`;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <div className="w-full h-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-1.5 rounded-full bg-white flex flex-col items-center justify-center">
        <span className={`text-sm font-extrabold leading-none tabular-nums ${meta.color}`}>{score}</span>
      </div>
    </div>
  );
}

// ── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const W = 56, H = 20, P = 2;
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2);
    const y = H - P - (max === min ? 0.5 : (v - min) / (max - min)) * (H - P * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Individual child overview card ───────────────────────────────────────────
function ChildCard({ childId, isExpanded, onToggle }: {
  childId: string; isExpanded: boolean; onToggle: () => void;
}) {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['child-overview', childId],
    queryFn: () => api.get(`/api/v1/parent/children/${childId}/overview`).then(r => r.data.data),
  });

  const { data: childData } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
    staleTime: 60_000,
  });

  const child = (childData as any[])?.find(c => c.id === childId);
  const att = overview?.attendance || {};
  const attTotal = (att.PRESENT || 0) + (att.ABSENT || 0) + (att.LATE || 0) + (att.EXCUSED || 0);
  const attRate = attTotal ? Math.round((att.PRESENT / attTotal) * 100) : 0;
  const avgGrade = overview?.avgGrade ?? null;
  const pendingFees = overview?.pendingFees?._sum?.amount || 0;
  const healthScore = attTotal > 0 ? computeHealthScore(attRate, avgGrade, pendingFees) : 0;
  const meta = healthMeta(healthScore);

  const recentScores = (overview?.recentGrades || []).map((g: any) => g.score);
  const gradeColor = avgGrade !== null ? (avgGrade >= 70 ? '#22c55e' : avgGrade >= 50 ? '#eab308' : '#ef4444') : '#6366f1';

  if (isLoading || !child) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden transition-all duration-200 hover:shadow-card-md">
      {/* ── Card header ── */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-xl font-extrabold text-white flex-shrink-0 shadow-sm">
            {child.user?.name?.[0]?.toUpperCase()}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">{child.user?.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {child.class?.name || 'No class'} · Adm #{child.admissionNo}
                </p>
                <p className="text-2xs text-gray-300 mt-0.5">
                  Form Teacher: {child.class?.teacher?.user?.name || '—'}
                </p>
              </div>
              {/* Health ring + badge */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <HealthRing score={healthScore} />
                <span className={`badge text-2xs ${meta.badge}`}>{meta.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3 KPI tiles ── */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {/* Attendance */}
          <div className={`rounded-xl p-3 ${attRate >= 85 ? 'bg-emerald-50' : attRate >= 70 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between mb-1">
              <Calendar className={`w-3.5 h-3.5 ${attRate >= 85 ? 'text-emerald-500' : attRate >= 70 ? 'text-amber-500' : 'text-red-500'}`} />
              {attRate >= 85 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
            </div>
            <p className={`text-lg font-extrabold tabular-nums leading-none ${attRate >= 85 ? 'text-emerald-700' : attRate >= 70 ? 'text-amber-700' : 'text-red-700'}`}>
              {attTotal ? `${attRate}%` : '—'}
            </p>
            <p className="text-2xs text-gray-500 mt-0.5">Attendance</p>
          </div>

          {/* Grades */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <Sparkline data={recentScores.slice(-4)} color={gradeColor} />
            </div>
            <p className="text-lg font-extrabold tabular-nums leading-none text-indigo-700">
              {avgGrade !== null ? `${Math.round(avgGrade)}%` : '—'}
            </p>
            <p className="text-2xs text-gray-500 mt-0.5">Avg Grade</p>
          </div>

          {/* Fees */}
          <div className={`rounded-xl p-3 ${pendingFees === 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
            <div className="flex items-center justify-between mb-1">
              <DollarSign className={`w-3.5 h-3.5 ${pendingFees === 0 ? 'text-green-500' : 'text-orange-500'}`} />
              {pendingFees === 0
                ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                : <AlertTriangle className="w-3 h-3 text-orange-400" />}
            </div>
            <p className={`text-xs font-extrabold leading-none tabular-nums ${pendingFees === 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {pendingFees === 0 ? 'Paid' : formatCurrency(pendingFees)}
            </p>
            <p className="text-2xs text-gray-500 mt-0.5">Fees</p>
          </div>
        </div>

        {/* Health score explanation */}
        <div className={`mt-3 px-3 py-2 rounded-xl flex items-center gap-2 ${meta.bg}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-2xs font-semibold ${meta.color}`}>Health Score</span>
              <span className={`text-xs font-bold tabular-nums ${meta.color}`}>{healthScore}/100</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${healthScore}%`, backgroundColor: meta.ring }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Expand / collapse toggle ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-gray-100 text-xs font-medium text-gray-500 hover:bg-slate-100 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? 'Hide details' : 'Show details'}
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* ── Expanded detail panel ── */}
      {isExpanded && overview && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {/* Recent grades */}
          <div className="p-5">
            <div className="section-header">
              <h4 className="text-sm font-semibold text-gray-700">Recent Grades</h4>
              <a href={`/parent/children/${childId}/grades`} className="section-action text-xs">
                All results <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            {(overview.recentGrades || []).length ? (
              <div className="space-y-2">
                {(overview.recentGrades as any[]).slice(0, 4).map((g: any) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{g.exam?.subject?.name}</p>
                      <p className="text-2xs text-gray-400 truncate">{g.exam?.title}</p>
                    </div>
                    <span className={`text-sm font-extrabold tabular-nums
                      ${g.score >= 70 ? 'text-green-600' : g.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {g.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No results yet</p>
            )}
          </div>

          {/* Upcoming assignments */}
          <div className="p-5">
            <div className="section-header">
              <h4 className="text-sm font-semibold text-gray-700">Upcoming Tasks</h4>
              <span className="badge badge-gray text-2xs">{overview.upcomingAssignments?.length || 0}</span>
            </div>
            {(overview.upcomingAssignments || []).length ? (
              <div className="space-y-2">
                {(overview.upcomingAssignments as any[]).slice(0, 3).map((a: any) => {
                  const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                      <BookOpen className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{a.title}</p>
                        <p className="text-2xs text-gray-400">{a.subject?.name}</p>
                      </div>
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full flex-shrink-0
                        ${daysLeft <= 1 ? 'bg-red-50 text-red-600' : daysLeft <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                        {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">All caught up! ✅</p>
            )}
          </div>

          {/* Attendance breakdown */}
          <div className="p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Attendance Breakdown</h4>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Present', value: att.PRESENT || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Absent',  value: att.ABSENT  || 0, color: 'text-red-700',     bg: 'bg-red-50'     },
                { label: 'Late',    value: att.LATE    || 0, color: 'text-amber-700',   bg: 'bg-amber-50'   },
                { label: 'Excused', value: att.EXCUSED || 0, color: 'text-blue-700',    bg: 'bg-blue-50'    },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                  <p className={`text-xl font-extrabold ${item.color} tabular-nums`}>{item.value}</p>
                  <p className="text-2xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/parent/children').then(r => r.data.data),
  });

  const childList = children as any[];

  if (isLoading) {
    return (
      <DashboardLayout title="Parent Portal" allowedRoles={['PARENT', 'ADMIN']}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-64 bg-gray-50" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!childList.length) {
    return (
      <DashboardLayout title="Parent Portal" allowedRoles={['PARENT', 'ADMIN']}>
        <div className="card text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="font-semibold text-gray-700">No children linked</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
            Contact the school administrator to link your account to your child's record.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Parent Portal"
      subtitle={`Monitoring ${childList.length} child${childList.length !== 1 ? 'ren' : ''}`}
      allowedRoles={['PARENT', 'ADMIN']}
    >
      <div className={`grid gap-6 ${childList.length === 1 ? 'max-w-xl' : 'grid-cols-1 xl:grid-cols-2'}`}>
        {childList.map((child: any) => (
          <ChildCard
            key={child.id}
            childId={child.id}
            isExpanded={expandedId === child.id}
            onToggle={() => setExpandedId(id => id === child.id ? null : child.id)}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
