'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { classesAPI, api } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const HOURS = Array.from({ length: 10 }, (_, i) => i + 7); // 07:00–16:00

const SUBJECT_COLORS = [
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-teal-100 text-teal-800 border-teal-200',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToPx(minutes: number, startMinutes: number, pxPerHour: number): number {
  return ((minutes - startMinutes) / 60) * pxPerHour;
}

export default function TimetablePage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const PX_PER_HOUR = 80;
  const START_HOUR = 7;
  const TOTAL_HEIGHT = HOURS.length * PX_PER_HOUR;

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesAPI.list().then(r => r.data.data),
  });

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', selectedClass],
    queryFn: () => api.get(`/api/v1/timetable?classId=${selectedClass}`).then(r => r.data.data),
    enabled: !!selectedClass,
  });

  // Assign a stable color per subject
  const subjectColorMap: Record<string, string> = {};
  let colorIdx = 0;
  (timetable as any[]).forEach((slot: any) => {
    const key = slot.subject?.id || slot.subjectId;
    if (key && !subjectColorMap[key]) {
      subjectColorMap[key] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    }
  });

  const now = new Date();
  const todayDay = DAYS[now.getDay() - 1] as string;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPx = minutesToPx(nowMinutes, START_HOUR * 60, PX_PER_HOUR);

  return (
    <DashboardLayout title="Timetable">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input w-48">
              <option value="">Select class…</option>
              {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedClass && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button onClick={() => setWeekOffset(w => w - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium px-2">
                {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-xs text-primary-600 hover:underline ml-1">Today</button>
              )}
            </div>
          )}
        </div>

        {selectedClass ? (
          <div className="card !p-0 overflow-hidden">
            {/* Day headers */}
            <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
              <div className="border-r" />
              {DAYS.map((day, i) => {
                const isToday = day === todayDay && weekOffset === 0;
                return (
                  <div key={day} className={`py-3 px-3 border-r last:border-r-0 ${isToday ? 'bg-primary-50' : ''}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-primary-600' : 'text-gray-400'}`}>
                      {DAY_LABELS[i]}
                    </p>
                    {isToday && <p className="text-xs text-primary-400 mt-0.5">Today</p>}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="overflow-x-auto">
              <div className="grid min-w-[600px]" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
                {/* Time labels */}
                <div className="relative border-r" style={{ height: TOTAL_HEIGHT }}>
                  {HOURS.map(h => (
                    <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                      style={{ top: (h - START_HOUR) * PX_PER_HOUR, height: PX_PER_HOUR }}>
                      <span className="text-[10px] text-gray-400 -translate-y-1.5">{h}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map((day, di) => {
                  const slotsForDay = (timetable as any[]).filter((s: any) => s.dayOfWeek === day);
                  const isToday = day === todayDay && weekOffset === 0;
                  return (
                    <div key={day} className={`relative border-r last:border-r-0 ${isToday ? 'bg-primary-50/30' : ''}`}
                      style={{ height: TOTAL_HEIGHT }}>
                      {/* Hour lines */}
                      {HOURS.map(h => (
                        <div key={h} className="absolute w-full border-t border-gray-100"
                          style={{ top: (h - START_HOUR) * PX_PER_HOUR }} />
                      ))}

                      {/* Now indicator */}
                      {isToday && nowPx > 0 && nowPx < TOTAL_HEIGHT && (
                        <div className="absolute w-full z-20 flex items-center" style={{ top: nowPx }}>
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                          <div className="flex-1 border-t-2 border-red-400 border-dashed" />
                        </div>
                      )}

                      {/* Slots */}
                      {slotsForDay.map((slot: any) => {
                        const top = minutesToPx(timeToMinutes(slot.startTime), START_HOUR * 60, PX_PER_HOUR);
                        const height = minutesToPx(timeToMinutes(slot.endTime), timeToMinutes(slot.startTime), PX_PER_HOUR);
                        const colorClass = subjectColorMap[slot.subject?.id || slot.subjectId] || SUBJECT_COLORS[0];
                        return (
                          <div key={slot.id}
                            className={`absolute inset-x-1 rounded-lg border px-2 py-1 overflow-hidden z-10 group cursor-default transition-all hover:shadow-md hover:z-30 ${colorClass}`}
                            style={{ top: top + 2, height: Math.max(height - 4, 28) }}>
                            <p className="text-xs font-semibold truncate leading-tight">{slot.subject?.name}</p>
                            {height > 40 && (
                              <>
                                <p className="text-[10px] opacity-70 truncate">{slot.teacher?.user?.name || '—'}</p>
                                <p className="text-[10px] opacity-60">{slot.startTime}–{slot.endTime}{slot.room ? ` · ${slot.room}` : ''}</p>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {slotsForDay.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-gray-200 rotate-90 tracking-widest uppercase">free</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-gray-500 font-medium">Select a class to view its timetable</p>
          </div>
        )}

        {/* Legend */}
        {selectedClass && Object.keys(subjectColorMap).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(timetable as any[])
              .filter((slot: any, i: number, arr: any[]) => arr.findIndex((s: any) => (s.subject?.id || s.subjectId) === (slot.subject?.id || slot.subjectId)) === i)
              .map((slot: any) => {
                const key = slot.subject?.id || slot.subjectId;
                return (
                  <span key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${subjectColorMap[key]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {slot.subject?.name}
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
