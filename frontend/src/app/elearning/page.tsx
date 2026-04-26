'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { BookOpen, PlayCircle, FileText, Clock, CheckCircle, Lock, ChevronRight, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Course {
  id: string;
  title: string;
  description?: string;
  subject?: { name: string };
  teacher?: { name: string };
  thumbnail?: string;
  duration?: number;
  lessonCount?: number;
  enrolledCount?: number;
  progress?: number;
  isEnrolled?: boolean;
  rating?: number;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

const LEVEL_MAP = {
  BEGINNER: { cls: 'badge-green', label: 'Beginner' },
  INTERMEDIATE: { cls: 'badge-yellow', label: 'Intermediate' },
  ADVANCED: { cls: 'badge-red', label: 'Advanced' },
};

const SUBJECT_COLORS = ['from-blue-400 to-blue-600', 'from-violet-400 to-violet-600', 'from-green-400 to-green-600', 'from-orange-400 to-orange-600', 'from-rose-400 to-rose-600', 'from-teal-400 to-teal-600'];

function CourseCard({ course }: { course: Course }) {
  const colorIdx = (course.title.charCodeAt(0) || 0) % SUBJECT_COLORS.length;
  const gradient = SUBJECT_COLORS[colorIdx];
  const level = LEVEL_MAP[course.level || 'BEGINNER'];

  return (
    <div className="card-hover overflow-hidden p-0">
      {/* Thumbnail */}
      <div className={`w-full h-32 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
        <BookOpen className="w-10 h-10 text-white/80" />
        {course.isEnrolled && course.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div className="h-full bg-white transition-all" style={{ width: `${course.progress}%` }} />
          </div>
        )}
        {course.isEnrolled && (
          <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-xs font-medium">
            {course.progress ?? 0}%
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{course.title}</h3>
          <span className={`badge ${level.cls} flex-shrink-0`}>{level.label}</span>
        </div>

        {course.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{course.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          {course.lessonCount !== undefined && (
            <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" />{course.lessonCount} lessons</span>
          )}
          {course.duration !== undefined && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}h</span>
          )}
          {course.rating !== undefined && (
            <span className="flex items-center gap-1 ml-auto"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{course.rating.toFixed(1)}</span>
          )}
        </div>

        {course.teacher && (
          <p className="text-xs text-gray-400 mb-3">By {course.teacher.name}</p>
        )}

        <button className={`w-full text-sm font-medium py-2 rounded-xl transition-all ${course.isEnrolled ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
          {course.isEnrolled ? (
            <span className="flex items-center justify-center gap-2">
              <PlayCircle className="w-3.5 h-3.5" /> Continue
            </span>
          ) : 'Enroll Now'}
        </button>
      </div>
    </div>
  );
}

export default function ELearningPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'all' | 'enrolled' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/elearning/courses').then(r => r.data.data),
  });

  const courses: Course[] = (data || []).filter((c: Course) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    if (tab === 'enrolled') return matchesSearch && c.isEnrolled && (c.progress ?? 0) < 100;
    if (tab === 'completed') return matchesSearch && (c.progress ?? 0) >= 100;
    return matchesSearch;
  });

  const enrolledCount = (data || []).filter((c: Course) => c.isEnrolled).length;
  const completedCount = (data || []).filter((c: Course) => (c.progress ?? 0) >= 100).length;
  const avgProgress = enrolledCount
    ? Math.round((data || []).filter((c: Course) => c.isEnrolled).reduce((s: number, c: Course) => s + (c.progress ?? 0), 0) / enrolledCount)
    : 0;

  return (
    <DashboardLayout
      title="E-Learning"
      subtitle="Learn at your own pace"
      allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}
    >
      <div className="space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Courses', value: (data || []).length, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Enrolled', value: enrolledCount, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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

        {/* Search + tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          <input className="input max-w-sm" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'enrolled', 'completed'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No courses found</p>
            <p className="empty-state-desc">{tab === 'enrolled' ? "You haven't enrolled in any courses yet." : "No courses match your search."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map(course => <CourseCard key={course.id} course={course} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
