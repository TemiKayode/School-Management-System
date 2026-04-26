'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { assignmentsAPI, api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { BookOpen, Clock, ChevronRight, TrendingUp, TrendingDown, Minus, AlertCircle,
         CheckCircle, XCircle, CreditCard, GraduationCap, Award, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// ── Circular attendance ring via conic-gradient ─────────────────────────────
function AttendanceRing({
  present, absent, late, excused,
}: { present: number; absent: number; late: number; excused: number }) {
  const total = present + absent + late + excused;
  const pct = total ? Math.round((present / total) * 100) : 0;

  const segments = [
    { value: present,  color: '#22c55e' },
    { value: late,     color: '#eab308' },
    { value: excused,  color: '#3b82f6' },
    { value: absent,   color: '#ef4444' },
  ];

  let cursor = 0;
  const stops = segments
    .map(s => {
      const share = total ? (s.value / total) * 100 : 0;
      const from = cursor;
      cursor += share;
      return share > 0 ? `${s.color} ${from.toFixed(1)}% ${cursor.toFixed(1)}%` : null;
    })
    .filter(Boolean)
    .join(', ');

  const gradient = stops
    ? `conic-gradient(${stops})`
    : 'conic-gradient(#e5e7eb 0% 100%)';

  const ringColor = pct >= 85 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <div className="w-full h-full rounded-full" style={{ background: gradient }} />
        <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
          <span className={`text-2xl font-extrabold tabular-nums leading-none ${ringColor}`}>{pct}%</span>
          <span className="text-2xs text-gray-400 font-medium mt-0.5">attendance</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {[
          { label: 'Present',  value: present,  color: 'bg-green-500' },
          { label: 'Absent',   value: absent,   color: 'bg-red-500'   },
          { label: 'Late',     value: late,      color: 'bg-yellow-400'},
          { label: 'Excused',  value: excused,  color: 'bg-blue-500'  },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
            <span className="text-xs text-gray-500">{item.label}</span>
            <span className="text-xs font-semibold text-gray-800 ml-auto pl-2">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Per-subject sparkline ────────────────────────────────────────────────────
function SubjectSparkline({ scores }: { scores: number[] }) {
  if (!scores.length) return <span className="text-xs text-gray-300">—</span>;
  const min = Math.min(...scores), max = Math.max(...scores);
  const norm = scores.map(v => max === min ? 0.5 : (v - min) / (max - min));
  const W = 64, H = 24, P = 2;
  const pts = norm.map((v, i) => {
    const x = P + (i / Math.max(norm.length - 1, 1)) * (W - P * 2);
    const y = H - P - v * (H - P * 2);
    return `${x},${y}`;
  });
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const trending = prev === undefined ? 'flat' : last > prev ? 'up' : last < prev ? 'down' : 'flat';
  const lineColor = trending === 'up' ? '#22c55e' : trending === 'down' ? '#ef4444' : '#6366f1';

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline points={pts.join(' ')} fill="none" stroke={lineColor} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.length > 0 && (
          <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]}
            r="2.5" fill={lineColor} />
        )}
      </svg>
      {trending === 'up'   && <TrendingUp   className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
      {trending === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
      {trending === 'flat' && <Minus        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 70 ? 'bg-green-50 text-green-700 ring-green-200'
    : score >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-red-50 text-red-700 ring-red-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${cls}`}>
      {score}%
    </span>
  );
}

const SUBJECT_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-200' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-500',   border: 'border-cyan-200'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500',border: 'border-emerald-200'},
  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500',   border: 'border-pink-200'   },
];

function colorForSubject(name: string) {
  const idx = name ? name.charCodeAt(0) % SUBJECT_COLORS.length : 0;
  return SUBJECT_COLORS[idx];
}

function isNowSlot(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
}

function isPastSlot(end: string): boolean {
  const now = new Date();
  const [eh, em] = end.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= eh * 60 + em;
}

// ── Status card pill ─────────────────────────────────────────────────────────
function StatusCard({
  icon: Icon, label, value, sub, iconBg, iconColor, valueCls,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  iconBg: string; iconColor: string; valueCls?: string;
}) {
  return (
    <div className="card flex items-center gap-4 !py-4">
      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className={`text-lg font-extrabold leading-tight mt-0.5 ${valueCls ?? 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const today = new Date();
  const dayName = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][today.getDay()];

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsAPI.list().then(r => r.data.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => api.get('/attendance?mine=true').then(r => r.data.data),
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['my-grades'],
    queryFn: () => api.get('/exams/my-results').then(r => r.data.data),
  });

  const { data: timetable = [] } = useQuery({
    queryKey: ['my-timetable'],
    queryFn: () => api.get('/timetable/my').then(r => r.data.data),
  });

  const { data: fees = [] } = useQuery({
    queryKey: ['my-fees'],
    queryFn: () => api.get('/fees/my').then(r => r.data.data).catch(() => []),
  });

  // Attendance counts
  const attCounts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  (attendance as any[] || []).forEach((r: any) => { if (attCounts[r.status as keyof typeof attCounts] !== undefined) attCounts[r.status as keyof typeof attCounts]++; });
  const attTotal = attCounts.PRESENT + attCounts.ABSENT + attCounts.LATE + attCounts.EXCUSED;
  const attPct = attTotal ? Math.round((attCounts.PRESENT / attTotal) * 100) : 0;

  // Grades grouped by subject
  const gradesBySubject: Record<string, { name: string; scores: number[]; latest: number }> = {};
  (grades as any[]).forEach((g: any) => {
    const subj = g.exam?.subject?.name || 'Unknown';
    if (!gradesBySubject[subj]) gradesBySubject[subj] = { name: subj, scores: [], latest: 0 };
    gradesBySubject[subj].scores.push(g.score);
    gradesBySubject[subj].latest = g.score;
  });
  const subjectList = Object.values(gradesBySubject).slice(0, 6);

  // CGPA calculation (average of all scores / 10 mapped to 10-point scale)
  const allScores = (grades as any[]).map((g: any) => g.score);
  const avgScore = allScores.length ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : null;
  const cgpa = avgScore !== null ? ((avgScore / 100) * 10).toFixed(2) : null;

  // Assignments
  const pending = (assignments as any[]).filter((a: any) => new Date(a.dueDate) > today);
  const overdue = (assignments as any[]).filter((a: any) => new Date(a.dueDate) <= today && !a.submitted);

  // Fee status
  const feeArr = fees as any[];
  const totalFee = feeArr.reduce((s: number, f: any) => s + (f.fee?.amount ?? 0), 0);
  const paidFee  = feeArr.filter((f: any) => f.status === 'PAID').reduce((s: number, f: any) => s + (f.fee?.amount ?? f.amount ?? 0), 0);
  const feePending = feeArr.some((f: any) => f.status === 'PENDING');

  // Today's schedule
  const todaySlots = (timetable as any[])
    .filter((s: any) => s.dayOfWeek === dayName)
    .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  const greetingHour = today.getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardLayout title="My Dashboard" allowedRoles={['STUDENT']}>
      <div className="space-y-6">

        {/* ── Hero banner ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-7 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">{greeting}</p>
              <h2 className="text-2xl font-extrabold mt-0.5 tracking-tight">{user?.name}</h2>
              <p className="text-white/60 text-sm mt-1">
                {today.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {overdue.length > 0 && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-300" />
                  <div>
                    <p className="text-xs font-semibold text-white">{overdue.length} Overdue</p>
                    <p className="text-[11px] text-red-200">Need attention</p>
                  </div>
                </div>
              )}
              {cgpa && (
                <div className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3 text-center">
                  <p className="text-2xl font-extrabold tabular-nums leading-none">{cgpa}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">CGPA</p>
                </div>
              )}
              <div className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3 text-center">
                <p className="text-2xl font-extrabold tabular-nums leading-none">{pending.length}</p>
                <p className="text-[11px] text-white/70 mt-0.5">tasks due</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status cards row ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatusCard
            icon={Award}
            label="Current CGPA"
            value={cgpa ?? '—'}
            sub={allScores.length ? `${allScores.length} exam${allScores.length !== 1 ? 's' : ''} recorded` : 'No exams yet'}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            valueCls="text-violet-700"
          />
          <StatusCard
            icon={attPct >= 75 ? CheckCircle : XCircle}
            label="Attendance"
            value={attTotal ? `${attPct}%` : '—'}
            sub={attTotal ? `${attCounts.PRESENT} present / ${attTotal} days` : 'No records yet'}
            iconBg={attPct >= 75 ? 'bg-green-50' : 'bg-red-50'}
            iconColor={attPct >= 75 ? 'text-green-600' : 'text-red-500'}
            valueCls={attPct >= 75 ? 'text-green-700' : 'text-red-600'}
          />
          <StatusCard
            icon={CreditCard}
            label="Fee Status"
            value={feeArr.length === 0 ? 'No dues' : feePending ? 'Pending' : 'Paid'}
            sub={feeArr.length > 0 ? `₹${paidFee.toLocaleString()} / ₹${totalFee.toLocaleString()}` : undefined}
            iconBg={feePending ? 'bg-amber-50' : 'bg-emerald-50'}
            iconColor={feePending ? 'text-amber-600' : 'text-emerald-600'}
            valueCls={feePending ? 'text-amber-700' : 'text-emerald-700'}
          />
          <StatusCard
            icon={GraduationCap}
            label="Registration"
            value="Active"
            sub={`${todaySlots.length} class${todaySlots.length !== 1 ? 'es' : ''} today`}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            valueCls="text-blue-700"
          />
        </div>

        {/* ── Main grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT: Attendance ring + grades */}
          <div className="xl:col-span-1 space-y-6">

            <div className="card">
              <div className="section-header">
                <h3 className="section-title">Attendance</h3>
                <span className={`badge text-xs ${attPct >= 85 ? 'badge-green' : attPct >= 70 ? 'badge-yellow' : 'badge-red'}`}>
                  {attTotal ? `${attTotal} days` : 'No data'}
                </span>
              </div>
              {attTotal > 0 ? (
                <div className="flex justify-center py-2">
                  <AttendanceRing
                    present={attCounts.PRESENT} absent={attCounts.ABSENT}
                    late={attCounts.LATE} excused={attCounts.EXCUSED}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">—</span>
                    <span className="text-2xs text-gray-300">no data</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grade sparklines per subject */}
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">Grades by Subject</h3>
                <a href="/student/grades" className="section-action">
                  All <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              {subjectList.length ? (
                <div className="space-y-3">
                  {subjectList.map(subj => (
                    <div key={subj.name} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{subj.name}</p>
                        <p className="text-2xs text-gray-400">{subj.scores.length} result{subj.scores.length !== 1 ? 's' : ''}</p>
                      </div>
                      <SubjectSparkline scores={subj.scores} />
                      <ScorePill score={subj.latest} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No results recorded yet</p>
              )}
            </div>

            {/* Fee summary */}
            {feeArr.length > 0 && (
              <div className="card">
                <div className="section-header">
                  <h3 className="section-title">Fee Summary</h3>
                  <span className={`badge text-xs ${feePending ? 'badge-yellow' : 'badge-green'}`}>
                    {feePending ? 'Pending' : 'Cleared'}
                  </span>
                </div>
                <div className="space-y-2 mt-1">
                  {feeArr.slice(0, 4).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{f.fee?.title ?? 'Fee'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">₹{(f.fee?.amount ?? f.amount ?? 0).toLocaleString()}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          f.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          f.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{f.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between">
                  <span className="text-xs text-gray-400">Total Paid</span>
                  <span className="text-sm font-bold text-emerald-600">₹{paidFee.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Today's schedule + assignments */}
          <div className="xl:col-span-2 space-y-6">

            {/* ── Today's Schedule ──── */}
            <div className="card">
              <div className="section-header">
                <div>
                  <h3 className="section-title">Today's Schedule</h3>
                  <p className="text-2xs text-gray-400 mt-0.5">{today.toLocaleDateString('en', { weekday: 'long' })}</p>
                </div>
                <a href="/student/timetable" className="section-action">
                  Full timetable <ChevronRight className="w-3 h-3" />
                </a>
              </div>

              {todaySlots.length ? (
                <div className="relative">
                  <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-1">
                    {todaySlots.map((slot: any) => {
                      const isNow  = isNowSlot(slot.startTime, slot.endTime);
                      const isPast = isPastSlot(slot.endTime);
                      const color  = colorForSubject(slot.subject?.name || '');
                      return (
                        <div key={slot.id}
                          className={`relative flex items-start gap-4 pl-2 pr-3 py-2.5 rounded-2xl transition-all duration-200
                            ${isNow  ? `${color.bg} ${color.border} border` : ''}
                            ${isPast && !isNow ? 'opacity-45' : ''}
                            ${!isNow && !isPast ? 'hover:bg-slate-50' : ''}
                          `}
                        >
                          <div className="relative z-10 w-7 flex-shrink-0 flex flex-col items-center pt-0.5">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all
                              ${isNow ? `${color.dot} scale-125` : isPast ? 'bg-gray-300' : 'bg-gray-200'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${isNow ? color.text : 'text-gray-800'}`}>
                                  {slot.subject?.name}
                                  {isNow && (
                                    <span className={`ml-2 text-2xs font-bold px-1.5 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                                      NOW
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                  {slot.teacher?.user?.name || 'Unassigned'}
                                  {slot.room && ` · Room ${slot.room}`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-xs font-medium tabular-nums ${isNow ? color.text : 'text-gray-500'}`}>
                                  {slot.startTime}
                                </p>
                                <p className="text-2xs text-gray-300">{slot.endTime}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No classes today</p>
                  <p className="text-xs text-gray-400 mt-1">Enjoy your free day!</p>
                </div>
              )}
            </div>

            {/* ── Upcoming Assignments ──────────────────────── */}
            <div className="card">
              <div className="section-header">
                <h3 className="section-title">Upcoming Assignments</h3>
                <a href="/student/assignments" className="section-action">
                  View all <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              {pending.length ? (
                <div className="space-y-2">
                  {pending.slice(0, 6).map((a: any) => {
                    const due = new Date(a.dueDate);
                    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
                    const urgency = daysLeft <= 1 ? 'red' : daysLeft <= 3 ? 'amber' : 'gray';
                    const color = colorForSubject(a.subject?.name || '');
                    return (
                      <div key={a.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-slate-50 transition-all cursor-default">
                        <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-3 h-3" /> {a.subject?.name || 'General'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${urgency === 'red'   ? 'bg-red-50 text-red-600'    :
                              urgency === 'amber' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-gray-100 text-gray-500'}`}>
                            {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                          </span>
                          <p className="text-2xs text-gray-400 mt-1">{formatDate(a.dueDate)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No upcoming assignments</p>
                </div>
              )}
            </div>

            {/* ── Recent Exam Results ───────────────────────── */}
            {(grades as any[]).length > 0 && (
              <div className="card">
                <div className="section-header">
                  <h3 className="section-title">Recent Exam Results</h3>
                  <div className="flex items-center gap-2">
                    {cgpa && (
                      <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        CGPA {cgpa}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {(grades as any[]).slice(0, 5).map((g: any) => {
                    const color = colorForSubject(g.exam?.subject?.name || '');
                    return (
                      <div key={g.id} className="flex items-center gap-3 py-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{g.exam?.title ?? 'Exam'}</p>
                          <p className="text-2xs text-gray-400">{g.exam?.subject?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 tabular-nums">{g.score}/{g.exam?.totalMarks ?? 100}</span>
                          <ScorePill score={Math.round((g.score / (g.exam?.totalMarks ?? 100)) * 100)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
