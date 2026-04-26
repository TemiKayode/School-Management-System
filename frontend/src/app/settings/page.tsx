'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Bell, Palette, Shield, ChevronRight, Check } from 'lucide-react';

type Section = 'profile' | 'security' | 'notifications' | 'appearance';

const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Your name, email, and personal details' },
  { id: 'security', label: 'Security', icon: Lock, desc: 'Password and two-factor authentication' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email, push, and in-app alerts' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and display preferences' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4.5' : ''}`}
        style={{ width: 18, height: 18, transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [section, setSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, assignments: true, grades: true, attendance: true, announcements: true });
  const [theme, setTheme] = useState('light');

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/auth/profile', profile),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: passwords.current, newPassword: passwords.next }),
    onSuccess: () => { setPasswords({ current: '', next: '', confirm: '' }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account preferences" allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
      <div className="flex gap-6 max-w-4xl">
        {/* Sidebar nav */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${section === s.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <s.icon className={`w-4 h-4 flex-shrink-0 ${section === s.id ? 'text-primary-600' : 'text-gray-400'}`} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {section === 'profile' && (
            <div className="card space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-500 mt-0.5">Update your personal details</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
                  {profile.name[0]?.toUpperCase()}
                </div>
                <div>
                  <button className="btn-secondary text-xs py-1.5">Change Photo</button>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+1 (555) 000-0000" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  className="btn-primary"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                >
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : saveProfile.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="card space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Security</h2>
                <p className="text-sm text-gray-500 mt-0.5">Change your password</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input className="input" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input className="input" type="password" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input className="input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
                  {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
                    <p className="field-error">Passwords do not match</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  className="btn-primary"
                  disabled={!passwords.current || !passwords.next || passwords.next !== passwords.confirm || changePassword.isPending}
                  onClick={() => changePassword.mutate()}
                >
                  {changePassword.isPending ? 'Updating…' : 'Update Password'}
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 mt-0.5">Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn-secondary text-xs">Enable 2FA</button>
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="card space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose what you&apos;re notified about</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email notifications', desc: 'Receive updates via email' },
                  { key: 'push', label: 'Push notifications', desc: 'Browser and mobile push alerts' },
                  { key: 'assignments', label: 'Assignment reminders', desc: 'Alerts for upcoming due dates' },
                  { key: 'grades', label: 'Grade updates', desc: 'When new grades are posted' },
                  { key: 'attendance', label: 'Attendance alerts', desc: 'Mark absent or late notifications' },
                  { key: 'announcements', label: 'Announcements', desc: 'School-wide and class announcements' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                      onChange={v => setNotifPrefs(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button className="btn-primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div className="card space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Appearance</h2>
                <p className="text-sm text-gray-500 mt-0.5">Customize the look of your dashboard</p>
              </div>

              <div>
                <label className="label-xs">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', bg: 'bg-white', border: 'border-gray-200' },
                    { id: 'dark', label: 'Dark', bg: 'bg-gray-900', border: 'border-gray-700' },
                    { id: 'system', label: 'System', bg: 'bg-gradient-to-br from-white to-gray-900', border: 'border-gray-300' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme === t.id ? 'border-primary-500' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className={`w-full h-12 rounded-lg ${t.bg} border ${t.border}`} />
                      <span className="text-xs font-medium text-gray-700">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 italic">Dark mode and system theme coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
