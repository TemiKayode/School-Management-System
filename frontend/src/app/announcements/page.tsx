'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, Megaphone, Pin, Globe, Users, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetAudience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS';
  isPinned: boolean;
  author?: { name: string };
  createdAt: string;
}

const PRIORITY_MAP = {
  HIGH: { cls: 'badge-red', dot: 'bg-red-500' },
  MEDIUM: { cls: 'badge-yellow', dot: 'bg-yellow-500' },
  LOW: { cls: 'badge-gray', dot: 'bg-gray-400' },
};

const AUDIENCE_MAP = {
  ALL: { label: 'Everyone', cls: 'badge-indigo', icon: Globe },
  STUDENTS: { label: 'Students', cls: 'badge-green', icon: Users },
  TEACHERS: { label: 'Teachers', cls: 'badge-blue', icon: Users },
  PARENTS: { label: 'Parents', cls: 'badge-orange', icon: Users },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS'>('ALL');
  const [form, setForm] = useState({ title: '', content: '', priority: 'MEDIUM', targetAudience: 'ALL', isPinned: false });

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/announcements', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setShowAdd(false); setForm({ title: '', content: '', priority: 'MEDIUM', targetAudience: 'ALL', isPinned: false }); },
  });

  const announcements: Announcement[] = (data || []).filter((a: Announcement) =>
    filter === 'ALL' || a.targetAudience === filter || a.targetAudience === 'ALL'
  );

  const pinned = announcements.filter(a => a.isPinned);
  const regular = announcements.filter(a => !a.isPinned);
  const canCreate = role === 'ADMIN' || role === 'TEACHER';

  return (
    <DashboardLayout
      title="Announcements"
      subtitle={`${announcements.length} announcements`}
      allowedRoles={['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
      actions={
        canCreate ? (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Audience filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Pin className="w-3 h-3" /> Pinned
                </p>
                <div className="space-y-3">
                  {pinned.map(a => <AnnouncementCard key={a.id} a={a} />)}
                </div>
              </div>
            )}

            {regular.length > 0 && (
              <div>
                {pinned.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent</p>}
                <div className="space-y-3">
                  {regular.map(a => <AnnouncementCard key={a.id} a={a} />)}
                </div>
              </div>
            )}

            {announcements.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><Megaphone className="w-6 h-6 text-gray-400" /></div>
                <p className="empty-state-title">No announcements</p>
                <p className="empty-state-desc">Nothing here yet. Check back later.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Post Announcement</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input resize-none" rows={4} placeholder="Write your message…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Audience</label>
                  <select className="select" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}>
                    <option value="ALL">Everyone</option>
                    <option value="STUDENTS">Students</option>
                    <option value="TEACHERS">Teachers</option>
                    <option value="PARENTS">Parents</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
                <span className="text-sm text-gray-700">Pin this announcement</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.title || !form.content || create.isPending}
                onClick={() => create.mutate(form)}
              >
                {create.isPending ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const p = PRIORITY_MAP[a.priority];
  const aud = AUDIENCE_MAP[a.targetAudience];

  return (
    <div className={`card transition-all ${a.isPinned ? 'border-primary-200 bg-primary-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${p.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`badge ${aud.cls}`}>{aud.label}</span>
              {a.isPinned && <Pin className="w-3 h-3 text-primary-500" />}
            </div>
          </div>
          <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>{a.content}</p>
          {a.content.length > 120 && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary-600 hover:underline mt-1">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {a.author && <span>{a.author.name}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(a.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
